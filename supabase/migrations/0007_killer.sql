-- NIGHTDOKU — 0007: a Gyilkos mód szerver-oldali játékállapota (GDD 22.3, 22.5, 23.5).
-- Titkos szerepek, a gyilkos képességei (hűtéssel, korláttal), Szimat, Gyűlés, közös beküldés (többségi jóváhagyás + ellenőrzés),
-- Epilógus, életek, idő, győzelmi feltételek — mind a SZERVEREN fut; a kliensek csak megjelenítik. A gyilkos kliense nem „küld hatást”,
-- hanem a `use_ability()`-t hívja; a hatás a `room_events` táblán át jut el mindenkihez, a hívó azonosítója NÉLKÜL.
--
-- Eltérés a GDD 23.5-től (tudatos): a hatás-eseményeket nem a `realtime.send` + privát csatorna viszi, hanem egy olyan tábla
-- (`room_events`), amit csak a szoba tagjai olvashatnak, és a Realtime `postgres_changes`-en át érkezik — ugyanúgy, mint a chat és a lobby.
-- Ennek előnye: ugyanaz a bevált út, az RLS ugyanúgy védi, tesztelhető a helyi Postgresben, és az újracsatlakozó a múltat is kiolvashatja.
-- A szerep- és játékállapot-táblákhoz kliensnek NINCS közvetlen hozzáférése (csak a saját szerepéhez): minden a függvényeken át megy.
--
-- Futtatás: Supabase SQL Editor, a 0006_friend_code.sql UTÁN. Új táblán RLS be van kapcsolva.

-- =====================================================================
-- 1) TÁBLÁK
-- =====================================================================
create table public.killer_games (
  id              bigint generated always as identity primary key,
  room_id         uuid not null references public.rooms(id) on delete cascade,
  game_id         bigint references public.room_games(id) on delete set null,   -- a statisztikai napló sora
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  cfg             jsonb not null,                       -- a ténylegesen érvényes (szabályos tartományba vágott) beállítások
  lives           integer not null,
  penalty_ms      bigint not null default 0,            -- ellopott (+) / visszaadott (−) idő
  speed           jsonb not null default '[]',          -- gyorsított szakaszok: [{"from": ms, "until": ms, "factor": 3}]
  phase           text not null default 'play' check (phase in ('play', 'epilogue', 'over')),
  meeting         jsonb,                                -- {phase: discuss|vote|result, endsAt, by, votes}
  meetings_used   integer not null default 0,
  submit          jsonb,                                -- {id, by, phase: vote|verify, endsAt, approve[], reject[], reports{}}
  epilogue        jsonb,                                -- {endsAt, votes{}}
  effect_until    timestamptz,                          -- egyszerre csak egy képesség lehet hatásban
  global_cd_until timestamptz,                          -- a képességek közös hűtése
  cd              jsonb not null default '{}',          -- képesség → utolsó használat (ms)            [TITOK]
  uses            jsonb not null default '{}',          -- képesség → használatok száma               [TITOK]
  ability_log     jsonb not null default '[]',          -- [{"ability", "at"}]                          [TITOK a végéig]
  seals           jsonb not null default '[]',          -- Eltüntetések: [{"cell", "from", "until"}] — a hatás nyilvános (a későn érkező is tudja, mely mezők zároltak)
  killer_gone     boolean not null default false,       -- a gyilkos lecsatlakozott: képességek nélkül folytatódik
  outcome         text check (outcome in ('detectives', 'killer', 'draw', 'aborted')),
  reason          text
);
create unique index killer_games_one_open on public.killer_games (room_id) where ended_at is null;
create index killer_games_room_idx on public.killer_games (room_id, id desc);
alter table public.killer_games enable row level security;     -- nincs policy és nincs grant: csak a függvényeken át
revoke all on public.killer_games from anon, authenticated;

create table public.room_roles (
  game_id        bigint not null references public.killer_games(id) on delete cascade,
  user_id        uuid   not null references auth.users on delete cascade,
  role           text   not null check (role in ('killer', 'detective')),
  exposed        boolean not null default false,        -- leleplezve (Gyűlés): a képességei kikapcsolnak
  sniffs         integer not null default 0,            -- elhasznált Szimatok
  called         integer not null default 0,            -- általa kezdeményezett Gyűlések
  silenced_until timestamptz,
  last_seen      timestamptz not null default now(),    -- a kliens szívverése (aktív játékos = az elmúlt 90 mp-ben jelzett)
  submit_cd_until timestamptz,                          -- az elutasított beküldési javaslata után rövid várakozás (játékosonként; ne lehessen a szobát elfoglalni)
  primary key (game_id, user_id)
);
create index room_roles_user_idx on public.room_roles (user_id);
alter table public.room_roles enable row level security;
create policy "own role" on public.room_roles for select to authenticated using ((select auth.uid()) = user_id);   -- csak a SAJÁT sor
revoke all on public.room_roles from anon, authenticated;
grant select on public.room_roles to authenticated;

-- A játék eseményei (hatások, Gyűlés, beküldés, vég…): a szoba tagjai olvashatják, a Realtime-on át érkeznek. A sorokban NINCS feladó.
create table public.room_events (
  id         bigint generated always as identity primary key,
  room_id    uuid   not null references public.rooms(id) on delete cascade,
  game_id    bigint,
  kind       text   not null,
  payload    jsonb  not null default '{}',
  created_at timestamptz not null default now()
);
create index room_events_room_idx on public.room_events (room_id, id);
alter table public.room_events enable row level security;
create policy "members read" on public.room_events for select to authenticated using (public.is_room_member(room_id));
revoke all on public.room_events from anon, authenticated;
grant select on public.room_events to authenticated;
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.room_events;
  end if;
end $$;

-- =====================================================================
-- 2) BELSŐ SEGÉDEK (kliens nem hívhatja)
-- =====================================================================
create function public.kg_ms(p timestamptz default now()) returns bigint
language sql stable set search_path = '' as $$ select floor(extract(epoch from p) * 1000)::bigint $$;

