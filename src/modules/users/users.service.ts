import { db } from '../../db';
import { users, userRoles, employees } from '../../db/schema';
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

    async getAssetTrackerUsers() {
        // Find all users who have access to the ASSET_TRACKER app
        const results = await db.select({
            id: users.id,
            email: users.email,
            firstName: employees.firstName,
            lastName: employees.surname,
            role: userRoles.role,
            createdAt: users.createdAt,
            department: employees.departmentId,
            location: employees.location
        })
            .from(users)
            .innerJoin(userRoles, eq(users.id, userRoles.userId))
            .leftJoin(employees, eq(users.id, employees.userId))
            .where(eq(userRoles.app, 'ASSET_TRACKER'))
            .orderBy(users.email);

        return results;
    }
}
