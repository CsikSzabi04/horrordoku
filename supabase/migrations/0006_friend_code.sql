-- NIGHTDOKU — 0006: barát-kód + jobb keresés (felhasználói kérés).
--   1) Minden profilnak van egy véletlen, 10 karakteres azonosítója (betű / szám / írásjel), amit a profilon mutatunk;
--      a kódból megosztható link készül, amit megnyitva a (bejelentkezett) másik játékos egyből megtalálja és felvehet barátnak.
--   2) A becenév-keresés a névben BÁRHOL keres (nem csak az elején), és a saját profilt is megmutatja (jelölve), hogy a keresés
--      „látható” legyen akkor is, ha valaki a saját nevére keres.
-- A kódokat külön tábla tartja, amit közvetlenül senki nem olvas (nincs policy) — csak a függvényeken át: a saját kód, illetve keresés kód alapján.
-- Futtatás: Supabase SQL Editor, a 0005_rooms.sql UTÁN.

-- =====================================================================
-- 1) BARÁT-KÓD
-- =====================================================================
-- Véletlen kód: 10 karakter; a félreolvasható karakterek (I, l, O, 0, 1) kimaradnak. Nem titok (csak a megtalálást segíti), ezért elég a random().
create function public.new_friend_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*+=?';
  result text := '';
begin
  for i in 1..10 loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return result;
end $$;

create table public.profile_codes (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  code    text not null unique check (char_length(code) = 10)
);
alter table public.profile_codes enable row level security;   -- szándékosan nincs policy: közvetlenül nem olvasható
revoke all on public.profile_codes from anon, authenticated;

-- Belső: a felhasználó kódja (létrehozza, ha még nincs). Ütközés esetén (gyakorlatilag lehetetlen) új kódot sorsol.
create function public.ensure_friend_code(p_user uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare c text; n int := 0;
begin
  select code into c from public.profile_codes where user_id = p_user;
  if c is not null then return c; end if;
  loop
    n := n + 1;
    begin
      insert into public.profile_codes (user_id, code) values (p_user, public.new_friend_code()) returning code into c;
      return c;
    exception when unique_violation then
      select code into c from public.profile_codes where user_id = p_user;   -- közben más létrehozta?
      if c is not null then return c; end if;
      if n >= 8 then raise; end if;
    end;
  end loop;
end $$;
revoke execute on function public.ensure_friend_code(uuid) from public, anon, authenticated;

-- A meglévő profilok kódot kapnak (soronként új sorsolás); az új profiloké a triggerből jön.
insert into public.profile_codes (user_id, code)
select id, public.new_friend_code() from public.profiles
on conflict do nothing;

create function public.profile_code_trigger() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.ensure_friend_code(new.id);
  return new;
end $$;
revoke execute on function public.profile_code_trigger() from public, anon, authenticated;
create trigger profiles_friend_code after insert on public.profiles
  for each row execute function public.profile_code_trigger();

-- A saját kódom (ha valamiért hiányzik, létrehozza).
create function public.my_friend_code() returns text
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid());
begin
  if me is null then raise exception 'not authenticated'; end if;
  return public.ensure_friend_code(me);
end $$;

-- Keresés kód alapján (pontos egyezés, kis/nagybetű számít). A nem kereshető profilt is megtalálja — aki a kódot megosztja, azt akarja.
create function public.find_by_code(p_code text)
returns table (id uuid, username text, avatar text, xp integer, is_me boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username, p.avatar, p.xp, p.id = (select auth.uid())
    from public.profile_codes c
    join public.profiles p on p.id = c.user_id
   where char_length(trim(p_code)) = 10
     and c.code = trim(p_code)
   limit 1;
$$;

-- =====================================================================
-- 2) KERESÉS A BECENÉVRE: bárhol a névben, a saját profil is (jelölve)
-- =====================================================================
drop function public.search_profiles(text);
create function public.search_profiles(p_prefix text)
returns table (id uuid, username text, avatar text, xp integer, is_me boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username, p.avatar, p.xp, p.id = (select auth.uid()) as is_me
    from public.profiles p
   where char_length(trim(p_prefix)) >= 2
     and (p.searchable or p.id = (select auth.uid()))
     and p.username ilike '%' || replace(replace(replace(trim(p_prefix), '\', '\\'), '%', '\%'), '_', '\_') || '%'
   order by (p.username ilike replace(replace(replace(trim(p_prefix), '\', '\\'), '%', '\%'), '_', '\_') || '%') desc, p.username
   limit 20;
$$;

-- jogosultságok: csak bejelentkezett felhasználó hívhatja
revoke execute on function public.my_friend_code(), public.find_by_code(text), public.search_profiles(text) from public, anon;
grant execute on function public.my_friend_code(), public.find_by_code(text), public.search_profiles(text) to authenticated;
