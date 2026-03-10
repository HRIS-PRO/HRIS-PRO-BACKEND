import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config();

const pushGroupsSchema = async () => {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is missing");
    }

    const sql = postgres(process.env.DATABASE_URL, { max: 1 });

    try {
        console.log("Creating group enums...");
        await sql`
            DO $$ BEGIN
                CREATE TYPE "public"."groupType" AS ENUM('static', 'dynamic');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `;

        await sql`
            DO $$ BEGIN
                CREATE TYPE "public"."ruleOperator" AS ENUM('equals', 'contains', 'starts_with', 'not_equals');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `;

        console.log("Creating CONTACT_GROUP table...");
        await sql`
            CREATE TABLE IF NOT EXISTS "CONTACT_GROUP" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                "workspaceId" uuid NOT NULL,
                "name" text NOT NULL,
                "type" "public"."groupType" NOT NULL,
                "createdAt" timestamp DEFAULT now() NOT NULL,
                "updatedAt" timestamp DEFAULT now() NOT NULL
            );
        `;

        console.log("Adding FOREIGN KEY to CONTACT_GROUP...");
        await sql`
            DO $$ BEGIN
                ALTER TABLE "CONTACT_GROUP" ADD CONSTRAINT "CONTACT_GROUP_workspaceId_WORKSPACE_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."WORKSPACE"("id") ON DELETE cascade ON UPDATE no action;
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `;

        console.log("Creating GROUP_MEMBER table...");
        await sql`
            CREATE TABLE IF NOT EXISTS "GROUP_MEMBER" (
                "groupId" uuid NOT NULL,
                "customerId" uuid NOT NULL,
                CONSTRAINT "GROUP_MEMBER_groupId_customerId_pk" PRIMARY KEY("groupId","customerId")
            );
        `;

        console.log("Adding FOREIGN KEYs to GROUP_MEMBER...");
        await sql`
            DO $$ BEGIN
                ALTER TABLE "GROUP_MEMBER" ADD CONSTRAINT "GROUP_MEMBER_groupId_CONTACT_GROUP_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."CONTACT_GROUP"("id") ON DELETE cascade ON UPDATE no action;
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `;
        await sql`
            DO $$ BEGIN
                ALTER TABLE "GROUP_MEMBER" ADD CONSTRAINT "GROUP_MEMBER_customerId_BULK_CUSTOMER_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."BULK_CUSTOMER"("id") ON DELETE cascade ON UPDATE no action;
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `;

        console.log("Creating GROUP_RULE table...");
        await sql`
            CREATE TABLE IF NOT EXISTS "GROUP_RULE" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                "groupId" uuid NOT NULL,
                "field" text NOT NULL,
                "operator" "public"."ruleOperator" NOT NULL,
                "value" text NOT NULL
            );
        `;

        console.log("Adding FOREIGN KEY to GROUP_RULE...");
        await sql`
            DO $$ BEGIN
                ALTER TABLE "GROUP_RULE" ADD CONSTRAINT "GROUP_RULE_groupId_CONTACT_GROUP_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."CONTACT_GROUP"("id") ON DELETE cascade ON UPDATE no action;
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `;

        console.log("Groups Schema pushed successfully!");
    } catch (err) {
        console.error("Error setting up groups schema:", err);
    } finally {
        await sql.end();
        process.exit(0);
    }
};

pushGroupsSchema().catch((err) => {
    console.error("Failed to push groups schema:", err);
    process.exit(1);
});
