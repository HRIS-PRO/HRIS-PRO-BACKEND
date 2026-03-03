import { db } from '../../db';
import { users, userRoles } from '../../db/schema';
import { eq, and } from 'drizzle-orm';

export class UsersService {
    async getSuperAdmins() {
        // Find users who have the SUPER_ADMIN role for the ASSET_TRACKER app
        const results = await db.select({
            id: users.id,
            email: users.email,
        })
            .from(users)
            .innerJoin(userRoles, eq(users.id, userRoles.userId))
            .where(
                and(
                    eq(userRoles.app, 'ASSET_TRACKER'),
                    eq(userRoles.role, 'Super Admin')
                )
            );

        return results;
    }
}
