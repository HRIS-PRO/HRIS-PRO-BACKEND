import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config();

const pushCampaignsSchema = async () => {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is missing");
    }

    const sql = postgres(process.env.DATABASE_URL, { max: 1 });

    try {
        console.log("Creating campaign enums...");
        await sql`
            DO $$ BEGIN
                CREATE TYPE "public"."campaign_channel" AS ENUM('EMAIL', 'SMS', 'WHATSAPP');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `;

        await sql`
            DO $$ BEGIN
                CREATE TYPE "public"."campaign_status" AS ENUM('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'SCHEDULED', 'SENDING', 'COMPLETED', 'FAILED', 'CANCELLED');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `;

        await sql`
            DO $$ BEGIN
                CREATE TYPE "public"."campaign_category" AS ENUM('PROMOTIONAL', 'TRANSACTIONAL', 'NEWSLETTER');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `;

        await sql`
            DO $$ BEGIN
                CREATE TYPE "public"."analytics_event_type" AS ENUM('SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'FAILED');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `;

        console.log("Creating CAMPAIGN table...");
        await sql`
            CREATE TABLE IF NOT EXISTS "CAMPAIGN" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                "workspaceId" uuid NOT NULL,
                "creatorId" uuid NOT NULL,
                "approverId" uuid,
                "name" text NOT NULL,
                "channel" "public"."campaign_channel" NOT NULL,
                "status" "public"."campaign_status" DEFAULT 'DRAFT' NOT NULL,
                "category" "public"."campaign_category" NOT NULL,
                "content" jsonb NOT NULL,
                "scheduledAt" timestamp,
                "throttleRate" integer,
                "createdAt" timestamp DEFAULT now() NOT NULL,
                "updatedAt" timestamp DEFAULT now() NOT NULL
            );
        `;

        console.log("Creating CAMPAIGN_RECIPIENT table...");
        await sql`
            CREATE TABLE IF NOT EXISTS "CAMPAIGN_RECIPIENT" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                "campaignId" uuid NOT NULL,
                "groupId" uuid NOT NULL,
                "isExcluded" text DEFAULT 'false' NOT NULL
            );
        `;

        console.log("Creating CAMPAIGN_ANALYTICS table...");
        await sql`
            CREATE TABLE IF NOT EXISTS "CAMPAIGN_ANALYTICS" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                "campaignId" uuid NOT NULL,
                "contactId" uuid,
                "eventType" "public"."analytics_event_type" NOT NULL,
                "metadata" jsonb,
                "occurredAt" timestamp DEFAULT now() NOT NULL
            );
        `;

        console.log("Adding Foreign Keys...");
        await sql`
            DO $$ BEGIN
                ALTER TABLE "CAMPAIGN" ADD CONSTRAINT "CAMPAIGN_workspaceId_WORKSPACE_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."WORKSPACE"("id") ON DELETE cascade;
            EXCEPTION WHEN duplicate_object THEN null; END $$;
        `;
        await sql`
            DO $$ BEGIN
                ALTER TABLE "CAMPAIGN" ADD CONSTRAINT "CAMPAIGN_creatorId_HRIS_USER_id_fk" FOREIGN KEY ("creatorId") REFERENCES "public"."HRIS_USER"("id");
            EXCEPTION WHEN duplicate_object THEN null; END $$;
        `;
        await sql`
            DO $$ BEGIN
                ALTER TABLE "CAMPAIGN" ADD CONSTRAINT "CAMPAIGN_approverId_HRIS_USER_id_fk" FOREIGN KEY ("approverId") REFERENCES "public"."HRIS_USER"("id");
            EXCEPTION WHEN duplicate_object THEN null; END $$;
        `;
        await sql`
            DO $$ BEGIN
                ALTER TABLE "CAMPAIGN_RECIPIENT" ADD CONSTRAINT "CAMPAIGN_RECIPIENT_campaignId_CAMPAIGN_id_fk" FOREIGN KEY ("campaignId") REFERENCES "public"."CAMPAIGN"("id") ON DELETE cascade;
            EXCEPTION WHEN duplicate_object THEN null; END $$;
        `;
        await sql`
            DO $$ BEGIN
                ALTER TABLE "CAMPAIGN_RECIPIENT" ADD CONSTRAINT "CAMPAIGN_RECIPIENT_groupId_CONTACT_GROUP_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."CONTACT_GROUP"("id") ON DELETE cascade;
            EXCEPTION WHEN duplicate_object THEN null; END $$;
        `;
        await sql`
            DO $$ BEGIN
                ALTER TABLE "CAMPAIGN_ANALYTICS" ADD CONSTRAINT "CAMPAIGN_ANALYTICS_campaignId_CAMPAIGN_id_fk" FOREIGN KEY ("campaignId") REFERENCES "public"."CAMPAIGN"("id") ON DELETE cascade;
            EXCEPTION WHEN duplicate_object THEN null; END $$;
        `;
        await sql`
            DO $$ BEGIN
                ALTER TABLE "CAMPAIGN_ANALYTICS" ADD CONSTRAINT "CAMPAIGN_ANALYTICS_contactId_BULK_CUSTOMER_id_fk" FOREIGN KEY ("contactId") REFERENCES "public"."BULK_CUSTOMER"("id") ON DELETE set null;
            EXCEPTION WHEN duplicate_object THEN null; END $$;
        `;

        console.log("Campaigns Schema pushed successfully!");
    } catch (err) {
        console.error("Error setting up campaigns schema:", err);
    } finally {
        await sql.end();
        process.exit(0);
    }
};

pushCampaignsSchema().catch((err) => {
    console.error("Failed to push campaigns schema:", err);
    process.exit(1);
});
