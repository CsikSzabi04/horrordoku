#!/usr/bin/env bash
# NIGHTDOKU — szinkron az origin/main-nel, a SAJÁT munkakönyvtáradból (ai-a / ai-b ág).
#
#     bash scripts/ai-sync.sh pull    # frissítés: a saját ágad rebase-elése az origin/main-re (nem commitolt munkád megmarad)
#     bash scripts/ai-sync.sh push    # a commitjaid felvitele a main-re: fetch -> rebase -> push (force NÉLKÜL; ütközésnél újrapróbál)
#
# Ütközés (rebase conflict) esetén a script megáll. Ha CSAK a saját fájljaid ütköznek: oldd fel, `git add`, `git rebase --continue`, majd újra `push`.
# Ha a MÁSIK AI fájljaival ütközöl: `git rebase --abort`, és írj a HANDOFF-ba — ennek a tulajdonjogi határok miatt nem kellene előfordulnia.
set -euo pipefail

cmd="${1:-}"
branch="$(git rev-parse --abbrev-ref HEAD)"
case "$branch" in ai-a | ai-b) ;; *)
  echo "Ezt a saját munkakönyvtáradból futtasd (ai-a / ai-b ág). Most ezen az ágon vagy: $branch" >&2
  exit 2 ;;
esac

case "$cmd" in
  pull)
    git fetch origin main --quiet
    git rebase --autostash origin/main
    echo "Naprakész: $(git log --oneline -1)"
    ;;
  push)
    if [ -n "$(git status --porcelain)" ]; then
      echo "Előbb commitold a változásaidat (a munkafa nem tiszta). Ne commitolj .env-et vagy titkot!" >&2
      exit 1
    fi
    for attempt in 1 2 3 4; do
      git fetch origin main --quiet
      git rebase origin/main
      if git push origin "HEAD:main"; then
        echo "Feltöltve a main-re: $(git log --oneline -1)"
        exit 0
      fi
      echo "A push elutasítva (közben a másik AI is pusholt) — újrapróbálom ($attempt/4)…" >&2
      sleep $((attempt * 2))
    done
    echo "A push 4 próbálkozás után sem sikerült — nézd meg a 'git status'-t, és írj a HANDOFF-ba." >&2
    exit 1
    ;;
  *)
    echo "Használat: bash scripts/ai-sync.sh pull|push" >&2
    exit 2
    ;;
esac
