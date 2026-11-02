#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p backups/db
stamp="$(date +%F)"
docker compose exec -T db pg_dump -U socialdesk -d socialdesk --clean --if-exists \
  | gzip > "backups/db/socialdesk-${stamp}.sql.gz"

find backups/db -name 'socialdesk-*.sql.gz' -mtime +30 -delete
echo "Wrote backups/db/socialdesk-${stamp}.sql.gz"