-- Biztonságos átalakítások: a `rooms.settings` bármit tartalmazhat — a hibás érték alapértéket jelent, nem hibát.
create function public.kg_num(p text) returns numeric
language plpgsql immutable set search_path = '' as $$
begin return p::numeric; exception when others then return null; end $$;
create function public.kg_bool(p text) returns boolean
language plpgsql immutable set search_path = '' as $$
begin return p::boolean; exception when others then return null; end $$;

-- A beállítások szabályos tartományba vágása (előbb a tartomány, csak utána az egész-átalakítás: nincs túlcsordulás).
create function public.kg_cfg(s jsonb, n integer) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'timeLimit',         case when jsonb_typeof(s->'timeLimit') = 'number' and public.kg_num(s->>'timeLimit') is not null
                              then floor(least(greatest(public.kg_num(s->>'timeLimit'), 60), 7200))::integer else null end,
    'lives',             floor(least(greatest(coalesce(public.kg_num(s->>'lives'), 3), 1), 9))::integer,
    'killerCount',       case when n >= 6 and coalesce(public.kg_num(s->>'killerCount'), 1) >= 2 then 2 else 1 end,
    'abilities',         jsonb_build_object(
                           'timeWarp', coalesce(public.kg_bool(s->'abilities'->>'timeWarp'), true),
                           'textSwap', coalesce(public.kg_bool(s->'abilities'->>'textSwap'), true),
                           'vanish',   coalesce(public.kg_bool(s->'abilities'->>'vanish'), true)),
    'cooldownScale',     least(greatest(coalesce(public.kg_num(s->>'cooldownScale'), 1), 0.25), 4),
    'showPlacers',       coalesce(public.kg_bool(s->>'showPlacers'), false),
    'telltale',          coalesce(public.kg_bool(s->>'telltale'), false),
    'meetings',          floor(least(greatest(coalesce(public.kg_num(s->>'meetings'), 2), 0), 6))::integer,
    'sniffPerDetective', floor(least(greatest(coalesce(public.kg_num(s->>'sniffPerDetective'), 1), 0), 3))::integer
  );
$$;

-- A hátralévő idő (ms) egy adott pillanatban: határidő − büntetés − eltelt idő − a gyorsított szakaszok többlete. Időkorlát nélkül NULL.
create function public.kg_remaining_ms(g public.killer_games, at_ms bigint) returns bigint
language sql stable set search_path = '' as $$
  select case when g.cfg->>'timeLimit' is null or jsonb_typeof(g.cfg->'timeLimit') <> 'number' then null
    else (g.cfg->>'timeLimit')::bigint * 1000 - g.penalty_ms - (at_ms - public.kg_ms(g.started_at))
         - coalesce((select floor(sum(((w->>'factor')::numeric - 1) * greatest(0, least((w->>'until')::bigint, at_ms) - (w->>'from')::bigint)))::bigint
                       from jsonb_array_elements(g.speed) w), 0)
  end;
$$;

create function public.kg_emit(p_room uuid, p_game bigint, p_kind text, p_payload jsonb) returns void
language sql set search_path = '' as $$
  insert into public.room_events (room_id, game_id, kind, payload) values (p_room, p_game, p_kind, coalesce(p_payload, '{}'));
$$;

