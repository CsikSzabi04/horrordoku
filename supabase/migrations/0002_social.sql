-- NIGHTDOKU — 0002: barátok, co-op szobák, szobán belüli chat, meghívók
-- Előfeltétel: 0001_init.sql.
--
-- Futtatás: Supabase irányítópult -> SQL Editor -> New query -> illeszd be -> Run.
-- FIGYELEM: kizárólag a HorrorDoku projekten (project-ref: mgmmrejyxdjjduxcwksv)!
--
-- Nem tartalmazza (0003, a gyilkos-mód megvalósításakor jön): a titkos szerepek (room_roles),
-- a képesség-függvények és a privát Realtime-csatornák jogosultsága (realtime.messages).

-- =====================================================================
-- BARÁTOK
-- =====================================================================
create table public.friendships (
  user_a       uuid not null references auth.users on delete cascade,   -- mindig a kisebb uuid
  user_b       uuid not null references auth.users on delete cascade,   -- mindig a nagyobb uuid
  requested_by uuid not null references auth.users on delete cascade,
  status       text not null default 'pending' check (status in ('pending','accepted')),
  created_at   timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b),
  check (requested_by in (user_a, user_b))
);
create index friendships_user_b_idx on public.friendships (user_b);
create index friendships_requested_by_idx on public.friendships (requested_by);

-- Barátkérés küldése; ha a másik fél már küldött nekünk, a kérés automatikusan elfogadódik.
create function public.send_friend_request(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid());
begin
  if me is null then raise exception 'not authenticated'; end if;
  if p_user is null or p_user = me then raise exception 'invalid user'; end if;
  if not exists (select 1 from public.profiles where id = p_user) then raise exception 'unknown user'; end if;

  insert into public.friendships (user_a, user_b, requested_by)
  values (least(me, p_user), greatest(me, p_user), me)
  on conflict (user_a, user_b) do update set status = 'accepted'
    where public.friendships.status = 'pending' and public.friendships.requested_by <> me;
end $$;

-- Kérés elfogadása / elutasítása (csak a címzett teheti).
create function public.respond_friend_request(p_user uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid());
begin
  if me is null then raise exception 'not authenticated'; end if;
  if p_accept then
    update public.friendships set status = 'accepted'
     where user_a = least(me, p_user) and user_b = greatest(me, p_user)
       and status = 'pending' and requested_by = p_user;
  else
    delete from public.friendships
     where user_a = least(me, p_user) and user_b = greatest(me, p_user)
       and status = 'pending' and requested_by = p_user;
  end if;
end $$;

-- Barát törlése / saját kérés visszavonása.
create function public.remove_friend(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid());
begin
  if me is null then raise exception 'not authenticated'; end if;
  delete from public.friendships
   where user_a = least(me, p_user) and user_b = greatest(me, p_user);
end $$;

-- A saját barátlistám (név + avatár hozzáillesztve).
create view public.my_friends with (security_invoker = true) as
select case when f.user_a = (select auth.uid()) then f.user_b else f.user_a end as friend_id,
       p.username, p.avatar, p.xp,
       f.status, f.requested_by, f.created_at
from public.friendships f
join public.profiles p
  on p.id = case when f.user_a = (select auth.uid()) then f.user_b else f.user_a end
where (select auth.uid()) in (f.user_a, f.user_b);

-- =====================================================================
-- CO-OP SZOBÁK
-- =====================================================================
create table public.rooms (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,                    -- 6 karakteres belépőkód
  host_id     uuid not null references auth.users on delete cascade,
  mode        text not null check (mode in ('together','killer')),
  puzzle_ref  text not null,                           -- katalógus-id | 'gen:<verzió>:<nehézség>:<seed>'
  status      text not null default 'lobby' check (status in ('lobby','playing','finished','closed')),
  max_players smallint not null default 4 check (max_players between 2 and 8),
  settings    jsonb not null default '{}',             -- időkorlát, életek, szabályok
  state       jsonb not null default '{}',             -- a közös tábla pillanatképe (újracsatlakozáshoz)
  state_rev   integer not null default 0,
  created_at  timestamptz not null default now(),
  started_at  timestamptz,
  updated_at  timestamptz not null default now()
);
create index rooms_host_idx on public.rooms (host_id);
create index rooms_updated_idx on public.rooms (updated_at);

