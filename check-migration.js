require('dotenv').config();
const { Pool } = require('pg');

async function check() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    const resUsers = await pool.query('SELECT count(*) FROM "HRIS_USER"');
    console.log('HRIS_USER count:', resUsers.rows[0].count);

    const resAssets = await pool.query('SELECT count(*) FROM "ASSET"');
    console.log('ASSET count:', resAssets.rows[0].count);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

check();