-- A játék lezárása: eredmény, a szoba visszaáll lobbyba, a statisztikai napló lezárul, a végső esemény a képesség-naplóval együtt kimegy.
create function public.kg_end(p_game bigint, p_outcome text, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  g     public.killer_games;
  kills jsonb;
  el    bigint;
begin
  select * into g from public.killer_games where id = p_game for update;
  if not found or g.ended_at is not null then return; end if;
  el := least(greatest(floor(extract(epoch from now() - g.started_at) * 1000)::bigint, 0), 86400000);
  update public.killer_games
     set ended_at = now(), phase = 'over', outcome = p_outcome, reason = p_reason, meeting = null, submit = null, epilogue = null
   where id = p_game;
  select coalesce(jsonb_agg(user_id), '[]') into kills from public.room_roles where game_id = p_game and role = 'killer';
  perform public.kg_emit(g.room_id, p_game, 'end', jsonb_build_object(
    'outcome', p_outcome, 'reason', p_reason, 'killerIds', kills, 'abilityLog', g.ability_log, 'elapsedMs', el, 'lives', g.lives));
  update public.rooms set status = 'lobby', started_at = null, state = '{}', state_rev = 0, updated_at = now()
   where id = g.room_id and status = 'playing';
  update public.room_games
     set ended_at = now(), solved = case when p_outcome in ('detectives', 'draw') then true when p_outcome = 'killer' then false else null end, ms = el::integer
   where id = g.game_id and ended_at is null;
end $$;

-- Esedékes átmenetek végrehajtása (a „lusta szerver-óra”: nincs időzítő a szerveren, ezért minden hívás — és a kliensek szívverése — előrelépteti
-- a játékot): idő lejárta, Gyűlés (vita → szavazás → eredmény), beküldés (szavazás → ellenőrzés → eredmény), Epilógus, a gyilkos lecsatlakozása.
create function public.kg_advance(p_game bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare
  g        public.killer_games;
  now_ms   bigint;
  i        integer;
  rem      bigint;
  n_act    integer;
  n_det    integer;
  n_total  integer;
  n_vote   integer;
  small    boolean;
  gone     boolean;
  dl       bigint;
  t_out    bigint;
  was_exp  boolean;
  yes      integer;
  nay      integer;
  total    integer;
  votes    integer;
  top_id   text;
  top_n    integer;
  second_n integer;
  target   uuid;
  tgt_role text;
  sub      jsonb;
  mt       jsonb;
begin
  for i in 1..10 loop
    select * into g from public.killer_games where id = p_game for update;
    if not found or g.ended_at is not null then return; end if;
    now_ms := public.kg_ms();

    select count(*) into n_act from public.room_roles r where r.game_id = g.id and r.last_seen > now() - interval '90 seconds';
    select count(*) into n_det from public.room_roles r where r.game_id = g.id and r.role = 'detective' and r.last_seen > now() - interval '90 seconds';
    n_act := greatest(n_act, 1);
    n_det := greatest(n_det, 1);
    select count(*) into n_total from public.room_roles r where r.game_id = g.id;
    -- A szavazatokat, jelentéseket mindenki EGYFORMÁN számolja (különben a kimenetelből kiderülne, ki a gyilkos). Kivétel: kettő játékosnál a gyilkos
    -- kiléte eleve nyilvános, ott a nyomozó dönt.
    small := n_total <= 2;
    n_vote := case when small then n_det else n_act end;

    -- a gyilkos lecsatlakozott (90 mp-nél hosszabb szívverés-kimaradás): a játék folytatódik, képességek nélkül
    gone := g.phase = 'play' and not exists (select 1 from public.room_roles r where r.game_id = g.id and r.role = 'killer' and r.last_seen > now() - interval '90 seconds');
    if gone is distinct from g.killer_gone then   -- ha a gyilkos visszatér, a képességei is vissza
      update public.killer_games set killer_gone = gone where id = g.id;
      g.killer_gone := gone;
    end if;

    -- 1) lejárt az idő
    if g.phase = 'play' then
      rem := public.kg_remaining_ms(g, now_ms);
      if rem is not null and rem <= 0 then
        -- az idő lejárta pillanata; ha egy Gyűlés / beküldés határideje ennél korábbi volt, azt előbb le kell zárni (időrend)
        t_out := now_ms + rem;
        dl := least((g.meeting->>'endsAt')::bigint, (g.submit->>'endsAt')::bigint);
        if dl is null or dl >= t_out then
          perform public.kg_end(g.id, 'killer', 'time');
          return;
        end if;
      end if;
    end if;

    -- 2) Gyűlés
    if g.meeting is not null then
      mt := g.meeting;
      if mt->>'phase' = 'discuss' then
        if now_ms >= (mt->>'endsAt')::bigint then
          mt := jsonb_set(jsonb_set(mt, '{phase}', '"vote"'), '{endsAt}', to_jsonb((mt->>'endsAt')::bigint + 20000));
          update public.killer_games set meeting = mt where id = g.id;
          perform public.kg_emit(g.room_id, g.id, 'meeting', jsonb_build_object('phase', 'vote', 'endsAt', (mt->>'endsAt')::bigint, 'by', mt->>'by'));
          continue;
        end if;
        exit;
      elsif mt->>'phase' = 'vote' then
        select count(*) into votes from jsonb_object_keys(mt->'votes');
        if now_ms >= (mt->>'endsAt')::bigint or votes >= n_act then
          -- a legtöbb szavazatot kapott játékos, ha az az aktív játékosok szigorú többsége
          select v.value, count(*)::integer into top_id, top_n
            from jsonb_each_text(mt->'votes') v where v.value is not null and v.value <> ''
           group by v.value order by count(*) desc, v.value limit 1;
          target := null;
          if top_id is not null and top_n * 2 > greatest(n_act, votes) then target := top_id::uuid; end if;
          if target is null then
            mt := jsonb_build_object('phase', 'result', 'endsAt', now_ms + 4000, 'by', mt->>'by', 'ejected', null, 'killerExposed', false);
          else
            select r.role into tgt_role from public.room_roles r where r.game_id = g.id and r.user_id = target;
            if tgt_role = 'killer' then
              select r.exposed into was_exp from public.room_roles r where r.game_id = g.id and r.user_id = target;
              if not was_exp then   -- az idő-jutalom egyszeri: a már leleplezett gyilkos újabb kiszavazása nem ad újabb 60 mp-et
                update public.room_roles set exposed = true where game_id = g.id and user_id = target;
                update public.killer_games set penalty_ms = penalty_ms - 60000 where id = g.id;   -- +60 mp a csapatnak
                perform public.kg_emit(g.room_id, g.id, 'fx', jsonb_build_object('type', 'exposed'));
              end if;
              mt := jsonb_build_object('phase', 'result', 'endsAt', now_ms + 4000, 'by', mt->>'by', 'ejected', target, 'killerExposed', true);
            else
              update public.room_roles set silenced_until = now() + interval '45 seconds' where game_id = g.id and user_id = target;
              -- a gyilkos hűtései 20 mp-cel gyorsabban telnek: a használati időpontok 20 mp-cel korábbra kerülnek
              update public.killer_games set cd = coalesce((select jsonb_object_agg(k.key, (k.value)::bigint - 20000) from jsonb_each_text(g.cd) k), '{}') where id = g.id;
              perform public.kg_emit(g.room_id, g.id, 'fx', jsonb_build_object('type', 'silenced', 'userId', target, 'ms', 45000));
              mt := jsonb_build_object('phase', 'result', 'endsAt', now_ms + 4000, 'by', mt->>'by', 'ejected', target, 'killerExposed', false);
            end if;
          end if;
          update public.killer_games set meeting = mt where id = g.id;
          perform public.kg_emit(g.room_id, g.id, 'meeting', mt);
          continue;
        end if;
        exit;
      else   -- result: rövid ideig látszik, aztán a játék folytatódik
        if now_ms >= (mt->>'endsAt')::bigint then
          update public.killer_games set meeting = null where id = g.id;
          continue;
        end if;
        exit;
      end if;
    end if;

    -- 3) beküldés: javaslat → (a szavazók többsége jóváhagyja) → ellenőrzés (a kliensek jelentik) → eredmény
    if g.submit is not null then
      sub := g.submit;
      if sub->>'phase' = 'vote' then
        select count(*) into yes from jsonb_array_elements_text(sub->'approve') a
          where exists (select 1 from public.room_roles r where r.game_id = g.id and r.user_id = a.value::uuid and (not small or r.role = 'detective'));
        select count(*) into nay from jsonb_array_elements_text(sub->'reject') a
          where exists (select 1 from public.room_roles r where r.game_id = g.id and r.user_id = a.value::uuid and (not small or r.role = 'detective'));
        if yes * 2 > n_vote then   -- szigorú többség kell; a hallgatás nem beleegyezés (egy helytelen beküldés életbe kerül)
          sub := jsonb_set(jsonb_set(sub, '{phase}', '"verify"'), '{endsAt}', to_jsonb(now_ms + 10000));
          update public.killer_games set submit = sub where id = g.id;
          perform public.kg_emit(g.room_id, g.id, 'submit', jsonb_build_object('state', 'verify', 'id', sub->>'id', 'by', sub->>'by', 'endsAt', now_ms + 10000));
          continue;
        elsif (n_vote - nay) * 2 <= n_vote or now_ms >= (sub->>'endsAt')::bigint then
          update public.killer_games set submit = null where id = g.id;
          update public.room_roles set submit_cd_until = now() + interval '20 seconds' where game_id = g.id and user_id = (sub->>'by')::uuid;
          perform public.kg_emit(g.room_id, g.id, 'submit', jsonb_build_object('state', 'rejected', 'id', sub->>'id', 'by', sub->>'by'));
          continue;
        end if;
        exit;
      else   -- verify
        select count(*), count(*) filter (where v.value = 'true') into total, yes
          from jsonb_each_text(sub->'reports') v
         where exists (select 1 from public.room_roles r where r.game_id = g.id and r.user_id = v.key::uuid and (not small or r.role = 'detective'));
        if total >= n_vote or now_ms >= (sub->>'endsAt')::bigint then
          if total = 0 then
            -- senki sem jelentett (pl. mind lecsatlakozott): nincs döntés, életbe sem kerül
            update public.killer_games set submit = null where id = g.id;
            perform public.kg_emit(g.room_id, g.id, 'submit', jsonb_build_object('state', 'rejected', 'id', sub->>'id', 'by', sub->>'by'));
          elsif yes * 2 > total then
            update public.killer_games set submit = null where id = g.id;
            perform public.kg_emit(g.room_id, g.id, 'submit', jsonb_build_object('state', 'correct', 'id', sub->>'id', 'by', sub->>'by'));
            if small then
              perform public.kg_end(g.id, 'detectives', 'solved');   -- kettő játékosnál nincs Epilógus: a gyilkos kiléte úgyis nyilvános
              return;
            end if;
            update public.killer_games set phase = 'epilogue', epilogue = jsonb_build_object('endsAt', now_ms + 20000, 'votes', '{}'::jsonb) where id = g.id;
            perform public.kg_emit(g.room_id, g.id, 'epilogue', jsonb_build_object('endsAt', now_ms + 20000));
          else
            update public.killer_games set submit = null, lives = lives - 1 where id = g.id;
            perform public.kg_emit(g.room_id, g.id, 'submit', jsonb_build_object('state', 'wrong', 'id', sub->>'id', 'by', sub->>'by', 'livesLeft', g.lives - 1));
            if g.lives - 1 <= 0 then
              perform public.kg_end(g.id, 'killer', 'lives');
              return;
            end if;
          end if;
          continue;
        end if;
        exit;
      end if;
    end if;

    -- 4) Epilógus: ki volt a gyilkos? Mindenki szavaz (a gyilkos is, hogy a lezárás időzítése ne áruljon el szerepet); a kimenetelt a nyomozók szavazatai döntik el
    if g.phase = 'epilogue' then
      select count(*) into votes from jsonb_each_text(g.epilogue->'votes');
      if now_ms >= (g.epilogue->>'endsAt')::bigint or votes >= n_act then
        select v.value, count(*)::integer into top_id, top_n
          from jsonb_each_text(g.epilogue->'votes') v
         where v.value is not null and v.value <> ''
           and exists (select 1 from public.room_roles r where r.game_id = g.id and r.user_id = v.key::uuid and r.role = 'detective')
         group by v.value order by count(*) desc, v.value limit 1;
        second_n := 0;
        if top_id is not null then
          select count(*)::integer into second_n from jsonb_each_text(g.epilogue->'votes') v
           where v.value is not null and v.value <> '' and v.value <> top_id
             and exists (select 1 from public.room_roles r where r.game_id = g.id and r.user_id = v.key::uuid and r.role = 'detective')
           group by v.value order by count(*) desc limit 1;
        end if;
        if top_id is not null and coalesce(second_n, 0) < top_n
           and exists (select 1 from public.room_roles r where r.game_id = g.id and r.user_id = top_id::uuid and r.role = 'killer') then
          perform public.kg_end(g.id, 'detectives', 'identified');
        else
          perform public.kg_end(g.id, 'draw', 'escaped');   -- helyes megoldás, de a gyilkos megúszta
        end if;
        return;
      end if;
      exit;
    end if;

    exit;
  end loop;
