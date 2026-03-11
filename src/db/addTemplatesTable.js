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
const pushTemplatesSchema = async () => {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is missing");
    }
    const sql = (0, postgres_1.default)(process.env.DATABASE_URL, { max: 1 });
    try {
        console.log("Creating template enums...");
        await sql `
            DO $$ BEGIN
                CREATE TYPE "public"."template_type" AS ENUM('Email', 'SMS', 'WhatsApp');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `;
        await sql `
            DO $$ BEGIN
                CREATE TYPE "public"."template_status" AS ENUM('Draft', 'Published');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `;
        console.log("Creating TEMPLATE table...");
        await sql `
            CREATE TABLE IF NOT EXISTS "TEMPLATE" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                "ownerId" uuid NOT NULL,
                "title" text NOT NULL,
                "type" "public"."template_type" NOT NULL,
                "status" "public"."template_status" DEFAULT 'Draft' NOT NULL,
                "category" text,
                "tags" text[],
                "subject" text,
                "content" text NOT NULL,
                "metadata" jsonb,
                "createdAt" timestamp DEFAULT now() NOT NULL,
                "updatedAt" timestamp DEFAULT now() NOT NULL
            );
        `;
        console.log("Adding FOREIGN KEY to TEMPLATE...");
        await sql `
            DO $$ BEGIN
                ALTER TABLE "TEMPLATE" ADD CONSTRAINT "TEMPLATE_ownerId_HRIS_USER_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."HRIS_USER"("id") ON DELETE cascade ON UPDATE no action;
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `;
        console.log("Templates Schema pushed successfully!");
    }
    catch (err) {
        console.error("Error setting up templates schema:", err);
    }
    finally {
        await sql.end();
        process.exit(0);
    }
};
pushTemplatesSchema().catch((err) => {
    console.error("Failed to push templates schema:", err);
    process.exit(1);
});
