const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres" });
pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1', ['sql_users']).then(res => { console.log(res.rows); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });
