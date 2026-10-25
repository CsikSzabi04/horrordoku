-- NIGHTDOKU — 0001: alap séma
-- Profil, pályák, haladás, félbehagyott játékok, futás-napló, ranglista, feloldások, keep-alive.
--
-- Futtatás: Supabase irányítópult -> SQL Editor -> New query -> illeszd be -> Run.
-- FIGYELEM: kizárólag a HorrorDoku projekten (project-ref: mgmmrejyxdjjduxcwksv)!
-- Egyszer kell lefuttatni; újrafuttatva "already exists" hibát ad (nem rombol).

-- =====================================================================
-- PROFIL
-- =====================================================================
create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  username    text not null check (char_length(username) between 3 and 16),
  avatar      text not null default 'candle',        -- karakter-azonosító (portré)
  xp          integer  not null default 0,           -- a rang az XP-ből számolódik
  coins       integer  not null default 0,           -- szellemérmék
  streak      smallint not null default 0,           -- napi ügy-széria
  best_streak smallint not null default 0,
  last_daily  date,                                  -- a legutóbbi megoldott napi ügy napja
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index profiles_username_key on public.profiles (lower(username));

create table public.user_settings (
  user_id    uuid primary key references auth.users on delete cascade,
  data       jsonb not null default '{}',            -- a settings.json tükre
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- PÁLYÁK (előre megírt: klasszikus + esemény; a random pályák NEM ide kerülnek, csak seed)
-- =====================================================================
create table public.puzzles (
  id          text primary key,                      -- 'classic-01-midnight-mass'
  mode        text not null check (mode in ('classic','event','bonus','community')),
  world       text not null default 'hollowmere',    -- 'hollowmere' | 'resident-evil-2' | ...
  chapter     smallint,
  sort_order  smallint,
  title       text not null,
  difficulty  smallint not null check (difficulty between 1 and 5),
  size        smallint not null check (size between 5 and 10),
  data        jsonb not null,                        -- a teljes pálya + megoldás
  rev         smallint not null default 1,           -- javításkor nő -> az app újratölti
  published   boolean  not null default false,
  released_at timestamptz not null default now()
);

-- =====================================================================
-- HALADÁS, MENTÉS, NAPLÓ
-- =====================================================================
create table public.progress (                      -- katalógus-pályák legjobb eredménye
  user_id         uuid not null references auth.users on delete cascade,
  puzzle_id       text not null references public.puzzles(id),
  solved          boolean  not null default false,
  best_time_ms    integer,
  hints_used      smallint not null default 0,       -- a legjobb futásban
  wrong_submits   smallint not null default 0,       -- összes (= ennyi jumpscare-t kapott)
  first_solved_at timestamptz,
  updated_at      timestamptz not null default now(),
  primary key (user_id, puzzle_id)
);

create table public.saves (                         -- félbehagyott játék: ebből folytatható (random módban is)
  user_id    uuid not null references auth.users on delete cascade,
  puzzle_ref text not null,                         -- katalógus-id | 'gen:<verzió>:<nehézség>:<seed>'
  state      jsonb not null,                        -- lerakott karakterek, X-ek, jegyzetek
  meta       jsonb not null default '{}',           -- cím, nehézség, méret, világ, indulás ideje (a "Folytatás" listához)
  elapsed_ms integer  not null default 0,
  hints_used smallint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, puzzle_ref)
);

create table public.runs (                          -- minden futás naplója, csak hozzáfűzés
  id            uuid primary key,                   -- a KLIENS generálja -> az újrafeltöltés nem duplikál
  user_id       uuid not null references auth.users on delete cascade,
  puzzle_ref    text not null,
  kind          text not null check (kind in ('catalog','daily','random','together','killer')),
  room_id       uuid,                               -- co-op futásnál a szoba (nincs FK: a szoba később törlődhet)
  role          text check (role in ('detective','killer')),
  won           boolean,                            -- killer módban: nyert-e a csapata
  difficulty    smallint,
  size          smallint,
  solved        boolean  not null,
  time_ms       integer,
  hints_used    smallint not null default 0,
  wrong_submits smallint not null default 0,
  played_at     timestamptz not null default now()
);

