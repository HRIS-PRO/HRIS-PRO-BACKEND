import { db } from '../../db';
import { auditCycles, auditCycleAuditors, auditVerifications, assets, users } from '../../db/schema';
import { CreateAuditCycleInput, CreateAuditVerificationInput } from './audits.schema';
import { eq, and, sql } from 'drizzle-orm';

export class AuditsService {
    async createAuditCycle(input: CreateAuditCycleInput, creatorId: string) {
        const existingActive = await db.query.auditCycles.findFirst({
            where: eq(auditCycles.status, "In Progress")
        });

        if (existingActive) {
            throw new Error('An audit cycle is already in progress. Please complete it before starting a new one.');
        }

        const displayId = `AUD-${new Date().getFullYear()}-` + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        
        const [cycle] = await db.insert(auditCycles).values({
            displayId,
            name: input.name,
            startDate: input.startDate,
            endDate: input.endDate,
            status: "In Progress",
        }).returning();

        const auditors = input.auditorIds || [creatorId];
        
        if (auditors.length > 0) {
            await db.insert(auditCycleAuditors).values(
                auditors.map(userId => ({
                    cycleId: cycle.id,
                    userId
                }))
            );
        }

        return cycle;
    }

    async getAuditCycles() {
        // Fetch all cycles and manually join their verification counts to compute completion %
        const cycles = await db.query.auditCycles.findMany({
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
        
        const totalAssetsQuery = await db.select({ count: sql<number>`count(*)` }).from(assets);
        const totalAssets = Number(totalAssetsQuery[0]?.count || 1);

        return cycles.map(cycle => ({
            ...cycle,
            id: cycle.id,
            displayId: cycle.displayId,
            completion: Math.round((cycle.verifications.length / (totalAssets || 1)) * 100)
        }));
    }

    async verifyAsset(cycleId: string, userId: string, input: CreateAuditVerificationInput) {
        // Find existing verification
        const existing = await db.query.auditVerifications.findFirst({
            where: and(
                eq(auditVerifications.cycleId, cycleId),
                eq(auditVerifications.assetId, input.assetId)
            )
        });

        if (existing) {
            const [updated] = await db.update(auditVerifications).set({
                userId,
                result: input.result,
                notes: input.notes,
                verifiedAt: new Date()
            }).where(eq(auditVerifications.id, existing.id)).returning();
            return updated;
        }

        const [created] = await db.insert(auditVerifications).values({
            cycleId,
            assetId: input.assetId,
            userId,
            result: input.result,
            notes: input.notes
        }).returning();

        return created;
    }
}
