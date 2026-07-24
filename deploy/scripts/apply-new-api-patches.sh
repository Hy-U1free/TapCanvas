#!/bin/sh
set -eu

: "${NEW_API_PATCH_DB_HOST:?NEW_API_PATCH_DB_HOST is required}"
: "${NEW_API_PATCH_DB_PORT:?NEW_API_PATCH_DB_PORT is required}"
: "${NEW_API_PATCH_DB_NAME:?NEW_API_PATCH_DB_NAME is required}"
: "${NEW_API_PATCH_DB_USER:?NEW_API_PATCH_DB_USER is required}"
: "${PGPASSWORD:?PGPASSWORD is required}"

if [ "${NEW_API_PATCH_ENABLED:-1}" != "1" ]; then
  echo "new-api patch disabled"
  exit 0
fi

if [ "$(psql \
  -h "$NEW_API_PATCH_DB_HOST" \
  -p "$NEW_API_PATCH_DB_PORT" \
  -U "$NEW_API_PATCH_DB_USER" \
  -d postgres \
  -tAc "SELECT 1 FROM pg_database WHERE datname = '$NEW_API_PATCH_DB_NAME'")" != "1" ]; then
  createdb \
    -h "$NEW_API_PATCH_DB_HOST" \
    -p "$NEW_API_PATCH_DB_PORT" \
    -U "$NEW_API_PATCH_DB_USER" \
    "$NEW_API_PATCH_DB_NAME"
fi

psql \
  -h "$NEW_API_PATCH_DB_HOST" \
  -p "$NEW_API_PATCH_DB_PORT" \
  -U "$NEW_API_PATCH_DB_USER" \
  -d "$NEW_API_PATCH_DB_NAME" \
  -v ON_ERROR_STOP=1 \
  -c "CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW());"

found_patch=0
for patch in $(find /patches -type f -name '*.sql' | sort); do
  found_patch=1
  relative_path=${patch#/patches/}
  applied=$(psql \
    -h "$NEW_API_PATCH_DB_HOST" \
    -p "$NEW_API_PATCH_DB_PORT" \
    -U "$NEW_API_PATCH_DB_USER" \
    -d "$NEW_API_PATCH_DB_NAME" \
    -tAc "SELECT COUNT(1) FROM schema_migrations WHERE filename = '$relative_path'")

  if [ "$applied" = "1" ]; then
    echo "skip applied patch: $relative_path"
    continue
  fi

  echo "apply new-api patch: $relative_path"
  psql \
    -h "$NEW_API_PATCH_DB_HOST" \
    -p "$NEW_API_PATCH_DB_PORT" \
    -U "$NEW_API_PATCH_DB_USER" \
    -d "$NEW_API_PATCH_DB_NAME" \
    -v ON_ERROR_STOP=1 \
    -f "$patch"
  psql \
    -h "$NEW_API_PATCH_DB_HOST" \
    -p "$NEW_API_PATCH_DB_PORT" \
    -U "$NEW_API_PATCH_DB_USER" \
    -d "$NEW_API_PATCH_DB_NAME" \
    -v ON_ERROR_STOP=1 \
    -c "INSERT INTO schema_migrations (filename) VALUES ('$relative_path') ON CONFLICT DO NOTHING;"
done

if [ "$found_patch" = "0" ]; then
  echo "no new-api patch files found under /patches" >&2
  exit 1
fi

echo "new-api patches applied"
