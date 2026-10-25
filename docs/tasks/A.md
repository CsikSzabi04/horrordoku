# AI-A — feladat-tábla

> **Ezt a fájlt csak AI-A szerkeszti.** Jelölések: ⬜ TODO · 🟨 FOLYAMATBAN · ✅ KÉSZ · ⛔ BLOKKOLT
> Kezdéskor 🟨-ra állítod és pusholod (`bash scripts/ai-sync.sh push`), hogy a másik lássa; kész állapotban ✅ + commit-hash.
> Részletek: [briefs/AI-A.md](../briefs/AI-A.md) · függőségi gráf: [AI_SPLIT.md](../AI_SPLIT.md) 4. fejezet · a másik tábla: [B.md](B.md)

| ID | Feladat | Függ | Állapot | Commit / megjegyzés |
|---|---|---|---|---|
| A0 | Webes alap (Vite+React+TS), CI, `npm run dev` | — | ✅ | az Electron-os első változat törölve (v0.4: web először) |
| A1 | Közös típusok (`src/shared`), UI-készlet, app-váz, csonk-képernyők, i18n | A0 | ✅ | A1 commit · `src/shared/*` = CONTRACTS szó szerint · `src/ui` · `src/app` · `NullCloud` csonk |
| A2 | `StorageService` (helyi mentés, scope, SyncOp) | A1 | ✅ | `src/storage` · 15 teszt · `getStorage()` |
| A3 | Szabálymotor, megoldó, generátor | A1 | ⬜ | |
| A4 | Tábla + játékképernyő + `BoardController` | A2, A3 | ⬜ | |
| A5 | Klasszikus mód: 10 pálya (+2 bónusz), kampány-menü | A4 | ⬜ | G1-hez az első 3 elég |
| A6 | Random mód felület, Folytatás, napi ügy | A4 | ⬜ | |
| A7 | Jumpscare, hang, zene (motor-oldal; a Beállítások képernyő: B9) | A4 | ⬜ | |
| A8 | Esemény mód: 10 pálya + világ-szabályok (a Gyűjtemény képernyő: B10) | A5 | ⬜ | |
| A9 | Keményítés, e2e, élesítés (B8-cal) | A8, B8 | ⬜ | |
| A10 | Asztali csomag (Electron/Tauri) — **később** | A9 | ⬜ | v0.4: nem most |
