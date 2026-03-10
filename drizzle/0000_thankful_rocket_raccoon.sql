CREATE TYPE "public"."app_type" AS ENUM('HRIS', 'ASSET_TRACKER');--> statement-breakpoint
CREATE TYPE "public"."asset_status" AS ENUM('ACTIVE', 'MAINTENANCE', 'PENDING', 'LOST', 'DECOMMISSIONED', 'IDLE');--> statement-breakpoint
CREATE TYPE "public"."department_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."employee_status" AS ENUM('ACTIVE', 'REMOTE', 'ON_LEAVE', 'TERMINATED');--> statement-breakpoint
CREATE TYPE "public"."location_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('PENDING', 'IN_REVIEW', 'RESOLVED');--> statement-breakpoint
CREATE TYPE "public"."request_priority" AS ENUM('STANDARD', 'HIGH', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('PENDING_HOD', 'PENDING_HOO', 'PENDING_CATEGORY_ADMIN', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "ASSET_CATEGORY" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"managedById" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ASSET_CATEGORY_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "ASSET_LOCATION" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ASSET_LOCATION_name_unique" UNIQUE("name")
);
--> statement-breakpoint
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
CREATE TABLE "HRIS_DEPARTMENT" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"parentId" uuid,
	"headName" text,
	"headId" text,
	"staffCount" integer DEFAULT 0 NOT NULL,
	"status" "department_status" DEFAULT 'ACTIVE' NOT NULL,
	"icon" text,
	"color" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "HRIS_EMPLOYEE" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"firstName" text NOT NULL,
	"surname" text NOT NULL,
	"middleName" text,
	"workEmail" text NOT NULL,
	"personalEmail" text,
	"phoneNumber" text,
	"departmentId" uuid NOT NULL,
	"roleId" text NOT NULL,
	"location" text NOT NULL,
	"hiringManagerId" text NOT NULL,
	"status" "employee_status" DEFAULT 'ACTIVE' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "HRIS_EMPLOYEE_userId_unique" UNIQUE("userId"),
	CONSTRAINT "HRIS_EMPLOYEE_workEmail_unique" UNIQUE("workEmail")
);
--> statement-breakpoint
CREATE TABLE "EQUIPMENT_REQUEST" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"categoryId" uuid NOT NULL,
	"priority" "request_priority" DEFAULT 'STANDARD' NOT NULL,
	"justification" text NOT NULL,
	"status" "request_status" DEFAULT 'PENDING_HOD' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "HRIS_LOCATION" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"status" "location_status" DEFAULT 'ACTIVE' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "HRIS_USER_ROLE" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"app" "app_type" NOT NULL,
	"role" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "HRIS_USER" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"otpHash" text,
	"otpExpiresAt" timestamp,
	"passwordHash" text,
	CONSTRAINT "HRIS_USER_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "ASSET_CATEGORY" ADD CONSTRAINT "ASSET_CATEGORY_managedById_HRIS_USER_id_fk" FOREIGN KEY ("managedById") REFERENCES "public"."HRIS_USER"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ASSET_REPORT" ADD CONSTRAINT "ASSET_REPORT_assetId_ASSET_id_fk" FOREIGN KEY ("assetId") REFERENCES "public"."ASSET"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ASSET_REPORT" ADD CONSTRAINT "ASSET_REPORT_userId_HRIS_USER_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."HRIS_USER"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ASSET" ADD CONSTRAINT "ASSET_assignedTo_HRIS_USER_id_fk" FOREIGN KEY ("assignedTo") REFERENCES "public"."HRIS_USER"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "HRIS_EMPLOYEE" ADD CONSTRAINT "HRIS_EMPLOYEE_userId_HRIS_USER_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."HRIS_USER"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "HRIS_EMPLOYEE" ADD CONSTRAINT "HRIS_EMPLOYEE_departmentId_HRIS_DEPARTMENT_id_fk" FOREIGN KEY ("departmentId") REFERENCES "public"."HRIS_DEPARTMENT"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "EQUIPMENT_REQUEST" ADD CONSTRAINT "EQUIPMENT_REQUEST_userId_HRIS_USER_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."HRIS_USER"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "EQUIPMENT_REQUEST" ADD CONSTRAINT "EQUIPMENT_REQUEST_categoryId_ASSET_CATEGORY_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."ASSET_CATEGORY"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "HRIS_USER_ROLE" ADD CONSTRAINT "HRIS_USER_ROLE_userId_HRIS_USER_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."HRIS_USER"("id") ON DELETE no action ON UPDATE no action;