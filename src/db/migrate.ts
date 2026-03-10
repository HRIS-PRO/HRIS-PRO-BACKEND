import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config();

const runMigrate = async () => {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is missing");
    }

    console.log("Running migrations...");
    const migrationClient = postgres(process.env.DATABASE_URL, { max: 1 });
    const db = drizzle(migrationClient);

    await migrate(db, { migrationsFolder: "./drizzle" });

    console.log("Migrations applied successfully!");
    process.exit(0);
};

runMigrate().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});
