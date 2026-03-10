import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config();

const pushTemplatesSchema = async () => {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is missing");
    }

    const sql = postgres(process.env.DATABASE_URL, { max: 1 });

    try {
        console.log("Creating template enums...");
        await sql`
            DO $$ BEGIN
                CREATE TYPE "public"."template_type" AS ENUM('Email', 'SMS', 'WhatsApp');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `;

        await sql`
            DO $$ BEGIN
                CREATE TYPE "public"."template_status" AS ENUM('Draft', 'Published');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `;

        console.log("Creating TEMPLATE table...");
        await sql`
            CREATE TABLE IF NOT EXISTS "TEMPLATE" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                "ownerId" uuid NOT NULL,
                "title" text NOT NULL,
                "type" "public"."template_type" NOT NULL,
                "status" "public"."template_status" DEFAULT 'Draft' NOT NULL,
                "category" text,
                "tags" text[],
                "subject" text,
                "content" text NOT NULL,
                "metadata" jsonb,
                "createdAt" timestamp DEFAULT now() NOT NULL,
                "updatedAt" timestamp DEFAULT now() NOT NULL
            );
        `;

        console.log("Adding FOREIGN KEY to TEMPLATE...");
        await sql`
            DO $$ BEGIN
                ALTER TABLE "TEMPLATE" ADD CONSTRAINT "TEMPLATE_ownerId_HRIS_USER_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."HRIS_USER"("id") ON DELETE cascade ON UPDATE no action;
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `;

        console.log("Templates Schema pushed successfully!");
    } catch (err) {
        console.error("Error setting up templates schema:", err);
    } finally {
        await sql.end();
        process.exit(0);
    }
};

pushTemplatesSchema().catch((err) => {
    console.error("Failed to push templates schema:", err);
    process.exit(1);
});
