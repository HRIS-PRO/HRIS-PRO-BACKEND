"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditsService = void 0;
const db_1 = require("../../db");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
class AuditsService {
    async createAuditCycle(input, creatorId) {
        const existingActive = await db_1.db.query.auditCycles.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.auditCycles.status, "In Progress")
        });
        if (existingActive) {
            throw new Error('An audit cycle is already in progress. Please complete it before starting a new one.');
        }
        const displayId = `AUD-${new Date().getFullYear()}-` + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const [cycle] = await db_1.db.insert(schema_1.auditCycles).values({
            displayId,
            name: input.name,
            startDate: input.startDate,
            endDate: input.endDate,
            status: "In Progress",
        }).returning();
        const auditors = input.auditorIds || [creatorId];
        if (auditors.length > 0) {
            await db_1.db.insert(schema_1.auditCycleAuditors).values(auditors.map(userId => ({
                cycleId: cycle.id,
                userId
            })));
        }
        return cycle;
    }
    async getAuditCycles() {
        // Fetch all cycles and manually join their verification counts to compute completion %
        const cycles = await db_1.db.query.auditCycles.findMany({
            with: {
                auditors: {
                    with: {
                        auditor: true
                    }
                },
                verifications: true
            },
            orderBy: (auditCycles, { desc }) => [desc(auditCycles.createdAt)]
        });
        const totalAssetsQuery = await db_1.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` }).from(schema_1.assets);
        const totalAssets = Number(totalAssetsQuery[0]?.count || 1);
        return cycles.map(cycle => ({
            ...cycle,
            id: cycle.id,
            displayId: cycle.displayId,
            completion: Math.round((cycle.verifications.length / (totalAssets || 1)) * 100)
        }));
    }
    async verifyAsset(cycleId, userId, input) {
        // Find existing verification
        const existing = await db_1.db.query.auditVerifications.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.auditVerifications.cycleId, cycleId), (0, drizzle_orm_1.eq)(schema_1.auditVerifications.assetId, input.assetId))
        });
        if (existing) {
            const [updated] = await db_1.db.update(schema_1.auditVerifications).set({
                userId,
                result: input.result,
                notes: input.notes,
                verifiedAt: new Date()
            }).where((0, drizzle_orm_1.eq)(schema_1.auditVerifications.id, existing.id)).returning();
            return updated;
        }
        const [created] = await db_1.db.insert(schema_1.auditVerifications).values({
            cycleId,
            assetId: input.assetId,
            userId,
            result: input.result,
            notes: input.notes
        }).returning();
        return created;
    }
}
exports.AuditsService = AuditsService;
