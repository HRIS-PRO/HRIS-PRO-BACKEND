CREATE TYPE "public"."workspace_status" AS ENUM('ACTIVE', 'MAINTENANCE', 'SUSPENDED');--> statement-breakpoint
ALTER TYPE "public"."app_type" ADD VALUE 'MSGSCALE_BULK';--> statement-breakpoint
CREATE TABLE "BULK_CUSTOMER" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customerType" text,
	"customerExternalId" text,
	"title" text,
	"surname" text,
	"firstName" text,
	"otherName" text,
	"dob" text,
	"gender" text,
	"residentialState" text,
	"mobilePhone" text,
	"email" text,
	"externalCreatedAt" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "WORKSPACE_MEMBER" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"joinedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "WORKSPACE" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"status" "workspace_status" DEFAULT 'ACTIVE' NOT NULL,
	"ownerId" uuid NOT NULL,
	"logoUrl" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "WORKSPACE_MEMBER" ADD CONSTRAINT "WORKSPACE_MEMBER_workspaceId_WORKSPACE_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."WORKSPACE"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "WORKSPACE_MEMBER" ADD CONSTRAINT "WORKSPACE_MEMBER_userId_HRIS_USER_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."HRIS_USER"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "WORKSPACE" ADD CONSTRAINT "WORKSPACE_ownerId_HRIS_USER_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."HRIS_USER"("id") ON DELETE no action ON UPDATE no action;