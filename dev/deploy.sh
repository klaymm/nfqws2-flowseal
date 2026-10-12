#!/usr/bin/env bash
set -euo pipefail

case "${1:-check}" in
  check) CMD=check ;;
  apply) CMD=install ;;
  *) echo "Использование: $0 check|apply" >&2; exit 2 ;;
esac

ROUTER=${ROUTER:-admin@192.168.1.1}
PORT=${PORT:-22}
DIR=/opt/tmp/nfqws2-flowseal-dev

cd "$(dirname "$0")/.."

files() {
  git ls-files -z --cached --others --exclude-standard -- . ':!web' |
    while IFS= read -r -d '' f; do
      if [ -e "$f" ]; then printf '%s\0' "$f"; fi
    done
}

if files | xargs -0 grep -lI $'\r' --; then
  echo "В этих файлах переводы строк CRLF, выкладка остановлена" >&2
  exit 1
fi

payload() {
  echo "rm -rf $DIR && mkdir -p $DIR || exit 1"
  echo "base64 -d <<'EOF' | tar -xzf - -C $DIR || exit 1"
  files | tar -czf - --owner=0 --group=0 --null -T - | base64
  echo "EOF"
  echo "sh $DIR/nfqws2-flowseal $CMD $DIR < /dev/null; rc=\$?"
  echo "rm -rf $DIR"
  echo "exit \$rc"
}

payload | ssh -p "$PORT" -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new -o LogLevel=ERROR \
  "$ROUTER" 'exec sh' | sed $'s/\e\\[K//g'
