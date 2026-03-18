import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function pushActivitySchema() {
    console.log("Starting Activity schema migration...");

    try {
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "ASSET_ACTIVITY" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "type" text NOT NULL,
                "title" text NOT NULL,
                "desc" text NOT NULL,
                "icon" text NOT NULL,
                "color" text NOT NULL,
                "roles" jsonb NOT NULL,
                "targetUserId" uuid REFERENCES "HRIS_USER"("id") ON DELETE SET NULL,
                "assetId" text REFERENCES "ASSET"("id") ON DELETE CASCADE,
                "hasCTA" boolean DEFAULT false,
                "isRead" boolean DEFAULT false,
                "createdAt" timestamp DEFAULT now() NOT NULL
            );
        `);
        console.log("Table 'ASSET_ACTIVITY' created or exists.");
        
        console.log("✅ Activity schema has been successfully pushed to the database!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Failed to push Activity schema:", error);
        process.exit(1);
    }
}

pushActivitySchema();
