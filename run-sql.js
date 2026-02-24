require('dotenv').config();
const postgres = require('postgres');
const fs = require('fs');

async function run() {
    const sql = postgres(process.env.DATABASE_URL);

    try {
        // 1. Check existing tables
        console.log("Fetching tables...");
        const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
        console.log("Tables:", tables.map(t => t.table_name));

        const hasAsset = tables.some(t => t.table_name === 'ASSET');

        if (!hasAsset) {
            console.log("ASSET table not found. Applying migration...");
            const migrationSql = fs.readFileSync('drizzle/0002_create_assets_table.sql', 'utf8');

            // Execute raw queries by splitting on statement-breakpoint or semicolons
            const statements = migrationSql.split('--> statement-breakpoint').map(s => s.trim()).filter(s => s.length > 0);

            for (const stmt of statements) {
                console.log("Executing:", stmt.substring(0, 50) + "...");
                await sql.unsafe(stmt);
            }
            console.log("Migration applied successfully!");

            const newTables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
            console.log("New Tables:", newTables.map(t => t.table_name));
        } else {
            console.log("ASSET table already exists.");
        }
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await sql.end();
    }
}

run();
