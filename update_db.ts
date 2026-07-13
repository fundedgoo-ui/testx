import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(`
  ALTER TABLE sql_users 
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS avatar TEXT,
  ADD COLUMN IF NOT EXISTS real_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS fiscal_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS birth_date VARCHAR(50),
  ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Global';
`).then(() => {
  console.log("DB updated successfully");
  process.exit(0);
}).catch(e => {
  console.error("DB update failed:", e);
  process.exit(1);
});
