#!/bin/sh
set -eu

prepare_writable_directory() {
  directory=$1
  mkdir -p "$directory"
  chown -R node:node "$directory"
}

prepare_writable_directory /app/project-data
prepare_writable_directory /app/backups

exec runuser -u node -- node dist/main.js
