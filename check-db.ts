import { db } from './src/db';
import { sql } from 'drizzle-orm';
import * as schema from './src/db/schema';

async function main() {
    console.log('Testing database connection...');
    try {
        // Execute a simple query to test connection
        const result = await db.execute(sql`SELECT NOW()`);
        console.log('✅ Successfully connected to database!');

        // Count users
        const users = await db.select({ count: sql`count(*)` }).from(schema.users);
        console.log(`Current user count: ${users[0].count}`);

        process.exit(0);
    } catch (e: any) {
        console.error('❌ Connection failed:', e.message);
        process.exit(1);
    }
}

main();
