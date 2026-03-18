import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function fixAssetId() {
    try {
        console.log("Fixing AUDIT_VERIFICATION table assetId column...");
        await db.execute(sql`
            DROP TABLE IF EXISTS "AUDIT_VERIFICATION" CASCADE;
            
            CREATE TABLE "AUDIT_VERIFICATION" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "cycleId" uuid NOT NULL REFERENCES "AUDIT_CYCLE"("id") ON DELETE CASCADE,
                "assetId" text NOT NULL REFERENCES "ASSET"("id") ON DELETE CASCADE,
                "userId" uuid NOT NULL REFERENCES "HRIS_USER"("id"),
                "result" audit_result NOT NULL,
                "notes" text,
                "verifiedAt" timestamp DEFAULT now() NOT NULL
            );
        `);
        console.log("Fixed!");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
fixAssetId();
