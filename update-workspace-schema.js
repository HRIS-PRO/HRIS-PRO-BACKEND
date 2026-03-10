const postgres = require('postgres');
require('dotenv').config();

async function run() {
  const sql = postgres(process.env.DATABASE_URL);
  try {
    console.log("Creating workspace tables...");
    
    // Create enum if not exists
    await sql`DO $$ BEGIN
        CREATE TYPE workspace_status AS ENUM ('ACTIVE', 'MAINTENANCE', 'SUSPENDED');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;`;

    // Create Workspaces table
    await sql`CREATE TABLE IF NOT EXISTS "WORKSPACE" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" text NOT NULL,
        "status" workspace_status NOT NULL DEFAULT 'ACTIVE',
        "ownerId" uuid NOT NULL REFERENCES "HRIS_USER"("id"),
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
    );`;

    // Create WorkspaceMembers table
    await sql`CREATE TABLE IF NOT EXISTS "WORKSPACE_MEMBER" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "workspaceId" uuid NOT NULL REFERENCES "WORKSPACE"("id"),
        "userId" uuid NOT NULL REFERENCES "HRIS_USER"("id"),
        "joinedAt" timestamp NOT NULL DEFAULT now()
    );`;

    console.log("Successfully created workspace tables and enum.");
  } catch (err) {
    console.error("Error creating workspace infrastructure:", err.message);
  } finally {
    await sql.end();
  }
}
run();
