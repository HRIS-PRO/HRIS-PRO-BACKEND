"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const postgres_1 = __importDefault(require("postgres"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const pushCampaignsSchema = async () => {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is missing");
    }
    const sql = (0, postgres_1.default)(process.env.DATABASE_URL, { max: 1 });
    try {
        console.log("Creating campaign enums...");
        await sql `
            DO $$ BEGIN
                CREATE TYPE "public"."campaign_channel" AS ENUM('EMAIL', 'SMS', 'WHATSAPP');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `;
        await sql `
            DO $$ BEGIN
                CREATE TYPE "public"."campaign_status" AS ENUM('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'SCHEDULED', 'SENDING', 'COMPLETED', 'FAILED', 'CANCELLED');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `;
        await sql `
            DO $$ BEGIN
                CREATE TYPE "public"."campaign_category" AS ENUM('PROMOTIONAL', 'TRANSACTIONAL', 'NEWSLETTER');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `;
        await sql `
            DO $$ BEGIN
                CREATE TYPE "public"."analytics_event_type" AS ENUM('SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'FAILED');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `;
        console.log("Creating CAMPAIGN table...");
        await sql `
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
                "cycleConfig" jsonb,
                "anniversaryConfig" jsonb,
                "createdAt" timestamp DEFAULT now() NOT NULL,
                "updatedAt" timestamp DEFAULT now() NOT NULL
            );
        `;
        console.log("Creating CAMPAIGN_RECIPIENT table...");
        await sql `
            CREATE TABLE IF NOT EXISTS "CAMPAIGN_RECIPIENT" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                "campaignId" uuid NOT NULL,
                "groupId" uuid NOT NULL,
                "isExcluded" text DEFAULT 'false' NOT NULL
            );
        `;
        console.log("Creating CAMPAIGN_ANALYTICS table...");
        await sql `
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
        await sql `
            DO $$ BEGIN
                ALTER TABLE "CAMPAIGN" ADD CONSTRAINT "CAMPAIGN_workspaceId_WORKSPACE_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."WORKSPACE"("id") ON DELETE cascade;
            EXCEPTION WHEN duplicate_object THEN null; END $$;
        `;
        await sql `
            DO $$ BEGIN
                ALTER TABLE "CAMPAIGN" ADD CONSTRAINT "CAMPAIGN_creatorId_HRIS_USER_id_fk" FOREIGN KEY ("creatorId") REFERENCES "public"."HRIS_USER"("id");
            EXCEPTION WHEN duplicate_object THEN null; END $$;
        `;
        await sql `
            DO $$ BEGIN
                ALTER TABLE "CAMPAIGN" ADD CONSTRAINT "CAMPAIGN_approverId_HRIS_USER_id_fk" FOREIGN KEY ("approverId") REFERENCES "public"."HRIS_USER"("id");
            EXCEPTION WHEN duplicate_object THEN null; END $$;
        `;
        await sql `
            DO $$ BEGIN
                ALTER TABLE "CAMPAIGN_RECIPIENT" ADD CONSTRAINT "CAMPAIGN_RECIPIENT_campaignId_CAMPAIGN_id_fk" FOREIGN KEY ("campaignId") REFERENCES "public"."CAMPAIGN"("id") ON DELETE cascade;
            EXCEPTION WHEN duplicate_object THEN null; END $$;
        `;
        await sql `
            DO $$ BEGIN
                ALTER TABLE "CAMPAIGN_RECIPIENT" ADD CONSTRAINT "CAMPAIGN_RECIPIENT_groupId_CONTACT_GROUP_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."CONTACT_GROUP"("id") ON DELETE cascade;
            EXCEPTION WHEN duplicate_object THEN null; END $$;
        `;
        await sql `
            DO $$ BEGIN
                ALTER TABLE "CAMPAIGN_ANALYTICS" ADD CONSTRAINT "CAMPAIGN_ANALYTICS_campaignId_CAMPAIGN_id_fk" FOREIGN KEY ("campaignId") REFERENCES "public"."CAMPAIGN"("id") ON DELETE cascade;
            EXCEPTION WHEN duplicate_object THEN null; END $$;
        `;
        await sql `
            DO $$ BEGIN
                ALTER TABLE "CAMPAIGN_ANALYTICS" ADD CONSTRAINT "CAMPAIGN_ANALYTICS_contactId_BULK_CUSTOMER_id_fk" FOREIGN KEY ("contactId") REFERENCES "public"."BULK_CUSTOMER"("id") ON DELETE set null;
            EXCEPTION WHEN duplicate_object THEN null; END $$;
        `;
        console.log("Campaigns Schema pushed successfully!");
    }
    catch (err) {
        console.error("Error setting up campaigns schema:", err);
    }
    finally {
        await sql.end();
        process.exit(0);
    }
};
pushCampaignsSchema().catch((err) => {
    console.error("Failed to push campaigns schema:", err);
    process.exit(1);
});
