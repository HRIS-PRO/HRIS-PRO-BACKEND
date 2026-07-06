import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config();

const pushOrgSettingsSchema = async () => {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is missing");
    }

    const sql = postgres(process.env.DATABASE_URL, { max: 1 });

    try {
        console.log("Creating ORG_SETTINGS table...");
        await sql`
            CREATE TABLE IF NOT EXISTS "ORG_SETTINGS" (
                "id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
                "orgName" text DEFAULT 'AssetTrackPro Enterprise' NOT NULL,
                "contactEmail" text DEFAULT 'admin@assettrack.pro' NOT NULL,
                "theme" text DEFAULT 'default' NOT NULL,
                "updatedById" uuid,
                "createdAt" timestamp DEFAULT now() NOT NULL,
                "updatedAt" timestamp DEFAULT now() NOT NULL
            );
        `;

        console.log("Adding FOREIGN KEY to ORG_SETTINGS...");
        await sql`
            DO $$ BEGIN
                ALTER TABLE "ORG_SETTINGS" ADD CONSTRAINT "ORG_SETTINGS_updatedById_HRIS_USER_id_fk" FOREIGN KEY ("updatedById") REFERENCES "public"."HRIS_USER"("id") ON DELETE set null ON UPDATE no action;
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `;

        console.log("Seeding singleton settings row...");
        await sql`
            INSERT INTO "ORG_SETTINGS" ("id") VALUES ('singleton')
            ON CONFLICT ("id") DO NOTHING;
        `;

        console.log("Org Settings schema pushed successfully!");
    } catch (err) {
        console.error("Error setting up org settings schema:", err);
    } finally {
        await sql.end();
        process.exit(0);
    }
};

pushOrgSettingsSchema().catch((err) => {
    console.error("Failed to push org settings schema:", err);
    process.exit(1);
});
