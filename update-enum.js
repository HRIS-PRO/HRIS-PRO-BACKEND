const postgres = require('postgres');
require('dotenv').config();

async function run() {
  const sql = postgres(process.env.DATABASE_URL);
  try {
    await sql`ALTER TYPE app_type ADD VALUE IF NOT EXISTS 'MSGSCALE_BULK';`;
    console.log("Successfully added MSGSCALE_BULK to app_type");
  } catch (err) {
    console.error("Error updating enum:", err.message);
  } finally {
    await sql.end();
  }
}
run();
