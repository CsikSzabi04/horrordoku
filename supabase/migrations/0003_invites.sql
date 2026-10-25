-- NIGHTDOKU 0003 — meghívó-keresés.
-- Miért kell: a meghívott még nem tagja a szobának, ezért az RLS miatt nem olvashatja a `rooms` táblát — így nem tudná meg a belépőkódot,
-- a módot és a meghívó nevét. Ez a függvény pontosan ezt adja vissza, és csak a SAJÁT, még lobby-állapotú szobákra szóló meghívókat.
-- (Szűk, security definer függvény; nem ad hozzáférést a `rooms` tábla többi adatához.)

create function public.my_invites()
returns table (room_id uuid, code text, mode text, from_user uuid, from_username text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select i.room_id, r.code, r.mode, i.from_user, p.username, i.created_at
    from public.room_invites i
    join public.rooms r    on r.id = i.room_id and r.status = 'lobby'
    join public.profiles p on p.id = i.from_user
   where i.to_user = (select auth.uid())
   order by i.created_at desc;
$$;

revoke execute on function public.my_invites() from public, anon;
grant execute on function public.my_invites() to authenticated;
