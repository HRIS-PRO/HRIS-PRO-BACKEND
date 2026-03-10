import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import * as dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing");
}

// For migrations, use the direct connection if available
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

// Disable prefetch as it is not supported for "Transaction" pool mode, and bump max connections to avoid starvation on dashboard load
const client = postgres(connectionString, {
    // prepare: false,
    max: 25,
    idle_timeout: 20,
    connect_timeout: 10
});
export const db = drizzle(client, { schema });
