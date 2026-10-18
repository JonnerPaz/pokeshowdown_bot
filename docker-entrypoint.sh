#!/bin/sh
# Container entrypoint for the production image.
#
# Waits for PostgreSQL to become reachable, applies pending Prisma migrations and
# only then starts the bot. This keeps the container alive (instead of
# crash-looping) when the database is still booting or temporarily unavailable,
# which is common on orchestrators such as Dokploy where `depends_on` is not
# always honoured.
#
# All shell variables live here on purpose: Docker Compose interpolates every
# `$VAR` found in the compose file, so keeping the logic in a script avoids
# double-escaping (`$$VAR`) inside YAML.
set -eu

HOST="${DB_HOST:-db}"
PORT="${DB_PORT:-5432}"
MAX_ATTEMPTS="${DB_MAX_ATTEMPTS:-40}"
RETRY_DELAY="${DB_RETRY_DELAY:-3}"

echo "[entrypoint] Waiting for PostgreSQL at ${HOST}:${PORT}"

if getent hosts "${HOST}" >/dev/null 2>&1; then
  RESOLVED="$(getent hosts "${HOST}" | awk '{ print $1 }' | tr '\n' ' ')"
  echo "[entrypoint] ${HOST} resolves to: ${RESOLVED}"
else
  echo "[entrypoint] WARNING: '${HOST}' does not resolve inside this network." >&2
  echo "[entrypoint] Verify the database shares a Docker network with the bot, then set DB_HOST accordingly." >&2
fi

attempt=0
until pnpm run prisma:deploy; do
  attempt=$((attempt + 1))
  if [ "${attempt}" -ge "${MAX_ATTEMPTS}" ]; then
    echo "[entrypoint] PostgreSQL unreachable after ${attempt} attempts. Aborting." >&2
    exit 1
  fi
  echo "[entrypoint] Database not ready (attempt ${attempt}/${MAX_ATTEMPTS}), retrying in ${RETRY_DELAY}s..." >&2
  sleep "${RETRY_DELAY}"
done

echo "[entrypoint] Migrations applied. Starting bot..."
exec node dist/index.js
