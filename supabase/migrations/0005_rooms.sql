-- NIGHTDOKU 0005 — tartós szobák: név, nyitott/zárt ajtó, törlés, követés, játék-napló és statisztika.
-- Eddig a szoba egy játékra szólt (az utolsó kilépő lezárta). Mostantól a szoba a létrehozó „saját szobája": megmarad, újra felhasználható,
-- a létrehozó törölheti; amíg a létrehozó nem nyitja meg az ajtót, más nem léphet be (de a szoba létezése látszik).
-- Új táblán RLS be van kapcsolva; írni csak a függvényeken (security definer) keresztül lehet.

-- =====================================================================
-- 1) SZOBA: név, nyitott/zárt ajtó
-- =====================================================================
alter table public.rooms
  add column name    text    not null default '' check (char_length(name) <= 30),
  add column is_open boolean not null default false;           -- amíg a tulajdonos nem nyitja meg, más nem léphet be

-- Tag-e vagyok (és beléphetek)? Zárt ajtónál csak a tulajdonos fér hozzá a szobához / chathez; a többiek a my_rooms()-on át látják, hogy létezik.
create or replace function public.is_room_member(p_room uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
      from public.room_members m
      join public.rooms r on r.id = m.room_id
     where m.room_id = p_room
       and m.user_id = (select auth.uid())
       and (r.is_open or r.host_id = m.user_id)
  );
$$;

-- =====================================================================
-- 2) JÁTÉK-NAPLÓ (statisztikához) és KÖVETÉS
-- =====================================================================
create table public.room_games (
  id         bigint generated always as identity primary key,
  room_id    uuid not null references public.rooms(id) on delete cascade,
  mode       text not null,
  puzzle_ref text not null,
  players    smallint not null,                    -- a tagok száma induláskor
  started_at timestamptz not null default now(),
  ended_at   timestamptz,
  solved     boolean,
  ms         integer
);
create index room_games_room_idx on public.room_games (room_id, started_at desc);
alter table public.room_games enable row level security;     -- nincs policy és nincs grant: csak a függvényeken át (room_stats, my_rooms)

-- Akit érdekel egy (zárt) szoba: a my_rooms()-ban akkor is látja, ha még nem léphet be.
create table public.room_follows (
  user_id    uuid not null references auth.users on delete cascade,
  room_id    uuid not null references public.rooms(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, room_id)
);
create index room_follows_room_idx on public.room_follows (room_id);
alter table public.room_follows enable row level security;
create policy "own rows" on public.room_follows for select to authenticated using ((select auth.uid()) = user_id);
grant select on public.room_follows to authenticated;

-- =====================================================================
-- 3) SZOBA-MŰVELETEK
-- =====================================================================
-- Létrehozás: a létrehozó a tulajdonos és az első tag; az ajtó ZÁRVA indul. Legfeljebb 5 saját szoba.
drop function public.create_room(text, text, smallint, jsonb);
create function public.create_room(
  p_mode text, p_puzzle_ref text, p_max_players smallint default 4, p_settings jsonb default '{}', p_name text default ''
) returns public.rooms
language plpgsql security definer set search_path = '' as $$
declare
  me  uuid := (select auth.uid());
  r   public.rooms;
  c   text;
  tries int := 0;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if (select count(*) from public.rooms where host_id = me) >= 5 then raise exception 'room limit reached'; end if;
  loop
    tries := tries + 1;
    c := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    begin
      insert into public.rooms (code, host_id, mode, puzzle_ref, max_players, settings, name)
      values (c, me, p_mode, p_puzzle_ref, p_max_players, coalesce(p_settings, '{}'), left(trim(coalesce(p_name, '')), 30))
      returning * into r;
      exit;
    exception when unique_violation then
      if tries > 10 then raise; end if;
    end;
  end loop;
  insert into public.room_members (room_id, user_id) values (r.id, me);
  return r;
end $$;

-- Az ajtó nyitása / zárása (csak a tulajdonos; játék közben nem zárható).
create function public.set_room_open(p_room uuid, p_open boolean) returns public.rooms
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  r  public.rooms;
begin
  if me is null then raise exception 'not authenticated'; end if;
  update public.rooms set is_open = coalesce(p_open, false), updated_at = now()
   where id = p_room and host_id = me and (coalesce(p_open, false) or status = 'lobby')
  returning * into r;
  if not found then raise exception 'only the owner can open or close the room (not during a game)'; end if;
  return r;
end $$;

-- Beállítás két játék között (név, pálya, létszám, szabályok) — így nem kell új szobát csinálni.
create function public.configure_room(p_room uuid, p_name text, p_puzzle_ref text, p_max_players smallint, p_settings jsonb) returns public.rooms
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  r  public.rooms;
begin
  if me is null then raise exception 'not authenticated'; end if;
  update public.rooms
     set name = left(trim(coalesce(p_name, name)), 30),
         puzzle_ref = coalesce(p_puzzle_ref, puzzle_ref),
         max_players = coalesce(p_max_players, max_players),
         settings = coalesce(p_settings, settings),
         updated_at = now()
   where id = p_room and host_id = me and status = 'lobby'
  returning * into r;
  if not found then raise exception 'only the owner can change a room in the lobby'; end if;
  return r;
