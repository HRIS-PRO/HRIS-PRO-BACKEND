"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const db_1 = require("../../db");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
class UsersService {
    async getSuperAdmins() {
        // Find users who have the SUPER_ADMIN role for the ASSET_TRACKER app
        const results = await db_1.db.select({
            id: schema_1.users.id,
            email: schema_1.users.email,
        })
            .from(schema_1.users)
            .innerJoin(schema_1.userRoles, (0, drizzle_orm_1.eq)(schema_1.users.id, schema_1.userRoles.userId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userRoles.app, 'ASSET_TRACKER'), (0, drizzle_orm_1.eq)(schema_1.userRoles.role, 'Super Admin')));
        return results;
    }
    async getAssetTrackerUsers() {
        // Find all users who have access to the ASSET_TRACKER app
        const results = await db_1.db.select({
            id: schema_1.users.id,
            email: schema_1.users.email,
            firstName: schema_1.employees.firstName,
            lastName: schema_1.employees.surname,
            role: schema_1.userRoles.role,
            createdAt: schema_1.users.createdAt,
            department: schema_1.employees.departmentId,
            location: schema_1.employees.location
        })
            .from(schema_1.users)
            .innerJoin(schema_1.userRoles, (0, drizzle_orm_1.eq)(schema_1.users.id, schema_1.userRoles.userId))
            .leftJoin(schema_1.employees, (0, drizzle_orm_1.eq)(schema_1.users.id, schema_1.employees.userId))
            .where((0, drizzle_orm_1.eq)(schema_1.userRoles.app, 'ASSET_TRACKER'))
            .orderBy(schema_1.users.email);
        return results;
    }
}
exports.UsersService = UsersService;
