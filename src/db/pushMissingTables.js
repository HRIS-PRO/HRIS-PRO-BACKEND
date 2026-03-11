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
const pushMissingTables = async () => {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is missing");
    }
    const sql = (0, postgres_1.default)(process.env.DATABASE_URL, { max: 1 });
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
        }
        catch (e) {
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
    }
    catch (err) {
        console.error("Failed to execute raw SQL schema definitions:", err);
        process.exit(1);
    }
};
pushMissingTables();