end $$;

-- Törlés (csak a tulajdonos): a tagok, a chat, a meghívók és a játék-napló is törlődik (on delete cascade).
create function public.delete_room(p_room uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid());
begin
  if me is null then raise exception 'not authenticated'; end if;
  delete from public.rooms where id = p_room and host_id = me;
  if not found then raise exception 'only the owner can delete the room'; end if;
end $$;

-- Végleges kilépés a tagok közül (a tulajdonos nem léphet ki: ő törli a szobát). A szoba megmarad.
create or replace function public.leave_room(p_room uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me       uuid := (select auth.uid());
  owner_id uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  select host_id into owner_id from public.rooms where id = p_room;
  if owner_id = me then raise exception 'the owner cannot leave the room — delete it instead'; end if;
  delete from public.room_members where room_id = p_room and user_id = me;
  delete from public.room_follows where room_id = p_room and user_id = me;
end $$;

-- Belépés kóddal: csak NYITOTT ajtónál (a tulajdonos mindig beléphet); játék közben csak a már tag térhet vissza.
create or replace function public.join_room(p_code text) returns public.rooms
language plpgsql security definer set search_path = '' as $$
declare
  me     uuid := (select auth.uid());
  r      public.rooms;
  is_mem boolean;
begin
  if me is null then raise exception 'not authenticated'; end if;
  select * into r from public.rooms where code = upper(trim(p_code)) for update;
  if not found then raise exception 'room not found'; end if;
  if r.host_id <> me and not r.is_open then raise exception 'room is closed — the owner has not opened it yet'; end if;
  is_mem := exists (select 1 from public.room_members where room_id = r.id and user_id = me);
  if r.status <> 'lobby' and not is_mem then raise exception 'room already started'; end if;
  if not is_mem and (select count(*) from public.room_members where room_id = r.id) >= r.max_players then raise exception 'room is full'; end if;
  insert into public.room_members (room_id, user_id) values (r.id, me) on conflict do nothing;
  delete from public.room_follows where user_id = me and room_id = r.id;
  return r;
end $$;

-- Indítás (csak a tulajdonos, lobbyból): nyit egy sort a játék-naplóban is. A Gyilkos-mód szerepkiosztását a 0006 ezt cseréli le.
create or replace function public.start_room(p_room uuid) returns public.rooms
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  r  public.rooms;
begin
  update public.rooms set status = 'playing', started_at = now(), updated_at = now(), state = '{}', state_rev = 0
   where id = p_room and host_id = me and status = 'lobby'
  returning * into r;
  if not found then raise exception 'only the owner can start a lobby'; end if;
  insert into public.room_games (room_id, mode, puzzle_ref, players)
  values (r.id, r.mode, r.puzzle_ref, (select count(*) from public.room_members where room_id = r.id));
  return r;
end $$;

-- A játék vége (csak a tulajdonos): a napló lezárul, a szoba visszatér a lobbyba — készen a következő játékra.
create function public.finish_game(p_room uuid, p_solved boolean, p_ms integer) returns public.rooms
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  r  public.rooms;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if p_ms is not null and (p_ms < 0 or p_ms > 86400000) then raise exception 'invalid time'; end if;
  update public.rooms set status = 'lobby', started_at = null, state = '{}', state_rev = 0, updated_at = now()
   where id = p_room and host_id = me and status = 'playing'
  returning * into r;
  if not found then raise exception 'only the owner can finish a running game'; end if;
  update public.room_games set ended_at = now(), solved = p_solved, ms = p_ms
   where id = (select id from public.room_games where room_id = p_room and ended_at is null order by id desc limit 1);
  return r;
end $$;

-- Szoba követése (zárt szobánál: „értesítsen, ha megnyílik") és követés megszüntetése.
create function public.follow_room(p_code text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me  uuid := (select auth.uid());
  rid uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  select id into rid from public.rooms where code = upper(trim(p_code));
  if not found then raise exception 'room not found'; end if;
  if (select count(*) from public.room_follows where user_id = me) >= 20 then raise exception 'follow limit reached'; end if;
  insert into public.room_follows (user_id, room_id) values (me, rid) on conflict do nothing;
end $$;

create function public.unfollow_room(p_room uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.room_follows where room_id = p_room and user_id = (select auth.uid());
end $$;

-- =====================================================================
-- 4) LISTÁK ÉS STATISZTIKA
-- =====================================================================
-- Az összes szobám: saját (tulajdonos), ahová tag vagyok, és amit követek — zárt ajtónál is (a lista nem ad hozzáférést a szobához).
create function public.my_rooms()
returns table (room_id uuid, code text, name text, mode text, puzzle_ref text, status text, is_open boolean, max_players smallint,
               owner_id uuid, owner_username text, is_owner boolean, is_member boolean, member_count bigint,
               games_played bigint, games_solved bigint, last_played timestamptz, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.id, r.code, r.name, r.mode, r.puzzle_ref, r.status, r.is_open, r.max_players,
         r.host_id, p.username, r.host_id = me.id,
         exists (select 1 from public.room_members m where m.room_id = r.id and m.user_id = me.id),
         (select count(*) from public.room_members m where m.room_id = r.id),
         (select count(*) from public.room_games g where g.room_id = r.id and g.ended_at is not null),
         (select count(*) from public.room_games g where g.room_id = r.id and g.solved),
         (select max(g.ended_at) from public.room_games g where g.room_id = r.id),
         r.created_at
    from public.rooms r
    join public.profiles p on p.id = r.host_id
   cross join (select (select auth.uid()) as id) me
   where r.host_id = me.id
      or exists (select 1 from public.room_members m where m.room_id = r.id and m.user_id = me.id)
      or exists (select 1 from public.room_follows f where f.room_id = r.id and f.user_id = me.id)
   order by (r.host_id = me.id) desc, r.created_at desc;
$$;

-- Egy szoba „kukucskálása" kóddal: látszik, hogy létezik-e, nyitott-e, ki a gazdája (belépni ettől még nem lehet).
create function public.room_peek(p_code text)
returns table (room_id uuid, code text, name text, mode text, status text, is_open boolean, max_players smallint,
               owner_username text, member_count bigint, is_member boolean)
language sql stable security definer set search_path = '' as $$
  select r.id, r.code, r.name, r.mode, r.status, r.is_open, r.max_players, p.username,
         (select count(*) from public.room_members m where m.room_id = r.id),
         exists (select 1 from public.room_members m where m.room_id = r.id and m.user_id = (select auth.uid()))
    from public.rooms r
    join public.profiles p on p.id = r.host_id
   where r.code = upper(trim(p_code));
$$;

-- Egy szoba statisztikája (a tulajdonosnak és a tagoknak).
create function public.room_stats(p_room uuid)
returns table (games_played bigint, games_solved bigint, best_ms integer, avg_ms integer, total_ms bigint, first_played timestamptz, last_played timestamptz)
language sql stable security definer set search_path = '' as $$
  select count(*) filter (where g.ended_at is not null),
         count(*) filter (where g.solved),
         min(g.ms) filter (where g.solved),
         (avg(g.ms) filter (where g.solved))::integer,
         coalesce(sum(g.ms) filter (where g.ended_at is not null), 0),
         min(g.started_at),
         max(g.ended_at)
    from public.room_games g
   where g.room_id = p_room
     and (exists (select 1 from public.rooms r where r.id = p_room and r.host_id = (select auth.uid()))
          or exists (select 1 from public.room_members m where m.room_id = p_room and m.user_id = (select auth.uid())));
$$;

-- A szoba legutóbbi játékai.
create function public.room_recent_games(p_room uuid, p_n integer default 10)
returns table (started_at timestamptz, ended_at timestamptz, puzzle_ref text, players smallint, solved boolean, ms integer)
language sql stable security definer set search_path = '' as $$
  select g.started_at, g.ended_at, g.puzzle_ref, g.players, g.solved, g.ms
    from public.room_games g
   where g.room_id = p_room
     and (exists (select 1 from public.rooms r where r.id = p_room and r.host_id = (select auth.uid()))
          or exists (select 1 from public.room_members m where m.room_id = p_room and m.user_id = (select auth.uid())))
   order by g.started_at desc
   limit least(greatest(coalesce(p_n, 10), 1), 50);
$$;

-- Takarítás: a tartós szobák csak 90 nap inaktivitás után törlődnek (a chat és a napló is, on delete cascade).
create or replace function public.cleanup_old_rooms() returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  delete from public.rooms where updated_at < now() - interval '90 days';
  get diagnostics n = row_count;
  return n;
end $$;

-- =====================================================================
-- JOGOSULTSÁGOK
-- =====================================================================
revoke execute on function
  public.create_room(text, text, smallint, jsonb, text), public.set_room_open(uuid, boolean),
  public.configure_room(uuid, text, text, smallint, jsonb), public.delete_room(uuid), public.finish_game(uuid, boolean, integer),
  public.follow_room(text), public.unfollow_room(uuid), public.my_rooms(), public.room_peek(text),
  public.room_stats(uuid), public.room_recent_games(uuid, integer)
  from public, anon;
grant execute on function
  public.create_room(text, text, smallint, jsonb, text), public.set_room_open(uuid, boolean),
  public.configure_room(uuid, text, text, smallint, jsonb), public.delete_room(uuid), public.finish_game(uuid, boolean, integer),
  public.follow_room(text), public.unfollow_room(uuid), public.my_rooms(), public.room_peek(text),
  public.room_stats(uuid), public.room_recent_games(uuid, integer)
  to authenticated;
-- (a create or replace-szel újraírt függvények — join_room, leave_room, start_room, is_room_member, cleanup_old_rooms — jogosultsága változatlan)
