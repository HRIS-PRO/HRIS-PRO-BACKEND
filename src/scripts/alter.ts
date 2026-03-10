import { Client } from 'pg';

async function run() {
    const client = new Client({ connectionString: 'postgresql://postgres.noltfinance:noltfinance123$@3.71.38.119:5432/postgres?sslmode=disable' });
    await client.connect();
    await client.query('ALTER TABLE "WORKSPACE" ADD COLUMN IF NOT EXISTS "logoUrl" text;');
    console.log('Added logoUrl column to WORKSPACE');
    await client.end();
}

run().catch(console.error);