end $$;

-- Az aktuális (nyitott) játék zárolva, előreléptetve. A hívónak tagnak kell lennie a játékban.
create function public.kg_load(p_room uuid) returns public.killer_games
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  g  public.killer_games;
begin
  if me is null then raise exception 'not authenticated'; end if;
  -- Zárolási sorrend mindenhol: előbb a killer_games sor, aztán a room_roles sorok (a Gyűlés-feldolgozás is így halad) — így két egyidejű szívverés sem akad össze.
  select * into g from public.killer_games where room_id = p_room and ended_at is null for update;
  if not found then raise exception 'no running game'; end if;
  if not exists (select 1 from public.room_roles r where r.game_id = g.id and r.user_id = me) then raise exception 'not a player of this game'; end if;
  update public.room_roles set last_seen = now() where game_id = g.id and user_id = me;
  perform public.kg_advance(g.id);
  select * into g from public.killer_games where id = g.id;
  return g;   -- ha az előreléptetés lezárta a játékot, a hívó ezt (g.ended_at) látja; kivételt NEM dobunk, mert az visszagörgetné a lezárást
end $$;

-- =====================================================================
-- 3) INDÍTÁS / LEZÁRÁS (a 0005 függvényeinek cseréje: a Gyilkos módnak szerepsorsolás + játékállapot jár)
-- =====================================================================
create or replace function public.start_room(p_room uuid) returns public.rooms
language plpgsql security definer set search_path = '' as $$
declare
  me   uuid := (select auth.uid());
  r    public.rooms;
  n    integer;
  cfg  jsonb;
  gid  bigint;
  kgid bigint;
  kc   integer;
  killers uuid[];
