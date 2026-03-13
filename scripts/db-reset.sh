#!/usr/bin/env bash
# Reset the test database: drop all objects and recreate from schema.sql
# Usage: bash scripts/db-reset.sh
# Requires: Docker container meeting_postgres_test running (npm run db:up first)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

CONTAINER="meeting_postgres_test"
DB_USER="postgres"
DB_NAME="meeting_test"

echo "Resetting test database (via docker exec $CONTAINER)..."
docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$PROJECT_ROOT/db/reset.sql"
echo "Applying schema..."
docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$PROJECT_ROOT/db/schema.sql"
echo "Database reset complete."
