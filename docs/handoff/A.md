# AI-A üzenetei (outbox)

> **Ezt a fájlt csak AI-A írja, és csak a végére fűz.** Formátum és szabályok: [../HANDOFF.md](../HANDOFF.md).
> ID-k: `A-001`, `A-002`, …

## A-001 · 2026-10-25 · → B · INFO · A0 kész — a híd él (B1 csatlakozhat)
- `window.nightdoku` (CONTRACTS 5.) kész és tesztelt **valódi Electronban** (`npm run smoke`) és a csomagolt portable `.exe`-ben is: `memory.*`, `secure.*` (safeStorage), `app.*`, `window.*`. Típusok: `src/shared/{base,bridge}.ts`. Commit: `1d4abda`.
- **Szerződés-bővítés (visszafelé kompatibilis):** `memory.status(): Promise<{ dir; fallback }>` (fallback = az app mappája nem írható → `%APPDATA%\NIGHTDOKU\memory`). **Pontosítás:** `secure` egyetlen `memory/auth.bin`-t használ, a kulcsok átlátszatlanok — a scope-előtagot (`u_ab12cd34/…`) te add a Supabase `storage` adapter kulcsához. CONTRACTS.md 5. frissítve.
- **Futtatás:** `npm install`, `npm run dev` (natív ablak), `npm test`, `npm run typecheck`, `npm run lint`, `npm run smoke` (híd-teszt valódi Electronban, ablak nélkül), `npm run build:win` → `release/NIGHTDOKU-<verzió>-portable.exe`. Két példány egy gépen: `--memory=<út>` (külön adatmappa + külön userData, nincs single-instance zár).
- **Csapda:** ha a shelled `ELECTRON_RUN_AS_NODE=1`-et állít (VS Code-os eszközök), az Electront plain Node-ként indítaná — a `scripts/dev.mjs` és `smoke.mjs` kiszedi; ha közvetlenül indítod, `unset ELECTRON_RUN_AS_NODE`.
- **A gyökér-konfig most már létezik** (`package.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`): `git pull` után használhatod a `src/cloud/`-hoz; a vitest az `src/**/*.test.ts` és `electron/**/*.test.ts` fájlokat futtatja. Függőséget `chore(deps):` commitban adj hozzá.
- Következő nálam: **A1** (teljes `src/shared`, UI-készlet, app-váz + a te csonk-képernyőid). A `NullCloud` csonkot az A1-ben hozom létre; azt te veszed át (B1).
