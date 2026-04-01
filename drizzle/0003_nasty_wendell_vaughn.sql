CREATE TYPE "public"."analytics_event_type" AS ENUM('SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."audit_cycle_status" AS ENUM('Planned', 'In Progress', 'Completed');--> statement-breakpoint
CREATE TYPE "public"."audit_result" AS ENUM('Verified', 'Missing', 'Damaged', 'Unclear');--> statement-breakpoint
CREATE TYPE "public"."campaign_category" AS ENUM('PROMOTIONAL', 'TRANSACTIONAL', 'NEWSLETTER');--> statement-breakpoint
CREATE TYPE "public"."campaign_channel" AS ENUM('EMAIL', 'SMS', 'WHATSAPP');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'SCHEDULED', 'SENDING', 'COMPLETED', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."groupType" AS ENUM('static', 'dynamic');--> statement-breakpoint
CREATE TYPE "public"."ruleOperator" AS ENUM('equals', 'contains', 'starts_with', 'not_equals');--> statement-breakpoint
CREATE TYPE "public"."template_status" AS ENUM('Draft', 'Published');--> statement-breakpoint
CREATE TYPE "public"."template_type" AS ENUM('Email', 'SMS', 'WhatsApp');--> statement-breakpoint
CREATE TABLE "ASSET_ACTIVITY" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"desc" text NOT NULL,
	"icon" text NOT NULL,
	"color" text NOT NULL,
	"roles" jsonb NOT NULL,
	"targetUserId" uuid,
	"assetId" text,
	"hasCTA" boolean DEFAULT false,
	"isRead" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AUDIT_CYCLE_AUDITOR" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cycleId" uuid NOT NULL,
	"userId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AUDIT_CYCLE" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"displayId" text NOT NULL,
	"name" text NOT NULL,
	"startDate" text NOT NULL,
	"endDate" text NOT NULL,
	"status" "audit_cycle_status" DEFAULT 'In Progress' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AUDIT_VERIFICATION" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cycleId" uuid NOT NULL,
	"assetId" text NOT NULL,
	"userId" uuid NOT NULL,
	"result" "audit_result" NOT NULL,
	"notes" text,
	"verifiedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CAMPAIGN_ANALYTICS" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaignId" uuid NOT NULL,
	"contactId" uuid,
	"eventType" "analytics_event_type" NOT NULL,
	"metadata" jsonb,
	"occurredAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CAMPAIGN_RECIPIENT" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaignId" uuid NOT NULL,
	"groupId" uuid NOT NULL,
	"isExcluded" text DEFAULT 'false' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CAMPAIGN" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"creatorId" uuid NOT NULL,
	"approverId" uuid,
	"name" text NOT NULL,
	"channel" "campaign_channel" NOT NULL,
	"status" "campaign_status" DEFAULT 'DRAFT' NOT NULL,
	"category" "campaign_category" NOT NULL,
	"content" jsonb NOT NULL,
	"scheduledAt" timestamp,
	"throttleRate" integer,
	"cycleConfig" jsonb,
	"anniversaryConfig" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "GROUP_MEMBER" (
	"groupId" uuid NOT NULL,
	"customerId" uuid NOT NULL,
	CONSTRAINT "GROUP_MEMBER_groupId_customerId_pk" PRIMARY KEY("groupId","customerId")
);
--> statement-breakpoint
CREATE TABLE "GROUP_RULE" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"groupId" uuid NOT NULL,
	"field" text NOT NULL,
	"operator" "ruleOperator" NOT NULL,
	"value" text NOT NULL,
	"logicGate" text DEFAULT 'AND' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CONTACT_GROUP" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "groupType" NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TEMPLATE" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ownerId" uuid NOT NULL,
	"title" text NOT NULL,
	"type" "template_type" NOT NULL,
	"status" "template_status" DEFAULT 'Draft' NOT NULL,
	"category" text,
	"tags" text[],
	"subject" text,
	"content" text NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "BULK_CUSTOMER" ADD COLUMN "customFields" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "ASSET_ACTIVITY" ADD CONSTRAINT "ASSET_ACTIVITY_targetUserId_HRIS_USER_id_fk" FOREIGN KEY ("targetUserId") REFERENCES "public"."HRIS_USER"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ASSET_ACTIVITY" ADD CONSTRAINT "ASSET_ACTIVITY_assetId_ASSET_id_fk" FOREIGN KEY ("assetId") REFERENCES "public"."ASSET"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AUDIT_CYCLE_AUDITOR" ADD CONSTRAINT "AUDIT_CYCLE_AUDITOR_cycleId_AUDIT_CYCLE_id_fk" FOREIGN KEY ("cycleId") REFERENCES "public"."AUDIT_CYCLE"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AUDIT_CYCLE_AUDITOR" ADD CONSTRAINT "AUDIT_CYCLE_AUDITOR_userId_HRIS_USER_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."HRIS_USER"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AUDIT_VERIFICATION" ADD CONSTRAINT "AUDIT_VERIFICATION_cycleId_AUDIT_CYCLE_id_fk" FOREIGN KEY ("cycleId") REFERENCES "public"."AUDIT_CYCLE"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AUDIT_VERIFICATION" ADD CONSTRAINT "AUDIT_VERIFICATION_assetId_ASSET_id_fk" FOREIGN KEY ("assetId") REFERENCES "public"."ASSET"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AUDIT_VERIFICATION" ADD CONSTRAINT "AUDIT_VERIFICATION_userId_HRIS_USER_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."HRIS_USER"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CAMPAIGN_ANALYTICS" ADD CONSTRAINT "CAMPAIGN_ANALYTICS_campaignId_CAMPAIGN_id_fk" FOREIGN KEY ("campaignId") REFERENCES "public"."CAMPAIGN"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CAMPAIGN_ANALYTICS" ADD CONSTRAINT "CAMPAIGN_ANALYTICS_contactId_BULK_CUSTOMER_id_fk" FOREIGN KEY ("contactId") REFERENCES "public"."BULK_CUSTOMER"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CAMPAIGN_RECIPIENT" ADD CONSTRAINT "CAMPAIGN_RECIPIENT_campaignId_CAMPAIGN_id_fk" FOREIGN KEY ("campaignId") REFERENCES "public"."CAMPAIGN"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CAMPAIGN_RECIPIENT" ADD CONSTRAINT "CAMPAIGN_RECIPIENT_groupId_CONTACT_GROUP_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."CONTACT_GROUP"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CAMPAIGN" ADD CONSTRAINT "CAMPAIGN_workspaceId_WORKSPACE_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."WORKSPACE"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CAMPAIGN" ADD CONSTRAINT "CAMPAIGN_creatorId_HRIS_USER_id_fk" FOREIGN KEY ("creatorId") REFERENCES "public"."HRIS_USER"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CAMPAIGN" ADD CONSTRAINT "CAMPAIGN_approverId_HRIS_USER_id_fk" FOREIGN KEY ("approverId") REFERENCES "public"."HRIS_USER"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "GROUP_MEMBER" ADD CONSTRAINT "GROUP_MEMBER_groupId_CONTACT_GROUP_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."CONTACT_GROUP"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "GROUP_MEMBER" ADD CONSTRAINT "GROUP_MEMBER_customerId_BULK_CUSTOMER_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."BULK_CUSTOMER"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "GROUP_RULE" ADD CONSTRAINT "GROUP_RULE_groupId_CONTACT_GROUP_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."CONTACT_GROUP"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CONTACT_GROUP" ADD CONSTRAINT "CONTACT_GROUP_workspaceId_WORKSPACE_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."WORKSPACE"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TEMPLATE" ADD CONSTRAINT "TEMPLATE_ownerId_HRIS_USER_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."HRIS_USER"("id") ON DELETE cascade ON UPDATE no action;