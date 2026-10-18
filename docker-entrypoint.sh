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

HOST="${DB_HOST:-}"
PORT="${DB_PORT:-}"

if [ -z "${HOST}" ] || [ -z "${PORT}" ]; then
  if [ -n "${DATABASE_URL:-}" ]; then
    PARSED="$(node -e '
      try {
        const u = new URL(process.env.DATABASE_URL);
        console.log((u.hostname || "db") + " " + (u.port || "5432"));
      } catch {
        console.log("db 5432");
      }
    ')"
    HOST="${HOST:-$(echo "${PARSED}" | cut -d' ' -f1)}"
    PORT="${PORT:-$(echo "${PARSED}" | cut -d' ' -f2)}"
  else
    HOST="${HOST:-db}"
    PORT="${PORT:-5432}"
  fi
fi

MAX_ATTEMPTS="${DB_MAX_ATTEMPTS:-40}"
RETRY_DELAY="${DB_RETRY_DELAY:-3}"

echo "[entrypoint] Target PostgreSQL: ${HOST}:${PORT}"

DB_TARGET_HOST="${HOST}" DB_TARGET_PORT="${PORT}" DB_MAX_ATTEMPTS="${MAX_ATTEMPTS}" DB_RETRY_DELAY="${RETRY_DELAY}" node -e "
const net = require('node:net');
const dns = require('node:dns/promises');

(async () => {
  const host = process.env.DB_TARGET_HOST || 'db';
  const port = Number(process.env.DB_TARGET_PORT || 5432);
  const maxAttempts = Number(process.env.DB_MAX_ATTEMPTS || 40);
  const delayMs = Number(process.env.DB_RETRY_DELAY || 3) * 1000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const lookup = await dns.lookup(host);
      await new Promise((resolve, reject) => {
        const s = net.connect(port, lookup.address, () => {
          s.end();
          resolve();
        });
        s.on('error', reject);
        s.setTimeout(3000, () => s.destroy(new Error('ETIMEDOUT')));
      });
      console.log(\`[entrypoint] Connected successfully to \${host}:\${port} (\${lookup.address})\`);
      process.exit(0);
    } catch (err) {
      console.log(\`[entrypoint] Waiting for \${host}:\${port} (attempt \${attempt}/\${maxAttempts}): \${err.code || err.message}\`);
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  console.error(\`[entrypoint] ERROR: Could not connect to \${host}:\${port} after \${maxAttempts} attempts.\`);
  process.exit(1);
})();
"

echo "[entrypoint] Applying Prisma migrations..."
pnpm run prisma:deploy

echo "[entrypoint] Migrations applied. Starting bot..."
exec node dist/index.js

