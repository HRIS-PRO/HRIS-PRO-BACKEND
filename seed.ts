import { db } from './src/db';
import { users, userRoles } from './src/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function main() {
    console.log('🌱 Seeding database...');

    const email = 'divineobinali9@gmail.com';
    const password = 'password123';
    const passwordHash = await bcrypt.hash(password, 10);

    // Check if user exists
    let user = await db.query.users.findFirst({
        where: eq(users.email, email),
    });

    if (!user) {
        // Create User
        [user] = await db.insert(users).values({
            email,
            passwordHash,
        }).returning();
        console.log(`✅ User created: ${user.email}`);
    } else {
        console.log(`ℹ️ User found: ${user.email}`);
    }

    // Assign Role
    const existingRole = await db.query.userRoles.findFirst({
        where: (roles, { and, eq }) => and(
            eq(roles.userId, user!.id),
            eq(roles.app, 'HRIS')
        )
    });

    if (!existingRole) {
        await db.insert(userRoles).values({
            userId: user.id,
            app: 'HRIS',
            role: 'OWNER',
        });
        console.log(`✅ Assigned OWNER role for HRIS`);
    } else {
        console.log(`ℹ️ User already has HRIS role`);
    }

    console.log('🎉 Seeding complete!');
    process.exit(0);
}

main().catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
