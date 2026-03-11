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
}
exports.UsersService = UsersService;
