-- NIGHTDOKU 0004 — ranglista, nyilvános profil, láthatóság / online-állapot, moderáció, barát-limit (B7).
-- Új táblán RLS be van kapcsolva; írni csak a lenti függvényeken (security definer) keresztül lehet, ahol az szükséges.

-- =====================================================================
-- 1) PROFIL: kereshetőség, láthatatlan mód, utoljára látva
-- =====================================================================
alter table public.profiles
  add column searchable boolean     not null default true,   -- kikapcsolva: nem találják meg a barát-keresőben, nem látszik a ranglistán
  add column invisible  boolean     not null default false,  -- „Láthatatlan mód": a barátok nem látják, hogy online vagyok
  add column last_seen  timestamptz;

-- Szívverés: a kliens percenként hívja. Csak a saját sort írja, és nem érinti az updated_at-et (az a szinkron összefésüléséhez kell).
create function public.touch_presence(p_invisible boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set last_seen = now(), invisible = coalesce(p_invisible, false)
   where id = (select auth.uid());
end $$;

-- A barátlista kiegészül az online-állapottal (2 percen belüli szívverés, és nem láthatatlan).
create or replace view public.my_friends with (security_invoker = true) as
select case when f.user_a = (select auth.uid()) then f.user_b else f.user_a end as friend_id,
       p.username, p.avatar, p.xp,
       f.status, f.requested_by, f.created_at,
       (f.status = 'accepted' and not p.invisible and coalesce(p.last_seen > now() - interval '2 minutes', false)) as online
from public.friendships f
join public.profiles p
  on p.id = case when f.user_a = (select auth.uid()) then f.user_b else f.user_a end
where (select auth.uid()) in (f.user_a, f.user_b);

-- Keresés a becenév előtagjára: csak kereshető profilok, saját magam nélkül, a LIKE-karakterek kiütésével, max. 20 találat.
create function public.search_profiles(p_prefix text)
returns table (id uuid, username text, avatar text, xp integer)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username, p.avatar, p.xp
    from public.profiles p
   where char_length(trim(p_prefix)) >= 2
     and p.searchable
     and p.id <> (select auth.uid())
     and p.username ilike replace(replace(replace(trim(p_prefix), '\', '\\'), '%', '\%'), '_', '\_') || '%'
   order by p.username
   limit 20;
$$;

-- =====================================================================
-- 2) RANGLISTA: beküldés csak a függvényen át (érvényesített idő, csak a javulás számít)
-- =====================================================================
revoke insert, update on public.leaderboard from authenticated;

create function public.submit_score(p_board text, p_ms integer, p_hints smallint default 0) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid());
begin
  if me is null then raise exception 'not authenticated'; end if;
  if p_board is null or p_board !~ '^daily:[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'invalid board'; end if;
  if p_ms is null or p_ms < 3000 or p_ms > 86400000 then raise exception 'invalid time'; end if;
  insert into public.leaderboard (board, user_id, time_ms, hints_used)
  values (p_board, me, p_ms, coalesce(p_hints, 0))
  on conflict (board, user_id) do update set time_ms = excluded.time_ms, hints_used = excluded.hints_used
   where excluded.time_ms < public.leaderboard.time_ms;
end $$;

-- Az első N helyezett (a nem kereshető profilok csak a saját sorukat látják).
create function public.leaderboard_top(p_board text, p_n integer default 20)
returns table (username text, avatar text, time_ms integer, hints_used smallint)
language sql stable security definer set search_path = '' as $$
  select p.username, p.avatar, l.time_ms, l.hints_used
    from public.leaderboard l
    join public.profiles p on p.id = l.user_id
   where l.board = p_board
     and (p.searchable or l.user_id = (select auth.uid()))
   order by l.time_ms, l.created_at
   limit least(greatest(coalesce(p_n, 20), 1), 100);
$$;

-- =====================================================================
-- 3) NYILVÁNOS PROFIL: biztonságos statisztika másoknak (kereshető profil, barát, vagy saját)
-- =====================================================================
create function public.public_profile(p_user uuid)
returns table (id uuid, username text, avatar text, xp integer, best_streak smallint,
               solved_total bigint, solved_no_hints bigint, coop_games bigint, wins_as_detective bigint, wins_as_killer bigint)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username, p.avatar, p.xp, p.best_streak,
         count(distinct r.puzzle_ref) filter (where r.solved),
         count(distinct r.puzzle_ref) filter (where r.solved and r.hints_used = 0),
         count(r.id) filter (where r.kind in ('together','killer')),
         count(r.id) filter (where r.role = 'detective' and r.won),
         count(r.id) filter (where r.role = 'killer' and r.won)
    from public.profiles p
    left join public.runs r on r.user_id = p.id
   where p.id = p_user
     and (p.searchable
          or p.id = (select auth.uid())
          or exists (select 1 from public.friendships f
                      where f.status = 'accepted'
                        and f.user_a = least(p.id, (select auth.uid())) and f.user_b = greatest(p.id, (select auth.uid()))))
   group by p.id;
$$;

-- =====================================================================
-- 4) MODERÁCIÓ: chat-jelentés (csak a függvényen át; a jelentéseket az üzemeltető olvassa) és némítás
-- =====================================================================
create table public.chat_reports (
  id         bigint generated always as identity primary key,
  reporter   uuid not null references auth.users on delete cascade,
  reported   uuid not null references auth.users on delete cascade,
  room_id    uuid,                                  -- nincs FK: a szoba később törlődhet, a jelentés megmarad
  message_id bigint,
  reason     text not null default '' check (char_length(reason) <= 300),
  created_at timestamptz not null default now(),
  unique (reporter, message_id)
);
create index chat_reports_reported_idx on public.chat_reports (reported);
alter table public.chat_reports enable row level security;   -- nincs policy és nincs grant: kliens közvetlenül nem fér hozzá

