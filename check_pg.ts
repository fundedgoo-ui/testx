import 'dotenv/config';
import pg from 'pg';

async function check() {
  const dbUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
  const pool = new pg.Pool({ connectionString: dbUrl });
  try {
    const res = await pool.query("SELECT * FROM sql_positions WHERE details IS NOT NULL LIMIT 5");
    console.log(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
check();
