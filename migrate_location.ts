import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config();

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
    try {
        await sql`CREATE TYPE "location_status" AS ENUM ('ACTIVE', 'INACTIVE');`;
        console.log("Created type location_status.");
    } catch (e: any) {
        console.log("Enum creation:", e.message);
    }

    try {
        await sql`
            CREATE TABLE IF NOT EXISTS "HRIS_LOCATION" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "name" text NOT NULL,
                "address" text,
                "status" "location_status" DEFAULT 'ACTIVE' NOT NULL,
                "createdAt" timestamp DEFAULT now() NOT NULL,
                "updatedAt" timestamp DEFAULT now() NOT NULL
            );
        `;
        console.log("Table HRIS_LOCATION created successfully!");
    } catch (e: any) {
        console.error("Table creation error:", e);
    }
    process.exit(0);
}

main();
