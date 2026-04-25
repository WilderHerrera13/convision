#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

if [[ $# -lt 1 ]]; then
  echo "Uso: $0 <mensaje de commit>" >&2
  exit 1
fi

MESSAGE="$*"

DIRS=(
  "convision-api-golang"
  "convision-api"
  "convision-front"
)

for d in "${DIRS[@]}"; do
  if [[ ! -d "$ROOT/$d" ]]; then
    echo "Directorio no encontrado: $d" >&2
    exit 1
  fi
done

git add -- "${DIRS[@]}"
if git diff --cached --quiet; then
  echo "Nada que commitear en los directorios de aplicación." >&2
  exit 0
fi

git commit -m "$MESSAGE"
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
git push origin "$CURRENT_BRANCH"
