import postgres from 'postgres';

const ssl = process.env.DATABASE_URL?.includes('sslmode=disable') ? false : { rejectUnauthorized: false };
const sql = process.env.DATABASE_URL
  ? postgres(process.env.DATABASE_URL, { ssl })
  : postgres({
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5433),
      database: process.env.DB_NAME ?? 'meeting_test',
      username: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASS ?? 'postgres',
    });

export default sql;
