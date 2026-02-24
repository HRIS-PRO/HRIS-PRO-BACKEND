CREATE TYPE "public"."asset_status" AS ENUM('ACTIVE', 'MAINTENANCE', 'PENDING', 'LOST', 'DECOMMISSIONED', 'IDLE');
--> statement-breakpoint
CREATE TABLE "ASSET" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"assignedTo" uuid,
	"department" text,
	"manager" text,
	"status" "asset_status" DEFAULT 'IDLE' NOT NULL,
	"purchaseDate" text NOT NULL,
	"purchasePrice" integer NOT NULL,
	"condition" text NOT NULL,
	"location" text NOT NULL,
	"serialNumber" text,
	"description" text,
	"fileUrl" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ASSET" ADD CONSTRAINT "ASSET_assignedTo_HRIS_USER_id_fk" FOREIGN KEY ("assignedTo") REFERENCES "public"."HRIS_USER"("id") ON DELETE no action ON UPDATE no action;