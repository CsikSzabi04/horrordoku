-- 0008 — biztonsági megerősítés (védelem mélységben). A futtatást a felhasználó végzi a HorrorDoku projekt SQL Editorában (AGENTS.md 2. szabály).
-- Minden kényszer NOT VALID: a meglévő sorokat nem vizsgálja (nem bukik el rajtuk a migráció), az új / módosított sorokra viszont érvényes.
-- Amit ez NEM old meg (kliens-változtatás kell hozzá): a profilok széles olvasási szabálya (last_seen / invisible / searchable látszik),
-- és az XP / érme végleges szerver-oldali kiosztása — ezek a docs/handoff/A.md A-018 pontjában vannak.

------------------------------------------------------------------------------------------------------------------------
-- 1. Hamisítás elleni korlátok: a kliens írja az XP-t / érmét / futás-naplót, ezért legalább ésszerű keretek között tartjuk
------------------------------------------------------------------------------------------------------------------------
alter table public.profiles add constraint profiles_bounds check (
  xp between 0 and 5000000 and coins between 0 and 5000000 and streak between 0 and 3660 and best_streak between 0 and 3660
) not valid;

alter table public.runs add constraint runs_bounds check (
  (time_ms is null or time_ms between 0 and 86400000) and hints_used between 0 and 999 and wrong_submits between 0 and 999
) not valid;

-- Egy módosításban nem ugorhat az XP / érme az egekbe (a valódi játékmenetben egy futás legfeljebb néhány száz XP-t ér).
create function public.profiles_guard() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.xp > old.xp + 100000 or new.coins > old.coins + 100000 then
    raise exception 'implausible progress jump';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles for each row execute function public.profiles_guard();

-- Becenév: nincs lemaradó szóköz, és nincsenek láthatatlan / irányváltó karakterek (más játékos megszemélyesítése ellen).
alter table public.profiles add constraint profiles_username_clean check (
  username = btrim(username) and username !~ '[​-‏‪-‮⁠-⁤⁦-⁩﻿]'
) not valid;

------------------------------------------------------------------------------------------------------------------------
-- 2. Méretkorlátok (egy tag se írhasson megabájtokat a szobába / a mentésekbe, amit a Realtime továbbít)
------------------------------------------------------------------------------------------------------------------------
alter table public.saves add constraint saves_size check (
  pg_column_size(state) < 262144 and pg_column_size(meta) < 8192 and char_length(puzzle_ref) <= 100
) not valid;
alter table public.user_settings add constraint user_settings_size check (pg_column_size(data) < 65536) not valid;
alter table public.rooms add constraint rooms_size check (
  pg_column_size(settings) < 4096 and pg_column_size(state) < 262144 and char_length(puzzle_ref) <= 100
) not valid;

------------------------------------------------------------------------------------------------------------------------
-- 3. Sebességkorlát: a szoba-kód keresése / a chat ne legyen tömegesen próbálgatható / árasztható
------------------------------------------------------------------------------------------------------------------------
create unlogged table public.rate_hits (
  user_id uuid not null,
  bucket  text not null,
  at      timestamptz not null default now()
);
create index rate_hits_idx on public.rate_hits (user_id, bucket, at);
alter table public.rate_hits enable row level security;      -- nincs policy és nincs grant: csak a függvényeken át

create function public._rate_limit(p_bucket text, p_max integer, p_window interval) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  n  integer;
begin
  if me is null then raise exception 'not authenticated'; end if;
  delete from public.rate_hits where user_id = me and at < now() - interval '10 minutes';
  select count(*) into n from public.rate_hits where user_id = me and bucket = p_bucket and at > now() - p_window;
  if n >= p_max then raise exception 'rate limited'; end if;
  insert into public.rate_hits (user_id, bucket) values (me, p_bucket);
end $$;
revoke all on function public._rate_limit(text, integer, interval) from public, anon, authenticated;

-- A meglévő függvényeket átnevezzük, és vékony, sebességkorlátos burkolót adunk a régi néven (a törzsüket nem másoljuk: nem csúszhat el).
alter function public.join_room(text) rename to _join_room_impl;
alter function public.follow_room(text) rename to _follow_room_impl;
alter function public.room_peek(text) rename to _room_peek_impl;
revoke all on function public._join_room_impl(text), public._follow_room_impl(text), public._room_peek_impl(text) from public, anon, authenticated;

create function public.join_room(p_code text) returns public.rooms
language plpgsql security definer set search_path = '' as $$
begin
  perform public._rate_limit('room_lookup', 30, interval '1 minute');
  return public._join_room_impl(p_code);
end $$;

create function public.follow_room(p_code text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._rate_limit('room_lookup', 30, interval '1 minute');
  perform public._follow_room_impl(p_code);
end $$;

create function public.room_peek(p_code text)
returns table (room_id uuid, code text, name text, mode text, status text, is_open boolean, max_players smallint,
               owner_username text, member_count bigint, is_member boolean)
language plpgsql security definer set search_path = '' as $$
begin
  perform public._rate_limit('room_lookup', 30, interval '1 minute');
  return query select * from public._room_peek_impl(p_code);
end $$;

revoke all on function public.join_room(text), public.follow_room(text), public.room_peek(text) from public, anon;
grant execute on function public.join_room(text), public.follow_room(text), public.room_peek(text) to authenticated;

-- Chat: a szerver állítja be az időt (a kliens nem hamisíthatja), és legfeljebb 12 üzenet / 10 mp felhasználónként.
create function public.room_messages_guard() returns trigger language plpgsql set search_path = '' as $$
begin
  new.created_at := now();
  if (select count(*) from public.room_messages m where m.user_id = new.user_id and m.created_at > now() - interval '10 seconds') >= 12 then
    raise exception 'rate limited';
  end if;
  return new;
end $$;
create trigger room_messages_guard before insert on public.room_messages for each row execute function public.room_messages_guard();

------------------------------------------------------------------------------------------------------------------------
-- 4. Napi ranglista: csak a mai (±1 nap) táblára, értelmes tipp-számmal
------------------------------------------------------------------------------------------------------------------------
create or replace function public.submit_score(p_board text, p_ms integer, p_hints smallint default 0) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid());
begin
  if me is null then raise exception 'not authenticated'; end if;
  if p_board is null or p_board !~ '^daily:[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'invalid board'; end if;
  if substring(p_board from 7)::date not between current_date - 1 and current_date + 1 then raise exception 'invalid board date'; end if;
  if p_ms is null or p_ms < 3000 or p_ms > 86400000 then raise exception 'invalid time'; end if;
  if coalesce(p_hints, 0) not between 0 and 99 then raise exception 'invalid hints'; end if;
  insert into public.leaderboard (board, user_id, time_ms, hints_used)
  values (p_board, me, p_ms, coalesce(p_hints, 0))
  on conflict (board, user_id) do update set time_ms = excluded.time_ms, hints_used = excluded.hints_used
   where excluded.time_ms < public.leaderboard.time_ms;
end $$;

------------------------------------------------------------------------------------------------------------------------
-- 5. Apróságok
------------------------------------------------------------------------------------------------------------------------
-- Egy még nem esedékes (released_at a jövőben) pálya ne szivárogjon ki.
drop policy "puzzles: published" on public.puzzles;
create policy "puzzles: published" on public.puzzles for select using (published and released_at <= now());

-- A barát-kód generátorát csak szerver-oldali függvények hívják.
revoke execute on function public.new_friend_code() from public, anon, authenticated;
