"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
async function run() {
    const client = new pg_1.Client({ connectionString: 'postgresql://postgres.noltfinance:noltfinance123$@3.71.38.119:5432/postgres?sslmode=disable' });
    await client.connect();
    await client.query('ALTER TABLE "WORKSPACE" ADD COLUMN IF NOT EXISTS "logoUrl" text;');
    console.log('Added logoUrl column to WORKSPACE');
    await client.end();
}
run().catch(console.error);
