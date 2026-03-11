"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const postgres_1 = __importDefault(require("postgres"));
const path_1 = require("path");
// Load environment variables from specific path
(0, dotenv_1.config)({ path: (0, path_1.resolve)(__dirname, '../../.env') });
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    console.error('DATABASE_URL is missing. Please set it in .env');
    process.exit(1);
}
const sql = (0, postgres_1.default)(dbUrl, { max: 1 });
async function main() {
    try {
        console.log('Adding custom_fields to BULK_CUSTOMER table...');
        const query = `
      ALTER TABLE "BULK_CUSTOMER" ADD COLUMN IF NOT EXISTS "customFields" jsonb DEFAULT '{}';
    `;
        await sql.unsafe(query);
        console.log('✅ Column customFields created successfully.');
    }
    catch (error) {
        console.error('❌ Error executing SQL:', error);
    }
    finally {
        await sql.end();
        console.log('Done.');
    }
}
main();