create table public.leaderboard (
  board      text not null,                         -- 'daily:2026-10-25'
  user_id    uuid not null references auth.users on delete cascade,
  time_ms    integer  not null,
  hints_used smallint not null default 0,
  created_at timestamptz not null default now(),
  primary key (board, user_id)
);

create table public.unlocks (                       -- gyűjtemény: karakterek, napló, jumpscare-ek, skinek, jelvények
  user_id     uuid not null references auth.users on delete cascade,
  kind        text not null check (kind in ('character','journal','jumpscare','skin','badge')),
  item_id     text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, kind, item_id)
);

create index runs_user_played_idx on public.runs (user_id, played_at desc);
create index progress_puzzle_idx  on public.progress (puzzle_id);
create index leaderboard_rank_idx on public.leaderboard (board, time_ms);
create index leaderboard_user_idx on public.leaderboard (user_id);

-- Profil-statisztika: a runs-ból számolva, külön nem tárolt adat
create view public.profile_stats with (security_invoker = true) as
select user_id,
       count(distinct puzzle_ref) filter (where solved)                    as solved_total,
       count(distinct puzzle_ref) filter (where solved and hints_used = 0) as solved_no_hints,
       coalesce(sum(wrong_submits), 0)                                     as jumpscares,
       coalesce(sum(time_ms), 0)                                           as play_time_ms,
       count(*) filter (where kind in ('together','killer'))               as coop_games,
       count(*) filter (where role = 'killer' and won)                     as wins_as_killer,
       count(*) filter (where role = 'detective' and won)                  as wins_as_detective
from public.runs
group by user_id;

-- =====================================================================
-- REGISZTRÁCIÓKOR: PROFIL AUTOMATIKUSAN
-- =====================================================================
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username', ''), 'nyomozo_' || substr(new.id::text, 1, 6))
  );
  insert into public.user_settings (user_id) values (new.id);
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Szabad-e a becenév? (regisztráció előtt hívja az app)
create function public.username_available(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(p_name));
$$;

-- Keep-alive: a Vercel napi cron ezt hívja (web/api/keepalive.js), hogy a projekt aktív maradjon.
-- Valódi táblát olvas (nem csak "select now()"), mert a szüneteltetés a felhasználói adatbázis-aktivitást nézi.
create function public.ping() returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'ok', true,
    'published_puzzles', (select count(*) from public.puzzles where published),
    'at', now()
  );
$$;

-- =====================================================================
-- JOGOSULTSÁGOK: RLS + jogosultság-megadás
-- =====================================================================
alter table public.profiles      enable row level security;
alter table public.user_settings enable row level security;
alter table public.puzzles       enable row level security;
alter table public.progress      enable row level security;
alter table public.saves         enable row level security;
alter table public.runs          enable row level security;
alter table public.leaderboard   enable row level security;
alter table public.unlocks       enable row level security;

-- katalógus: mindenki olvashatja a kiadottat; írni csak az adminisztrátor tud (irányítópult / migráció)
create policy "puzzles: published" on public.puzzles for select using (published);

-- profilok és ranglista: bejelentkezettek olvashatják (nevek a ranglistán, barát-keresés)
create policy "profiles: read"    on public.profiles    for select to authenticated using (true);
create policy "leaderboard: read" on public.leaderboard for select to authenticated using (true);

-- profil: csak a sajátodat módosíthatod (létrehozni csak a trigger tud)
create policy "profiles: update own" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- minden más: csak a saját sorok
do $$
declare t text;
begin
  foreach t in array array['user_settings','progress','saves','runs','unlocks','leaderboard'] loop
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

-- jogosultságok (az RLS ezeken belül szűr tovább)
grant select on public.puzzles to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_settings, public.progress, public.saves, public.unlocks to authenticated;
grant select, insert on public.runs to authenticated;
grant select, insert, update on public.leaderboard to authenticated;
grant select on public.profile_stats to authenticated;
grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.ping() to anon, authenticated;
