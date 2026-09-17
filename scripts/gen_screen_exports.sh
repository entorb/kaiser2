#!/bin/sh
# Export a PNG and a text snapshot of every game screen for UI review.
# Outputs tmp/screens/ (gitignored), named after the screen table in AGENTS.md;
# sub-menus/pop-ups export as their own -<name> files. Uses the dev build, so
# start pnpm dev, or let this script start it when port 5173 is idle.
#
#   sh scripts/gen_screen_exports.sh
set -e
cd "$(dirname "$0")/.." || exit 1

URL="http://localhost:5173/kaiser2/"
LOG="tmp/dev-server.log"

if ! curl -s -o /dev/null --max-time 2 "$URL"; then
  mkdir -p tmp
  pnpm dev >"$LOG" 2>&1 &
  DEV_PID=$!
  trap 'kill "$DEV_PID" 2>/dev/null || true' EXIT INT TERM
  n=0
  until curl -s -o /dev/null --max-time 1 "$URL"; do
    [ "$n" -ge 60 ] && {
      echo "dev server did not start; see $LOG" >&2
      exit 1
    }
    n=$((n + 1))
    sleep 1
  done
  echo "dev server ready"
fi

node scripts/gen_screen_exports.mjs "$@"
echo "exports in tmp/screens/"
