"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetCategoriesService = void 0;
const db_1 = require("../../db");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
class AssetCategoriesService {
    async getAll() {
        return await db_1.db.select().from(schema_1.assetCategories).orderBy(schema_1.assetCategories.name);
    }
    async create(data) {
        const [category] = await db_1.db.insert(schema_1.assetCategories).values(data).returning();
        return category;
    }
    async delete(id) {
        const [category] = await db_1.db.delete(schema_1.assetCategories).where((0, drizzle_orm_1.eq)(schema_1.assetCategories.id, id)).returning();
        return category;
    }
}
exports.AssetCategoriesService = AssetCategoriesService;
