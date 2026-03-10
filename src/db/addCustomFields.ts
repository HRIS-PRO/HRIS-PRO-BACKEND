import { config } from 'dotenv';
import postgres from 'postgres';
import { resolve } from 'path';

// Load environment variables from specific path
config({ path: resolve(__dirname, '../../.env') });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error('DATABASE_URL is missing. Please set it in .env');
    process.exit(1);
}

const sql = postgres(dbUrl, { max: 1 });

async function main() {
    try {
        console.log('Adding custom_fields to BULK_CUSTOMER table...');

        const query = `
      ALTER TABLE "BULK_CUSTOMER" ADD COLUMN IF NOT EXISTS "customFields" jsonb DEFAULT '{}';
    `;

        await sql.unsafe(query);
        console.log('✅ Column customFields created successfully.');

    } catch (error) {
        console.error('❌ Error executing SQL:', error);
    } finally {
        await sql.end();
        console.log('Done.');
    }
}

main();
