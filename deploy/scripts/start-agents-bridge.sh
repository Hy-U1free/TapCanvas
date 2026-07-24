#!/bin/sh
set -eu

prepare_writable_directory() {
  directory=$1
  mkdir -p "$directory"
  chown -R node:node "$directory"
}

prepare_writable_directory /runtime/workspace/project-data
prepare_writable_directory /runtime/workspace/.agents

exec runuser -u node -- node /opt/tapcanvas/dist/cli/index.js serve --host 0.0.0.0 --port 8799 --body-limit 8000000
