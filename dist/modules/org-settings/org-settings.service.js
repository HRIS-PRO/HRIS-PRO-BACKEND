"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrgSettingsService = void 0;
const db_1 = require("../../db");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const SINGLETON_ID = 'singleton';
class OrgSettingsService {
    async get() {
        const [existing] = await db_1.db.select().from(schema_1.orgSettings).where((0, drizzle_orm_1.eq)(schema_1.orgSettings.id, SINGLETON_ID));
        if (existing)
            return existing;
        // First read on a fresh database: create the singleton row with defaults
        const [created] = await db_1.db.insert(schema_1.orgSettings)
            .values({ id: SINGLETON_ID })
            .onConflictDoNothing()
            .returning();
        if (created)
            return created;
        // Lost the insert race — the row exists now
        const [row] = await db_1.db.select().from(schema_1.orgSettings).where((0, drizzle_orm_1.eq)(schema_1.orgSettings.id, SINGLETON_ID));
        return row;
    }
    async update(data, updatedById) {
        const [updated] = await db_1.db.insert(schema_1.orgSettings)
            .values({ id: SINGLETON_ID, ...data, updatedById })
            .onConflictDoUpdate({
            target: schema_1.orgSettings.id,
            set: { ...data, updatedById, updatedAt: new Date() },
        })
            .returning();
        return updated;
    }
}
exports.OrgSettingsService = OrgSettingsService;
