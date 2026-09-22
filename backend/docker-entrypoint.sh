#!/bin/sh
# Apply migrations, optionally seed QA users, then start the API.
set -eu

echo "[backend] prisma migrate deploy..."
./node_modules/.bin/prisma migrate deploy

if [ "${RUN_SEED:-true}" = "true" ]; then
  echo "[backend] prisma seed..."
  ./node_modules/.bin/tsx prisma/seed.ts
fi

echo "[backend] starting API on :${PORT:-4000}"
exec node dist/server.js