create table public.room_members (
  room_id   uuid not null references public.rooms(id) on delete cascade,
  user_id   uuid not null references auth.users on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index room_members_user_idx on public.room_members (user_id);

create table public.room_messages (                    -- chat: csak szobán belül létezik
  id         bigint generated always as identity primary key,
  room_id    uuid not null references public.rooms(id) on delete cascade,
  user_id    uuid not null references auth.users on delete cascade,
  body       text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now()
);
create index room_messages_room_idx on public.room_messages (room_id, id);
create index room_messages_user_idx on public.room_messages (user_id);

create table public.room_invites (
  room_id    uuid not null references public.rooms(id) on delete cascade,
  from_user  uuid not null references auth.users on delete cascade,
  to_user    uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (room_id, to_user)
);
create index room_invites_from_idx on public.room_invites (from_user);
create index room_invites_to_idx on public.room_invites (to_user);

-- Tagja vagyok-e a szobának? (security definer: az RLS-szabályok így nem hívják egymást végtelen ciklusban)
create function public.is_room_member(p_room uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.room_members
    where room_id = p_room and user_id = (select auth.uid())
  );
$$;

-- Szoba létrehozása: a létrehozó automatikusan tag és host.
create function public.create_room(
  p_mode text, p_puzzle_ref text, p_max_players smallint default 4, p_settings jsonb default '{}'
) returns public.rooms
language plpgsql security definer set search_path = '' as $$
declare
  me  uuid := (select auth.uid());
  r   public.rooms;
  c   text;
  tries int := 0;
begin
  if me is null then raise exception 'not authenticated'; end if;
  loop
    tries := tries + 1;
    c := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    begin
      insert into public.rooms (code, host_id, mode, puzzle_ref, max_players, settings)
      values (c, me, p_mode, p_puzzle_ref, p_max_players, coalesce(p_settings, '{}'))
      returning * into r;
      exit;
    exception when unique_violation then
      if tries > 10 then raise; end if;
    end;
  end loop;
  insert into public.room_members (room_id, user_id) values (r.id, me);
  return r;
end $$;

-- Belépés kóddal (csak lobby állapotú, nem teli szobába).
create function public.join_room(p_code text) returns public.rooms
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  r  public.rooms;
begin
  if me is null then raise exception 'not authenticated'; end if;
  select * into r from public.rooms where code = upper(trim(p_code)) and status = 'lobby' for update;
  if not found then raise exception 'room not found or already started'; end if;
  if not exists (select 1 from public.room_members where room_id = r.id and user_id = me)
     and (select count(*) from public.room_members where room_id = r.id) >= r.max_players then
    raise exception 'room is full';
  end if;
  insert into public.room_members (room_id, user_id) values (r.id, me) on conflict do nothing;
  return r;
end $$;

-- Kilépés: ha a host lép ki, a legrégebbi tag lesz az új host; ha senki nem marad, a szoba lezárul.
create function public.leave_room(p_room uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me       uuid := (select auth.uid());
  new_host uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  delete from public.room_members where room_id = p_room and user_id = me;
  select user_id into new_host from public.room_members where room_id = p_room order by joined_at limit 1;
  if new_host is null then
    update public.rooms set status = 'closed', updated_at = now() where id = p_room;
  else
    update public.rooms set host_id = new_host, updated_at = now() where id = p_room and host_id = me;
  end if;
end $$;

-- Indítás (csak a host). A gyilkos-mód szerepkiosztását a 0003 ezt cseréli le.
create function public.start_room(p_room uuid) returns public.rooms
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  r  public.rooms;
begin
  update public.rooms set status = 'playing', started_at = now(), updated_at = now()
   where id = p_room and host_id = me and status = 'lobby'
  returning * into r;
  if not found then raise exception 'only the host can start a lobby'; end if;
  return r;
end $$;

-- A közös tábla pillanatképének mentése (optimista verzió-ellenőrzéssel).
create function public.save_room_state(p_room uuid, p_rev integer, p_state jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare new_rev integer;
begin
  if not public.is_room_member(p_room) then raise exception 'not a member'; end if;
  update public.rooms set state = p_state, state_rev = p_rev + 1, updated_at = now()
   where id = p_room and state_rev = p_rev and status = 'playing'
  returning state_rev into new_rev;
  if new_rev is null then raise exception 'rev_conflict'; end if;
  return new_rev;
end $$;

-- Barát meghívása a szobába (csak elfogadott barátot, és csak szoba-tag hívhat).
create function public.invite_friend(p_room uuid, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid());
begin
  if me is null then raise exception 'not authenticated'; end if;
  if not public.is_room_member(p_room) then raise exception 'not a member'; end if;
  if not exists (
    select 1 from public.friendships
     where user_a = least(me, p_user) and user_b = greatest(me, p_user) and status = 'accepted'
  ) then raise exception 'not friends'; end if;
  insert into public.room_invites (room_id, from_user, to_user) values (p_room, me, p_user)
  on conflict (room_id, to_user) do nothing;
end $$;

-- Régi szobák takarítása (pg_cron-ból vagy kézzel): a chat és a szoba-adatok is törlődnek (on delete cascade).
create function public.cleanup_old_rooms() returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  delete from public.rooms
   where updated_at < now() - interval '2 days' or (status in ('finished','closed') and updated_at < now() - interval '1 day');
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.cleanup_old_rooms() from public, anon, authenticated;

-- =====================================================================
-- JOGOSULTSÁGOK: RLS
-- =====================================================================
alter table public.friendships   enable row level security;
alter table public.rooms         enable row level security;
alter table public.room_members  enable row level security;
alter table public.room_messages enable row level security;
alter table public.room_invites  enable row level security;

create policy "friendships: mine" on public.friendships for select to authenticated
  using ((select auth.uid()) in (user_a, user_b));

create policy "rooms: members" on public.rooms for select to authenticated
  using (public.is_room_member(id));

create policy "room_members: same room" on public.room_members for select to authenticated
  using (public.is_room_member(room_id));

create policy "room_messages: read" on public.room_messages for select to authenticated
  using (public.is_room_member(room_id));
create policy "room_messages: send" on public.room_messages for insert to authenticated
  with check ((select auth.uid()) = user_id and public.is_room_member(room_id));

create policy "room_invites: mine" on public.room_invites for select to authenticated
  using ((select auth.uid()) in (from_user, to_user));
create policy "room_invites: decline" on public.room_invites for delete to authenticated
  using ((select auth.uid()) = to_user);

-- jogosultságok: írni csak a fenti függvényeken (és a chaten) keresztül lehet
grant select on public.friendships, public.rooms, public.room_members, public.room_invites to authenticated;
grant select, insert on public.room_messages to authenticated;
grant delete on public.room_invites to authenticated;
grant select on public.my_friends to authenticated;

revoke execute on function
  public.send_friend_request(uuid), public.respond_friend_request(uuid, boolean), public.remove_friend(uuid),
  public.create_room(text, text, smallint, jsonb), public.join_room(text), public.leave_room(uuid),
  public.start_room(uuid), public.save_room_state(uuid, integer, jsonb), public.invite_friend(uuid, uuid),
  public.is_room_member(uuid)
  from public, anon;
grant execute on function
  public.send_friend_request(uuid), public.respond_friend_request(uuid, boolean), public.remove_friend(uuid),
  public.create_room(text, text, smallint, jsonb), public.join_room(text), public.leave_room(uuid),
  public.start_room(uuid), public.save_room_state(uuid, integer, jsonb), public.invite_friend(uuid, uuid),
  public.is_room_member(uuid)
  to authenticated;

-- Realtime (postgres_changes): meghívók, barátkérések, lobby-állapot és chat élőben érkezzen meg.
-- A publikáció a Supabase-ben alapból megvan; az RLS a Realtime-ra is érvényes (csak a jogosult látja a sort).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.room_invites, public.friendships, public.rooms, public.room_members, public.room_messages;
  end if;
end $$;
