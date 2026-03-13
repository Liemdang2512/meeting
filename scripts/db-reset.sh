#!/usr/bin/env bash
# Reset the test database: drop all objects and recreate from schema.sql
# Usage: bash scripts/db-reset.sh
# Requires: Docker container meeting_postgres_test running (npm run db:up first)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

DB_URL="${TEST_DATABASE_URL:-postgres://postgres:postgres@localhost:5433/meeting_test}"

echo "Resetting test database at $DB_URL ..."
psql "$DB_URL" -f "$PROJECT_ROOT/db/reset.sql"
echo "Applying schema..."
psql "$DB_URL" -f "$PROJECT_ROOT/db/schema.sql"
echo "Database reset complete."
