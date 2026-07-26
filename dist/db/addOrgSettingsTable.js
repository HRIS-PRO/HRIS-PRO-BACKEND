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
const pushOrgSettingsSchema = async () => {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is missing");
    }
    const sql = (0, postgres_1.default)(process.env.DATABASE_URL, { max: 1 });
    try {
        console.log("Creating ORG_SETTINGS table...");
        await sql `
            CREATE TABLE IF NOT EXISTS "ORG_SETTINGS" (
                "id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
                "orgName" text DEFAULT 'AssetTrackPro Enterprise' NOT NULL,
                "contactEmail" text DEFAULT 'admin@assettrack.pro' NOT NULL,
                "theme" text DEFAULT 'default' NOT NULL,
                "updatedById" uuid,
                "createdAt" timestamp DEFAULT now() NOT NULL,
                "updatedAt" timestamp DEFAULT now() NOT NULL
            );
        `;
        console.log("Adding FOREIGN KEY to ORG_SETTINGS...");
        await sql `
            DO $$ BEGIN
                ALTER TABLE "ORG_SETTINGS" ADD CONSTRAINT "ORG_SETTINGS_updatedById_HRIS_USER_id_fk" FOREIGN KEY ("updatedById") REFERENCES "public"."HRIS_USER"("id") ON DELETE set null ON UPDATE no action;
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `;
        console.log("Seeding singleton settings row...");
        await sql `
            INSERT INTO "ORG_SETTINGS" ("id") VALUES ('singleton')
            ON CONFLICT ("id") DO NOTHING;
        `;
        console.log("Org Settings schema pushed successfully!");
    }
    catch (err) {
        console.error("Error setting up org settings schema:", err);
    }
    finally {
        await sql.end();
        process.exit(0);
    }
};
pushOrgSettingsSchema().catch((err) => {
    console.error("Failed to push org settings schema:", err);
    process.exit(1);
});
