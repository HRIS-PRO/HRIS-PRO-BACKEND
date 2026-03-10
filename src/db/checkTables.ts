import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config();

const checkTables = async () => {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is missing");
    }

    const sql = postgres(process.env.DATABASE_URL, { max: 1 });

    const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `;

    console.log("Existing tables:", tables.map(t => t.table_name));

    const enums = await sql`
    SELECT t.typname, e.enumlabel
    FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid  
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public';
  `;
    console.log("Existing ENUMs:", enums);

    process.exit(0);
};

checkTables().catch(console.error);
