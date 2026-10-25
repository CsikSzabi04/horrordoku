#!/usr/bin/env bash
# NIGHTDOKU — az AI saját munkakönyvtárának létrehozása (git worktree), klónozás NÉLKÜL.
#
# Használat (Git Bash / PowerShellből: bash scripts/ai-setup.sh A):
#     bash scripts/ai-setup.sh A      # AI-A  ->  <projekt>/.work/A  (ág: ai-a)
#     bash scripts/ai-setup.sh B      # AI-B  ->  <projekt>/.work/B  (ág: ai-b)
#
# Idempotens: ha a munkakönyvtár már létezik, nem nyúl hozzá, csak kiírja az útját.
# A munkakönyvtár a projektmappán BELÜL van (.work/, gitignore-olt), így az AI-eszközök külön engedély nélkül írhatnak bele.
set -euo pipefail

who="${1:-}"
case "$who" in A | B) ;; *) echo "Használat: bash scripts/ai-setup.sh A|B" >&2; exit 2 ;; esac
lower="$(printf '%s' "$who" | tr 'AB' 'ab')"
branch="ai-$lower"

# A fő munkamappa = a worktree-lista első eleme (akkor is, ha egy másik worktree-ből futtatod).
main="$(git worktree list --porcelain | sed -n 's/^worktree //p' | head -n1)"
dir="$main/.work/$who"

git -C "$main" worktree prune
if ! git -C "$main" fetch origin main --quiet 2>/dev/null; then
  echo "FIGYELEM: az 'origin' nem elérhető (offline?) — a helyi main-ről indulunk." >&2
fi

# Alap: a helyi main, ha az előrébb jár vagy egyenlő az origin/main-nel (pl. még nem pusholt commitok); különben origin/main.
base="main"
if git -C "$main" rev-parse --verify -q origin/main >/dev/null; then
  if git -C "$main" merge-base --is-ancestor origin/main main 2>/dev/null; then base="main"; else base="origin/main"; fi
fi

if [ -e "$dir/.git" ]; then
  echo "A munkakönyvtár már létezik: $dir"
else
  # A worktree a COMMITOLT állapotból jön létre: a fő mappa nem commitolt dokumentumai/szkriptjei nem kerülnének bele.
  if [ -n "$(git -C "$main" status --porcelain -- AGENTS.md CLAUDE.md docs scripts 2>/dev/null)" ]; then
    echo "FIGYELEM: a fő mappában NEM commitolt változások vannak az AGENTS.md / docs / scripts alatt." >&2
    echo "          Ezek nem kerülnek a munkakönyvtáradba — kérd meg a felhasználót, hogy commitolja őket, és futtasd újra." >&2
    exit 3
  fi
  mkdir -p "$main/.work"
  if git -C "$main" show-ref --verify -q "refs/heads/$branch"; then
    git -C "$main" worktree add "$dir" "$branch"        # korábbi munka megmarad (az ág nem íródik felül)
  else
    git -C "$main" worktree add -b "$branch" "$dir" "$base"
  fi
fi

# Helyi (titkot nem tartalmazó) környezet másolása: a .env gitignore-olt.
if [ -f "$main/.env" ] && [ ! -f "$dir/.env" ]; then cp "$main/.env" "$dir/.env"; echo ".env átmásolva."; fi

echo
echo "KÉSZ. AI-$who munkakönyvtára:  $dir   (ág: $branch)"
echo "  • Minden fájlművelet, git- és npm-parancs ITT történjen (abszolút úttal vagy 'cd'-vel)."
echo "  • A fő mappába ($main) NE írj."
echo "  • Szinkron:  bash scripts/ai-sync.sh pull   |   bash scripts/ai-sync.sh push"
echo "  • Következő: olvasd el itt az AGENTS.md-t és a docs/briefs/AI-$who.md-t."
