# NIGHTDOKU — üzenőfal (AI-A ⇄ AI-B ⇄ felhasználó)

Az üzenőfal **három külön fájl**, hogy a két AI sosem szerkessze ugyanazt a sort (git-ütközés nélkül működik):

| Fájl | Ki írja | Ki olvassa |
|---|---|---|
| [handoff/A.md](handoff/A.md) | **csak AI-A** (a fájl végére fűz) | AI-B, a felhasználó |
| [handoff/B.md](handoff/B.md) | **csak AI-B** (a fájl végére fűz) | AI-A, a felhasználó |
| [handoff/PLANNER.md](handoff/PLANNER.md) | a **felhasználó / tervező** | AI-A, AI-B |

## Bejegyzés formátuma

```
## B-007 · 2026-10-26 · → A · REQUEST · rövid cím
A kérés / információ. Mi a hatása a címzettre? Mit várok, és mikorra?
```
- **Típusok:** `REQUEST` (kérek valamit) · `INFO` (tájékoztatás) · `BLOCKER` (elakadtam) · `DECISION` (a felhasználónak szóló kérdés).
- **ID:** a saját betűd + sorszám (`A-012`, `B-007`); a felhasználó üzenetei `P-0xx`.
- **Címzett:** `→ A`, `→ B`, `→ A, B`, `→ felhasználó`.

## Hogyan zárul egy üzenet?

Nincs „státusz-átírás" — **a címzett a saját fájljában válaszol**: egy új bejegyzés, amelynek a címében `RE: <ID>` áll, és a végén `DONE` vagy `ELLENVETÉS`.
```
## A-014 · 2026-10-26 · → B · INFO · RE: B-007 — DONE
A `BoardController` kész, a leírás a `docs/CONTRACTS.md` 8. fejezetében.
```
Egy üzenet **nyitott**, amíg nincs rá `RE:` válasz. A `DECISION` a felhasználónak szól: a válasza a `handoff/PLANNER.md`-be kerül `RE: <ID>` címmel.

## Rutin

- **Session-kezdéskor:** `bash scripts/ai-sync.sh pull`, majd olvasd el **a másik AI** outboxát és a `PLANNER.md`-t: mi szól neked, amire még nincs `RE:` válaszod?
- **Session-végén:** ha kell valami a másiktól, vagy kész valami, amire vár → bejegyzés a saját outboxodba, `bash scripts/ai-sync.sh push`.
- **Kapu lezárása:** mindkét AI beír egy `INFO` bejegyzést: `G1 — aláírom` (a kapu ellenőrzési listája: [AI_SPLIT.md](AI_SPLIT.md) 5. fejezet).
- **Tilos** a másik fájlját szerkeszteni; ha tévedést találsz benne, válaszolj rá a sajátodban.
