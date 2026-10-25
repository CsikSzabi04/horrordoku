# SQL-tesztek (Supabase-migrációk)

Helyi Postgres-ben (PGlite, WASM) futtatja a `../migrations/*.sql` fájlokat, a Supabase szerepeit (`anon`, `authenticated`),
az `auth.uid()` függvényt és a Realtime-csonkot utánozva. Nem kell hozzá Supabase-fiók, és **semmit nem ír a felhőbe**.

```bash
cd supabase/tests
npm install
npm test
```

## Szabályok
- Minden új migrációhoz (`0003_…`) **új teszt** tartozik ugyanebben a fájlban (a végén, a `[…]` blokkok mintájára): jogosultság (más sorához nem fér hozzá),
  a függvények hibaágai, és legalább egy „boldog út".
- A PGlite nem a valódi Supabase: a privát Realtime-csatornák jogosultságát (`realtime.messages` RLS) csak csonk teszteli — élesben kézzel ellenőrizendő.
- Az „anon nem lát semmit" tesztek a valódi Supabase-en *üres listát* adnak (az alap jogosultságok miatt az RLS szűr), itt *tiltást*; mindkettő jó.
