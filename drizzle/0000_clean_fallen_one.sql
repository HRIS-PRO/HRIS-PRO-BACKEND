CREATE TYPE "public"."app_type" AS ENUM('HRIS', 'ASSET_TRACKER');--> statement-breakpoint
CREATE TYPE "public"."department_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."employee_status" AS ENUM('ACTIVE', 'REMOTE', 'ON_LEAVE', 'TERMINATED');--> statement-breakpoint
CREATE TABLE "Department" (
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
CREATE TABLE "Employee" (
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
	CONSTRAINT "Employee_userId_unique" UNIQUE("userId"),
	CONSTRAINT "Employee_workEmail_unique" UNIQUE("workEmail")
);
--> statement-breakpoint
CREATE TABLE "UserRole" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"app" "app_type" NOT NULL,
	"role" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"otpHash" text,
	"otpExpiresAt" timestamp,
	CONSTRAINT "User_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_Department_id_fk" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;