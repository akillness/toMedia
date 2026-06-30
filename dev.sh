#!/usr/bin/env bash
#
# dev.sh — run Lever locally for development.
#
# Boots the Next.js dev server with sensible defaults and a few guardrails so a
# fresh checkout "just works":
#   • verifies the Node major version against .nvmrc (engines: node >=20)
#   • installs dependencies on first run (or when package-lock.json changes)
#   • loads .env.local automatically (Next.js does this too, but we surface which
#     persistence/vault mode is active so you know what you're testing)
#   • lets you override the port:  PORT=4000 ./dev.sh   (or ./dev.sh --port 4000)
#
# With no environment configured, Lever runs entirely on its in-memory store and
# the seeded demo dataset — perfect for a local smoke test.
set -euo pipefail

cd "$(dirname "$0")"

PORT="${PORT:-3000}"
HOST="${HOST:-localhost}"

while [ $# -gt 0 ]; do
  case "$1" in
    --port) PORT="$2"; shift 2 ;;
    --host) HOST="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: ./dev.sh [--port N] [--host H]"
      echo "  PORT / HOST env vars are honored too (flags win)."
      exit 0 ;;
    *) echo "dev.sh: unknown argument '$1' (try --help)" >&2; exit 2 ;;
  esac
done

# ── Node version guard ───────────────────────────────────────────────────────
required_major="$(tr -dc '0-9' < .nvmrc 2>/dev/null || echo 20)"
node_major="$(node -v 2>/dev/null | sed -E 's/^v([0-9]+).*/\1/' || echo 0)"
if [ "$node_major" -lt "$required_major" ]; then
  echo "✗ Node $required_major+ required (found $(node -v 2>/dev/null || echo 'none'))." >&2
  echo "  Try:  nvm use   (an .nvmrc pins $required_major)" >&2
  exit 1
fi

# ── Dependencies ─────────────────────────────────────────────────────────────
# Reinstall when node_modules is missing or older than the lockfile.
if [ ! -d node_modules ] || [ package-lock.json -nt node_modules ]; then
  echo "→ Installing dependencies (npm ci)…"
  if [ -f package-lock.json ]; then npm ci; else npm install; fi
fi

# ── Surface the active runtime mode ──────────────────────────────────────────
if [ -f .env.local ]; then echo "→ Loaded .env.local"; fi
get_env() { # read VAR from .env.local without exporting secrets to the log
  [ -f .env.local ] && sed -nE "s/^$1=(.+)$/\1/p" .env.local | tail -1
}
if [ -n "$(get_env FIREBASE_PROJECT_ID)" ]; then persistence="Firestore"
elif [ -n "$(get_env LEVER_DB_PATH)" ];      then persistence="local file DB"
else persistence="in-memory (demo)"; fi
[ -n "$(get_env LEVER_SECRET_KEY)" ] && vault="encrypted (sealed to disk)" || vault="in-memory only"
[ -n "$(get_env LEVER_ADMIN_TOKEN)" ] && admin="token-gated" || admin="OPEN in dev (set LEVER_ADMIN_TOKEN to lock writes)"

cat <<INFO
┌─ Lever dev server ──────────────────────────────────────────
│ URL          http://$HOST:$PORT
│ Persistence  $persistence
│ Cred vault   $vault
│ Cred writes  $admin
└─────────────────────────────────────────────────────────────
INFO

# ── Run ──────────────────────────────────────────────────────────────────────
exec npm run dev -- --hostname "$HOST" --port "$PORT"
