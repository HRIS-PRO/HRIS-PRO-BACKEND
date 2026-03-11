"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetLocationsService = void 0;
const db_1 = require("../../db");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
class AssetLocationsService {
    async getAll() {
        return await db_1.db.select().from(schema_1.assetLocations).orderBy(schema_1.assetLocations.name);
    }
    async create(data) {
        const [location] = await db_1.db.insert(schema_1.assetLocations).values(data).returning();
        return location;
    }
    async delete(id) {
        const [location] = await db_1.db.delete(schema_1.assetLocations).where((0, drizzle_orm_1.eq)(schema_1.assetLocations.id, id)).returning();
        return location;
    }
}
exports.AssetLocationsService = AssetLocationsService;
