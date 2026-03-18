import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function pushAuditSchema() {
    console.log("Starting Audit schema migration...");

    try {
        // Create Enums
        await db.execute(sql`
            DO $$ BEGIN
                CREATE TYPE audit_cycle_status AS ENUM ('Planned', 'In Progress', 'Completed');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);
        console.log("Enum 'audit_cycle_status' created or exists.");

        await db.execute(sql`
            DO $$ BEGIN
                CREATE TYPE audit_result AS ENUM ('Verified', 'Missing', 'Damaged', 'Unclear');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);
        console.log("Enum 'audit_result' created or exists.");

        // Create Tables
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "AUDIT_CYCLE" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "displayId" text NOT NULL,
                "name" text NOT NULL,
                "startDate" text NOT NULL,
                "endDate" text NOT NULL,
                "status" audit_cycle_status DEFAULT 'In Progress' NOT NULL,
                "createdAt" timestamp DEFAULT now() NOT NULL,
                "updatedAt" timestamp DEFAULT now() NOT NULL
            );
        `);
        console.log("Table 'AUDIT_CYCLE' created or exists.");

        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "AUDIT_CYCLE_AUDITOR" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "cycleId" uuid NOT NULL REFERENCES "AUDIT_CYCLE"("id") ON DELETE CASCADE,
                "userId" uuid NOT NULL REFERENCES "HRIS_USER"("id")
            );
        `);
        console.log("Table 'AUDIT_CYCLE_AUDITOR' created or exists.");

        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "AUDIT_VERIFICATION" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "cycleId" uuid NOT NULL REFERENCES "AUDIT_CYCLE"("id") ON DELETE CASCADE,
                "assetId" uuid NOT NULL REFERENCES "ASSET"("id") ON DELETE CASCADE,
                "userId" uuid NOT NULL REFERENCES "HRIS_USER"("id"),
                "result" audit_result NOT NULL,
                "notes" text,
                "verifiedAt" timestamp DEFAULT now() NOT NULL
            );
        `);
        console.log("Table 'AUDIT_VERIFICATION' created or exists.");

        console.log("✅ Audit schemas have been successfully pushed to the database!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Failed to push audit schemas:", error);
        process.exit(1);
    }
}

pushAuditSchema();
