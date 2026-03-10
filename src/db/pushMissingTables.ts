import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config();

const pushMissingTables = async () => {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is missing");
    }

    const sql = postgres(process.env.DATABASE_URL, { max: 1 });

    try {
        console.log("Creating WORKSPACE table...");
        await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS "WORKSPACE" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "title" text NOT NULL,
        "status" "workspace_status" DEFAULT 'ACTIVE' NOT NULL,
        "ownerId" uuid NOT NULL,
        "logoUrl" text,
        "createdAt" timestamp DEFAULT now() NOT NULL,
        "updatedAt" timestamp DEFAULT now() NOT NULL
      );
    `);

        console.log("Creating WORKSPACE_MEMBER table...");
        await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS "WORKSPACE_MEMBER" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "workspaceId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "joinedAt" timestamp DEFAULT now() NOT NULL
      );
    `);

        console.log("Adding Constraints for WORKSPACE...");
        try {
            await sql.unsafe(`ALTER TABLE "WORKSPACE" ADD CONSTRAINT "WORKSPACE_ownerId_HRIS_USER_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."HRIS_USER"("id") ON DELETE no action ON UPDATE no action;`);
            await sql.unsafe(`ALTER TABLE "WORKSPACE_MEMBER" ADD CONSTRAINT "WORKSPACE_MEMBER_workspaceId_WORKSPACE_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."WORKSPACE"("id") ON DELETE no action ON UPDATE no action;`);
            await sql.unsafe(`ALTER TABLE "WORKSPACE_MEMBER" ADD CONSTRAINT "WORKSPACE_MEMBER_userId_HRIS_USER_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."HRIS_USER"("id") ON DELETE no action ON UPDATE no action;`);
        } catch (e: any) {
            console.log("Constraints likely already exist:", e.message);
        }

        console.log("Creating BULK_CUSTOMER table with 35 columns...");
        await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS "BULK_CUSTOMER" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "customerType" text,
        "customerExternalId" text,
        "title" text,
        "surname" text,
        "firstName" text,
        "otherName" text,
        "fullName" text,
        "dob" text,
        "gender" text,
        "nationality" text,
        "stateOfOrigin" text,
        "residentialState" text,
        "residentialTown" text,
        "address" text,
        "mobilePhone" text,
        "bvn" text,
        "nin" text,
        "email" text,
        "tin" text,
        "educationLevel" text,
        "occupation" text,
        "sector" text,
        "office" text,
        "officePhone" text,
        "officeAddress" text,
        "nextOfKin" text,
        "nextOfKinAddress" text,
        "nextOfKinPhone" text,
        "idCardType" text,
        "idCardNo" text,
        "idIssueDate" text,
        "idExpiryDate" text,
        "isPep" text,
        "pepDetails" text,
        "externalCreatedAt" text,
        "createdAt" timestamp DEFAULT now() NOT NULL,
        "updatedAt" timestamp DEFAULT now() NOT NULL
      );
    `);

        console.log("All missing tables verified/created successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Failed to execute raw SQL schema definitions:", err);
        process.exit(1);
    }
};

pushMissingTables();
