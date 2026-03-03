CREATE TYPE "public"."report_status" AS ENUM('PENDING', 'IN_REVIEW', 'RESOLVED');--> statement-breakpoint
CREATE TABLE "ASSET_REPORT" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assetId" text NOT NULL,
	"userId" uuid NOT NULL,
	"comment" text NOT NULL,
	"status" "report_status" DEFAULT 'PENDING' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ASSET_CATEGORY" ADD COLUMN "managedById" uuid;--> statement-breakpoint
ALTER TABLE "ASSET_REPORT" ADD CONSTRAINT "ASSET_REPORT_assetId_ASSET_id_fk" FOREIGN KEY ("assetId") REFERENCES "public"."ASSET"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ASSET_REPORT" ADD CONSTRAINT "ASSET_REPORT_userId_HRIS_USER_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."HRIS_USER"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ASSET_CATEGORY" ADD CONSTRAINT "ASSET_CATEGORY_managedById_HRIS_USER_id_fk" FOREIGN KEY ("managedById") REFERENCES "public"."HRIS_USER"("id") ON DELETE no action ON UPDATE no action;