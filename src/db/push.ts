import postgres from "postgres";
import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const pushSchema = async () => {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is missing");
    }

    const sqlFile = path.join(__dirname, "../../drizzle/0002_thankful_betty_brant.sql");
    const sqlContent = fs.readFileSync(sqlFile, "utf-8");

    // Split statements by the drizzle breakpoint
    const statements = sqlContent.split("--> statement-breakpoint").filter(s => s.trim().length > 0);

    console.log("Pushing schema using raw SQL...");
    const sql = postgres(process.env.DATABASE_URL, { max: 1 });

    for (const statement of statements) {
        console.log(`Executing: ${statement.trim()}`);
        await sql.unsafe(statement);
    }

    console.log("Schema pushed successfully!");
    process.exit(0);
};

pushSchema().catch((err) => {
    console.error("Failed to push schema:", err);
    process.exit(1);
});
