#!/usr/bin/env bash
# Gives the end-to-end tests a fresh local database: stops local Supabase and
# deletes its data, starts it again, then runs every file in
# supabase/migrations in name order. Run it once, and again after adding a
# migration.
#
# Everything here is local. No command takes --remote, so it can't reach
# production. The Supabase CLI can't run the migrations itself, because two
# pairs of files share a number (009 and 015), so psql runs them inside the
# database container.
set -euo pipefail
cd "$(dirname "$0")/.."

# Nothing to stop the first time, as on a fresh GitHub Actions runner.
supabase stop --no-backup || true

# The tests don't use Studio, so it stays off to save memory. Storage takes
# longer to start than the CLI waits for, so this script waits for it instead.
supabase start --exclude studio,postgres-meta --ignore-health-check

echo "Waiting for storage"
status=""
for _ in $(seq 1 60); do
  status=$(docker inspect --format '{{.State.Health.Status}}' supabase_storage_regibee 2>/dev/null || true)
  [ "$status" = healthy ] && break
  sleep 3
done
if [ "$status" != healthy ]; then
  echo "Storage didn't start. See: docker logs supabase_storage_regibee" >&2
  exit 1
fi

for file in supabase/migrations/*.sql; do
  echo "Running $file"
  docker exec -i supabase_db_regibee psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q < "$file"
done

echo "The local database is ready. Its inbox is at http://127.0.0.1:54324"