begin
  select * into r from public.rooms where id = p_room;
  if not found or r.host_id is distinct from me or r.status <> 'lobby' then raise exception 'only the owner can start a lobby'; end if;
  select count(*) into n from public.room_members where room_id = p_room;
  if r.mode = 'killer' and n < 2 then raise exception 'at least 2 players are needed'; end if;

  -- indításkor az ajtó kinyílik: zárt ajtónál a nem tulajdonos tagok nem olvashatnák a szoba eseményeit / chatjét (is_room_member), a játék megsüketülne
  update public.rooms set status = 'playing', started_at = now(), updated_at = now(), state = '{}', state_rev = 0, is_open = true
   where id = p_room returning * into r;
  insert into public.room_games (room_id, mode, puzzle_ref, players) values (r.id, r.mode, r.puzzle_ref, n) returning id into gid;

  if r.mode = 'killer' then
    cfg := public.kg_cfg(r.settings, n);
    kc := least((cfg->>'killerCount')::integer, n - 1);
    delete from public.killer_games where room_id = p_room and ended_at is not null and id not in
      (select id from public.killer_games where room_id = p_room and ended_at is not null order by id desc limit 1);   -- csak az utolsó lezárt játék marad
    delete from public.room_events where room_id = p_room;
    insert into public.killer_games (room_id, game_id, cfg, lives) values (p_room, gid, cfg, (cfg->>'lives')::integer) returning id into kgid;
    -- a szerepeket a SZERVER sorsolja; a lobbyban senki sem tudja, ki lesz a gyilkos
    select array_agg(s.user_id) into killers from (select user_id from public.room_members where room_id = p_room order by random() limit kc) s;
    insert into public.room_roles (game_id, user_id, role)
    select kgid, m.user_id, case when m.user_id = any (killers) then 'killer' else 'detective' end
      from public.room_members m where m.room_id = p_room;
    perform public.kg_emit(p_room, kgid, 'start', jsonb_build_object('startedAt', public.kg_ms(), 'players', n));
  end if;
  return r;
end $$;

create or replace function public.finish_game(p_room uuid, p_solved boolean, p_ms integer) returns public.rooms
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  r  public.rooms;
  kg bigint;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if p_ms is not null and (p_ms < 0 or p_ms > 86400000) then raise exception 'invalid time'; end if;
  select id into kg from public.killer_games where room_id = p_room and ended_at is null;
  if kg is not null then
    -- Gyilkos-játékot a tulajdonos megszakíthat (a játék kimenetele így döntetlen / nem számít)
    if not exists (select 1 from public.rooms where id = p_room and host_id = me) then raise exception 'only the owner can finish a running game'; end if;
    perform public.kg_end(kg, 'aborted', 'host');
    select * into r from public.rooms where id = p_room;
    return r;
  end if;
  update public.rooms set status = 'lobby', started_at = null, state = '{}', state_rev = 0, updated_at = now()
   where id = p_room and host_id = me and status = 'playing'
  returning * into r;
  if not found then raise exception 'only the owner can finish a running game'; end if;
  update public.room_games set ended_at = now(), solved = p_solved, ms = p_ms
   where id = (select id from public.room_games where room_id = p_room and ended_at is null order by id desc limit 1);
  return r;
end $$;

