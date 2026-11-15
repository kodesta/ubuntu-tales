#!/usr/bin/env bash
# Runs the production API from the built workspace with the deployment environment.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/api"
set -a
# shellcheck disable=SC1091
. "$ROOT/deploy/.env.production"
set +a
exec node dist/main.js
