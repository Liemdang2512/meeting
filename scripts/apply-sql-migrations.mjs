#!/usr/bin/env node
/**
 * Apply db/migrations/*.sql in lexical order against DATABASE_URL.
 * Idempotent migrations (IF NOT EXISTS, etc.) can be re-run safely.
 *
 * Local (uses .env.local):
 *   npm run db:migrate
 *
 * Railway CLI (inject DATABASE_URL from linked service, no local secrets):
 *   npx @railway/cli login
 *   npx @railway/cli link
 *   npx @railway/cli run -- npm run db:migrate:railway
 *
 * Single file:
 *   node --env-file=.env.local scripts/apply-sql-migrations.mjs db/migrations/017_email_verification_and_google_oauth.sql
 */
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const url = process.env.DATABASE_URL;
if (!url || url.includes('<')) {
  console.error('Missing or placeholder DATABASE_URL. Set it in .env.local or use `railway run`.');
  process.exit(1);
}

function sslOption() {
  if (process.env.DB_SSL === 'false') return false;
  const u = url.toLowerCase();
  if (u.includes('localhost') || u.includes('127.0.0.1')) return false;
  // Railway / managed Postgres
  return { rejectUnauthorized: false };
}

const sql = postgres(url, { ssl: sslOption(), max: 1 });

const arg = process.argv[2];
const files = arg
  ? [path.resolve(process.cwd(), arg)]
  : fs
      .readdirSync(path.join(root, 'db/migrations'))
      .filter((f) => f.endsWith('.sql'))
      .sort()
      .map((f) => path.join(root, 'db/migrations', f));

try {
  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.error('File not found:', file);
      process.exit(1);
    }
    console.log('Applying', path.relative(root, file), '...');
    await sql.file(file);
  }
  console.log('Migrations finished OK.');
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