-- =====================================================================
-- 4) A KLIENS FÜGGVÉNYEI
-- =====================================================================
-- Az állapot-pillanatkép: mindenkinek a nyilvános rész, a hívónak a SAJÁT titkos része (szerep, hűtések, Szimat-keret). Nem módosít semmit.
create function public.killer_state(p_room uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  me     uuid := (select auth.uid());
  g      public.killer_games;
  me_r   public.room_roles;
  now_ms bigint := public.kg_ms();
  n      integer;
  base   jsonb;
  mt     jsonb;
  sb     jsonb;
  cdr    jsonb := '{}';
begin
  if me is null then raise exception 'not authenticated'; end if;
  select * into g from public.killer_games where room_id = p_room and ended_at is null;
  if not found then return jsonb_build_object('running', false, 'now', now_ms); end if;
  select * into me_r from public.room_roles where game_id = g.id and user_id = me;
  if not found then raise exception 'not a player of this game'; end if;
  select count(*) into n from public.room_roles where game_id = g.id;

  mt := g.meeting;
  if mt is not null then
    mt := (mt - 'votes') || jsonb_build_object('voted', mt->'votes' ? me::text);
  end if;
  sb := g.submit;
  if sb is not null then
    sb := jsonb_build_object('id', sb->>'id', 'by', sb->>'by', 'phase', sb->>'phase', 'endsAt', (sb->>'endsAt')::bigint,
                             'voted', (sb->'approve' ? me::text) or (sb->'reject' ? me::text) or (sb->'reports' ? me::text));
  end if;
  if me_r.role = 'killer' then
    cdr := jsonb_build_object(
      'timeWarp', greatest(0, coalesce((g.cd->>'timeWarp')::bigint, 0) + floor(90000 * (g.cfg->>'cooldownScale')::numeric)::bigint - now_ms),
      'textSwap', greatest(0, coalesce((g.cd->>'textSwap')::bigint, 0) + floor(45000 * (g.cfg->>'cooldownScale')::numeric)::bigint - now_ms),
      'vanish',   greatest(0, coalesce((g.cd->>'vanish')::bigint, 0) + floor(60000 * (g.cfg->>'cooldownScale')::numeric)::bigint - now_ms));
  end if;
  base := jsonb_build_object(
    'running', true, 'now', now_ms, 'gameId', g.id, 'startedAt', public.kg_ms(g.started_at), 'phase', g.phase,
    'lives', g.lives, 'maxLives', (g.cfg->>'lives')::integer,
    'timeLimitMs', case when g.cfg->>'timeLimit' is not null and jsonb_typeof(g.cfg->'timeLimit') = 'number' then (g.cfg->>'timeLimit')::bigint * 1000 else null end,
    'penaltyMs', g.penalty_ms, 'speed', g.speed, 'seals', g.seals,
    'meeting', mt, 'meetingsLeft', greatest((g.cfg->>'meetings')::integer - g.meetings_used, 0),
    'submit', sb,
    'epilogue', case when g.epilogue is null then null else jsonb_build_object('endsAt', (g.epilogue->>'endsAt')::bigint, 'voted', g.epilogue->'votes' ? me::text) end,
    'players', n, 'showPlacers', (g.cfg->>'showPlacers')::boolean, 'telltale', (g.cfg->>'telltale')::boolean,
    -- leleplezett gyilkosok (a Gyűlés eredménye nyilvános); kettő játékosnál a gyilkos kiléte eleve nyilvános
    'exposedKillers', coalesce((select jsonb_agg(user_id) from public.room_roles where game_id = g.id and role = 'killer' and (exposed or n <= 2)), '[]'),
    'role', me_r.role,
    'exposed', me_r.exposed,
    'sniffsLeft', case when me_r.role = 'detective' then greatest((g.cfg->>'sniffPerDetective')::integer - me_r.sniffs, 0) else 0 end,
    'canCallMeeting', me_r.role = 'detective' and n >= 3 and me_r.called < 1 and g.meetings_used < (g.cfg->>'meetings')::integer,
    'silencedMs', greatest(0, floor(extract(epoch from coalesce(me_r.silenced_until, now()) - now()) * 1000)::bigint)
  );
  if me_r.role = 'killer' then
    base := base || jsonb_build_object('cooldowns', cdr, 'abilities', g.cfg->'abilities', 'killerGone', g.killer_gone,
      'busyMs', greatest(0, floor(extract(epoch from greatest(coalesce(g.effect_until, now()), coalesce(g.global_cd_until, now())) - now()) * 1000)::bigint));
  end if;
  return base;
end $$;

-- Szívverés + előreléptetés (a kliensek ~10 mp-enként és minden határidőnél hívják). Visszaadja az új állapotot.
create function public.killer_beat(p_room uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.killer_games where room_id = p_room and ended_at is null) then
    return jsonb_build_object('running', false, 'now', public.kg_ms());
  end if;
  perform public.kg_load(p_room);
  return public.killer_state(p_room);   -- ha a játék közben véget ért: {"running": false}; az eredményt az `end` esemény / a killer_result adja
end $$;

-- A gyilkos képességei. A hatás-esemény feladó nélkül kerül a `room_events`-be.
--   timeWarp: payload {"mode": "steal" | "speed"}   (időkorlátos játékban)
--   textSwap: payload {"char": "<karakter-id>", "text": "<hamis nyomszöveg>"}
--   vanish:   payload {"cell": "E3"}
create function public.use_ability(p_room uuid, p_ability text, p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me     uuid := (select auth.uid());
  g      public.killer_games;
  rl     public.room_roles;
  now_ms bigint := public.kg_ms();
  scale  numeric;
  base   bigint;
  last   bigint;
  dur    bigint := 0;
  fx     jsonb;
  mode   text;
  cdr    jsonb;
begin
  g := public.kg_load(p_room);
  if g.ended_at is not null then return jsonb_build_object('ok', false, 'ended', true); end if;   -- az előreléptetés lezárta a játékot
  select * into rl from public.room_roles where game_id = g.id and user_id = me;
  if rl.role <> 'killer' then raise exception 'only the killer can use abilities'; end if;
  if rl.exposed or g.killer_gone then raise exception 'abilities are disabled'; end if;
  if g.phase <> 'play' or g.meeting is not null then raise exception 'not now'; end if;
  if p_ability not in ('timeWarp', 'textSwap', 'vanish') then raise exception 'unknown ability'; end if;
  if not coalesce((g.cfg->'abilities'->>p_ability)::boolean, false) then raise exception 'ability is disabled in this room'; end if;
  if g.global_cd_until is not null and g.global_cd_until > now() then raise exception 'cooldown'; end if;
  if g.effect_until is not null and g.effect_until > now() then raise exception 'another effect is active'; end if;

  scale := (g.cfg->>'cooldownScale')::numeric;
  base := case p_ability when 'timeWarp' then 90000 when 'textSwap' then 45000 else 60000 end;
  last := (g.cd->>p_ability)::bigint;
  if last is not null and last + floor(base * scale)::bigint > now_ms then raise exception 'cooldown'; end if;

  if p_ability = 'timeWarp' then
    if g.cfg->>'timeLimit' is null or jsonb_typeof(g.cfg->'timeLimit') <> 'number' then raise exception 'no time limit in this game'; end if;
    if coalesce((g.uses->>'timeWarp')::integer, 0) >= 3 then raise exception 'ability limit reached'; end if;
    mode := coalesce(p_payload->>'mode', 'steal');
    if mode = 'speed' then
      dur := 10000;
      update public.killer_games set speed = speed || jsonb_build_array(jsonb_build_object('from', now_ms, 'until', now_ms + dur, 'factor', 3)) where id = g.id;
      fx := jsonb_build_object('type', 'time_speed', 'factor', 3, 'ms', dur, 'serverTime', now_ms);
    elsif mode = 'steal' then
      update public.killer_games set penalty_ms = penalty_ms + 20000 where id = g.id;
      fx := jsonb_build_object('type', 'time_penalty', 'seconds', 20, 'serverTime', now_ms);
    else
      raise exception 'invalid mode';
    end if;
  elsif p_ability = 'textSwap' then
    if coalesce(p_payload->>'char', '') !~ '^[A-Za-z0-9_.-]{1,64}$' then raise exception 'invalid target'; end if;
    if char_length(coalesce(p_payload->>'text', '')) not between 3 and 400 then raise exception 'invalid text'; end if;
    dur := 5000;
    fx := jsonb_build_object('type', 'clue_override', 'char', p_payload->>'char', 'text', p_payload->>'text', 'ms', dur, 'telltale', (g.cfg->>'telltale')::boolean);
  else
    if coalesce(p_payload->>'cell', '') !~ '^[A-Z][0-9]{1,2}$' then raise exception 'invalid target'; end if;
    dur := 8000;
    fx := jsonb_build_object('type', 'object_vanish', 'cell', p_payload->>'cell', 'ms', dur, 'serverTime', now_ms);
    update public.killer_games set seals = seals || jsonb_build_array(jsonb_build_object('cell', p_payload->>'cell', 'from', now_ms, 'until', now_ms + dur)) where id = g.id;
  end if;

  update public.killer_games
     set cd = jsonb_set(cd, array[p_ability], to_jsonb(now_ms)),
         uses = jsonb_set(uses, array[p_ability], to_jsonb(coalesce((uses->>p_ability)::integer, 0) + 1)),
         ability_log = ability_log || jsonb_build_array(jsonb_build_object('ability', p_ability, 'at', now_ms)),
         effect_until = now() + (dur || ' milliseconds')::interval,
         global_cd_until = now() + ((dur + 10000) || ' milliseconds')::interval      -- a képességek között 10 mp közös hűtés
   where id = g.id;
  perform public.kg_emit(g.room_id, g.id, 'fx', fx);
  cdr := public.killer_state(p_room)->'cooldowns';
  return jsonb_build_object('ok', true, 'cooldowns', cdr);
end $$;

-- Szimat (nyomozó, a keret a beállításokban): „Használt valaki képességet az elmúlt 30 mp-ben?” — igen / nem az egész szobának.
create function public.sniff(p_room uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me     uuid := (select auth.uid());
  g      public.killer_games;
  rl     public.room_roles;
  now_ms bigint := public.kg_ms();
  used   boolean;
begin
  g := public.kg_load(p_room);
  if g.ended_at is not null then return jsonb_build_object('used', false, 'ended', true); end if;   -- az előreléptetés lezárta a játékot
  select * into rl from public.room_roles where game_id = g.id and user_id = me;
  if rl.role <> 'detective' then raise exception 'only a detective can sniff'; end if;
  if g.phase <> 'play' then raise exception 'not now'; end if;
  if rl.sniffs >= (g.cfg->>'sniffPerDetective')::integer then raise exception 'no sniffs left'; end if;
  used := exists (select 1 from jsonb_array_elements(g.ability_log) e where (e->>'at')::bigint >= now_ms - 30000);
  update public.room_roles set sniffs = sniffs + 1 where game_id = g.id and user_id = me;
  perform public.kg_emit(g.room_id, g.id, 'sniff', jsonb_build_object('used', used));
  return jsonb_build_object('used', used);
end $$;

-- Gyűlés (nyomozó; nyomozónként 1, összesen a beállított keret; legalább 3 játékos): 30 mp vita, majd 20 mp szavazás.
create function public.call_meeting(p_room uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me     uuid := (select auth.uid());
  g      public.killer_games;
  rl     public.room_roles;
  now_ms bigint := public.kg_ms();
  n      integer;
begin
  g := public.kg_load(p_room);
  if g.ended_at is not null then return; end if;   -- az előreléptetés lezárta a játékot
  select * into rl from public.room_roles where game_id = g.id and user_id = me;
  select count(*) into n from public.room_roles where game_id = g.id;
  if rl.role <> 'detective' then raise exception 'only a detective can call a meeting'; end if;
  if n < 3 then raise exception 'meetings need at least 3 players'; end if;
  if g.phase <> 'play' or g.meeting is not null then raise exception 'not now'; end if;
  if g.submit is not null then
    if g.submit->>'phase' <> 'vote' then raise exception 'not now'; end if;   -- az ellenőrzés pár másodperc, azt megvárjuk
    update public.killer_games set submit = null where id = g.id;              -- a szavazás alatti javaslatot a Gyűlés félreteszi
    perform public.kg_emit(g.room_id, g.id, 'submit', jsonb_build_object('state', 'rejected', 'id', g.submit->>'id', 'by', g.submit->>'by'));
  end if;
  if rl.called >= 1 or g.meetings_used >= (g.cfg->>'meetings')::integer then raise exception 'no meetings left'; end if;
  update public.room_roles set called = called + 1 where game_id = g.id and user_id = me;
  update public.killer_games
     set meetings_used = meetings_used + 1,
         meeting = jsonb_build_object('phase', 'discuss', 'endsAt', now_ms + 30000, 'by', me, 'votes', '{}'::jsonb)
   where id = g.id;
  perform public.kg_emit(g.room_id, g.id, 'meeting', jsonb_build_object('phase', 'discuss', 'endsAt', now_ms + 30000, 'by', me));
end $$;

-- Szavazat a Gyűlésen (p_target = NULL: tartózkodás). Mindenki szavazhat, a gyilkos is; magára senki.
create function public.vote_meeting(p_room uuid, p_target uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  g  public.killer_games;
begin
  g := public.kg_load(p_room);
  if g.ended_at is not null then return; end if;   -- az előreléptetés lezárta a játékot
  if g.meeting is null or g.meeting->>'phase' <> 'vote' then raise exception 'no vote is open'; end if;
  if p_target is not null and (p_target = me or not exists (select 1 from public.room_roles r where r.game_id = g.id and r.user_id = p_target)) then
    raise exception 'invalid target';
  end if;
  update public.killer_games
     set meeting = jsonb_set(meeting, array['votes', me::text], coalesce(to_jsonb(p_target::text), 'null'::jsonb))
   where id = g.id;
  perform public.kg_advance(g.id);   -- ha mindenki szavazott, azonnal eredmény
end $$;

-- Közös beküldés, 1. lépés: javaslat (bárki, legfeljebb egy függő; az elutasított javaslat után a javaslattevő 20 mp-ig nem javasolhat újat). A jóváhagyáshoz
-- az aktív játékosok szigorú többsége kell, MINDENKI szavazata egyformán számít (különben a kimenetelből kiderülne, ki a gyilkos); kivétel a kettős játék.
create function public.propose_submit(p_room uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  me     uuid := (select auth.uid());
  g      public.killer_games;
  rl     public.room_roles;
  now_ms bigint := public.kg_ms();
  sid    text := gen_random_uuid()::text;
begin
  g := public.kg_load(p_room);
  if g.ended_at is not null then return ''; end if;   -- az előreléptetés lezárta a játékot
  select * into rl from public.room_roles where game_id = g.id and user_id = me;
  if g.phase <> 'play' or g.meeting is not null or g.submit is not null then raise exception 'not now'; end if;
  if rl.submit_cd_until is not null and rl.submit_cd_until > now() then raise exception 'cooldown'; end if;   -- az elutasított javaslat után 20 mp (csak a javaslattevőnek)
  update public.killer_games
     set submit = jsonb_build_object('id', sid, 'by', me, 'phase', 'vote', 'endsAt', now_ms + 15000,
                                      'approve', jsonb_build_array(me),   -- a javaslattevő szerepétől függetlenül jóváhagyja a sajátját (különben kiderülne, ki a gyilkos)
                                      'reject', '[]'::jsonb, 'reports', '{}'::jsonb)
   where id = g.id;
  perform public.kg_emit(g.room_id, g.id, 'submit', jsonb_build_object('state', 'proposal', 'id', sid, 'by', me, 'endsAt', now_ms + 15000));
  perform public.kg_advance(g.id);
  return sid;
end $$;

create function public.vote_submit(p_room uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  g  public.killer_games;
  sb jsonb;
begin
  g := public.kg_load(p_room);
  if g.ended_at is not null then return; end if;   -- az előreléptetés lezárta a játékot
  sb := g.submit;
  if sb is null or sb->>'phase' <> 'vote' then raise exception 'no submission to vote on'; end if;
  -- a szavazat bárkitől egyformán számít (kettős játékban csak a nyomozóé: ott a gyilkos kiléte eleve nyilvános)
  sb := jsonb_set(sb, '{approve}', coalesce((select jsonb_agg(x) from jsonb_array_elements_text(sb->'approve') x where x <> me::text), '[]'::jsonb));
  sb := jsonb_set(sb, '{reject}',  coalesce((select jsonb_agg(x) from jsonb_array_elements_text(sb->'reject')  x where x <> me::text), '[]'::jsonb));
  if p_approve then sb := jsonb_set(sb, '{approve}', (sb->'approve') || to_jsonb(me::text));
  else sb := jsonb_set(sb, '{reject}', (sb->'reject') || to_jsonb(me::text)); end if;
  update public.killer_games set submit = sb where id = g.id;
  perform public.kg_advance(g.id);
end $$;

-- 2. lépés: minden kliens kiszámolja, helyes-e a (közös) tábla, és jelenti; a jelentések többsége dönt (a gyilkos hamis jelentése kisebbségben marad;
-- kettős játékban a nyomozóé a szó).
create function public.report_submit(p_room uuid, p_correct boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  g  public.killer_games;
begin
  g := public.kg_load(p_room);
  if g.ended_at is not null then return; end if;   -- az előreléptetés lezárta a játékot
  if g.submit is null or g.submit->>'phase' <> 'verify' then return; end if;
  update public.killer_games set submit = jsonb_set(submit, array['reports', me::text], to_jsonb(p_correct)) where id = g.id;
  perform public.kg_advance(g.id);
end $$;

-- Epilógus-szavazat: ki volt a gyilkos? Mindenki szavaz (a lezárás időzítése így nem árul el szerepet), a kimenetelt a nyomozók szavazatai döntik el.
create function public.epilogue_vote(p_room uuid, p_target uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  g  public.killer_games;
begin
  g := public.kg_load(p_room);
  if g.ended_at is not null then return; end if;   -- az előreléptetés lezárta a játékot
  if g.phase <> 'epilogue' then raise exception 'no epilogue is running'; end if;
  if p_target is null or p_target = me or not exists (select 1 from public.room_roles r where r.game_id = g.id and r.user_id = p_target) then
    raise exception 'invalid target';
  end if;
  update public.killer_games set epilogue = jsonb_set(epilogue, array['votes', me::text], to_jsonb(p_target::text)) where id = g.id;
  perform public.kg_advance(g.id);
end $$;

-- A legutóbbi lezárt játék eredménye (csak a játékosainak): a gyilkos(ok), a szerepek, a képesség-napló. A játék végéig ez mind titok.
create function public.killer_result(p_room uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  g  public.killer_games;
begin
  if me is null then raise exception 'not authenticated'; end if;
  select * into g from public.killer_games where room_id = p_room and ended_at is not null order by id desc limit 1;
  if not found then return null; end if;
  if not exists (select 1 from public.room_roles r where r.game_id = g.id and r.user_id = me) then return null; end if;
  return jsonb_build_object(
    'gameId', g.id, 'outcome', g.outcome, 'reason', g.reason, 'lives', g.lives,
    'elapsedMs', least(greatest(floor(extract(epoch from g.ended_at - g.started_at) * 1000)::bigint, 0), 86400000),
    'killerIds', coalesce((select jsonb_agg(user_id) from public.room_roles where game_id = g.id and role = 'killer'), '[]'),
    'roles', coalesce((select jsonb_object_agg(user_id::text, role) from public.room_roles where game_id = g.id), '{}'),
    'killerGone', g.killer_gone,
    'abilityLog', g.ability_log);
end $$;

-- =====================================================================
-- 5) JOGOSULTSÁGOK — a belső segédeket kliens nem hívhatja, a többit csak bejelentkezett felhasználó
-- =====================================================================
revoke execute on function
  public.kg_ms(timestamptz), public.kg_num(text), public.kg_bool(text), public.kg_cfg(jsonb, integer), public.kg_remaining_ms(public.killer_games, bigint),
  public.kg_emit(uuid, bigint, text, jsonb), public.kg_end(bigint, text, text), public.kg_advance(bigint), public.kg_load(uuid)
  from public, anon, authenticated;
revoke execute on function
  public.killer_state(uuid), public.killer_beat(uuid), public.use_ability(uuid, text, jsonb), public.sniff(uuid), public.call_meeting(uuid),
  public.vote_meeting(uuid, uuid), public.propose_submit(uuid), public.vote_submit(uuid, boolean), public.report_submit(uuid, boolean),
  public.epilogue_vote(uuid, uuid), public.killer_result(uuid)
  from public, anon;
grant execute on function
  public.killer_state(uuid), public.killer_beat(uuid), public.use_ability(uuid, text, jsonb), public.sniff(uuid), public.call_meeting(uuid),
  public.vote_meeting(uuid, uuid), public.propose_submit(uuid), public.vote_submit(uuid, boolean), public.report_submit(uuid, boolean),
  public.epilogue_vote(uuid, uuid), public.killer_result(uuid)
  to authenticated;