create function public.report_message(p_message bigint, p_reason text default '') returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  m  public.room_messages;
begin
  if me is null then raise exception 'not authenticated'; end if;
  select * into m from public.room_messages where id = p_message;
  if not found then raise exception 'message not found'; end if;
  if not public.is_room_member(m.room_id) then raise exception 'not a member'; end if;
  if m.user_id = me then raise exception 'invalid report'; end if;
  insert into public.chat_reports (reporter, reported, room_id, message_id, reason)
  values (me, m.user_id, m.room_id, m.id, left(trim(coalesce(p_reason, '')), 300))
  on conflict (reporter, message_id) do nothing;
end $$;

create table public.chat_mutes (
  user_id    uuid not null references auth.users on delete cascade,
  muted_id   uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, muted_id),
  check (user_id <> muted_id)
);
create index chat_mutes_muted_idx on public.chat_mutes (muted_id);
alter table public.chat_mutes enable row level security;
create policy "own rows" on public.chat_mutes for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, delete on public.chat_mutes to authenticated;

-- =====================================================================
-- 5) BARÁT-LIMIT: legfeljebb 100 barát / függő kérés felhasználónként (a 0002 függvényének cseréje)
-- =====================================================================
create or replace function public.send_friend_request(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid());
begin
  if me is null then raise exception 'not authenticated'; end if;
  if p_user is null or p_user = me then raise exception 'invalid user'; end if;
  if not exists (select 1 from public.profiles where id = p_user) then raise exception 'unknown user'; end if;
  if (select count(*) from public.friendships where me in (user_a, user_b)) >= 100 then raise exception 'friend limit reached'; end if;

  insert into public.friendships (user_a, user_b, requested_by)
  values (least(me, p_user), greatest(me, p_user), me)
  on conflict (user_a, user_b) do update set status = 'accepted'
    where public.friendships.status = 'pending' and public.friendships.requested_by <> me;
end $$;

-- jogosultságok: csak bejelentkezett felhasználó hívhatja
revoke execute on function
  public.touch_presence(boolean), public.search_profiles(text), public.submit_score(text, integer, smallint),
  public.leaderboard_top(text, integer), public.public_profile(uuid), public.report_message(bigint, text)
  from public, anon;
grant execute on function
  public.touch_presence(boolean), public.search_profiles(text), public.submit_score(text, integer, smallint),
  public.leaderboard_top(text, integer), public.public_profile(uuid), public.report_message(bigint, text)
  to authenticated;
