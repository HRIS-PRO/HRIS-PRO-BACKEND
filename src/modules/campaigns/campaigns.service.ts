import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../db';
import { campaigns, campaignRecipients, campaignAnalytics, groupMembers, bulkCustomers } from '../../db/schema';
import { CreateCampaignInput, UpdateCampaignInput } from './campaigns.schema';
import { CampaignsEngine } from './campaigns.engine';
import { sendBulkEmail } from './zepto-bulk.service';

type DrizzleClient = typeof db;

export class CampaignsService {
    constructor(private db: DrizzleClient) { }

    async sendTestEmail(workspaceId: string, payload: { to: string, subject: string, preheader: string, htmlContent: string, fromName?: string, fromEmail?: string }) {
        // This avoids creating a full campaign object and hits Zepto directly for testing
        // You could theoretically add some basic variable injection here too for the test user
        const testSubject = payload.subject || 'Test Message';
        await sendBulkEmail(payload.to, testSubject, payload.htmlContent, payload.preheader, payload.fromName, payload.fromEmail);
        return { success: true, message: `Test email sent to ${payload.to}` };
    }

    async getCampaigns(workspaceId: string) {
        const results = await this.db.query.campaigns.findMany({
            where: eq(campaigns.workspaceId, workspaceId),
            orderBy: (campaigns, { desc }) => [desc(campaigns.createdAt)],
            with: {
                creator: true,
                approver: true,
                recipients: {
                    with: {
                        group: {
                            with: {
                                rules: true
                            }
                        }
                    }
                }
            }
        });

        const campaignsWithCounts = await Promise.all(results.map(async (c) => {
            let totalReach = 0;

            for (const r of c.recipients) {
                if (r.isExcluded === 'true' || !r.group) continue;

                let count = 0;
                const g = r.group;

                if (g.type === 'static') {
                    const res = await this.db
                        .select({ count: sql<number>`count(*)` })
                        .from(groupMembers)
                        .where(eq(groupMembers.groupId, g.id));
                    count = Number(res[0]?.count || 0);
                } else if (g.type === 'dynamic' && (g as any).rules?.length > 0) {
                    const conditions = (g as any).rules.map((rule: any) => {
                        const column = (bulkCustomers as any)[rule.field];
                        if (!column) return sql`1=1`;
                        switch (rule.operator) {
                            case 'equals': return eq(column, rule.value);
                            case 'not_equals': return sql`${column} != ${rule.value}`;
                            case 'contains': return sql`${column} ILIKE ${'%' + rule.value + '%'}`;
                            case 'starts_with': return sql`${column} ILIKE ${rule.value + '%'}`;
                            default: return sql`1=1`;
                        }
                    });
                    const res = await this.db
                        .select({ count: sql<number>`count(*)` })
                        .from(bulkCustomers)
                        .where(and(...conditions));
                    count = Number(res[0]?.count || 0);
                }
                totalReach += count;
            }

            return {
                ...c,
                targetCount: totalReach
            };
        }));

        return campaignsWithCounts;
    }

    async getCampaignById(id: string, workspaceId: string) {
        return await this.db.query.campaigns.findFirst({
            where: and(
                eq(campaigns.id, id),
                eq(campaigns.workspaceId, workspaceId)
            ),
            with: {
                creator: true,
                approver: true,
                recipients: {
                    with: {
                        group: true
                    }
                },
                analytics: true
            }
        });
    }

    async createCampaign(workspaceId: string, creatorId: string, data: CreateCampaignInput) {
        const { recipients, ...rest } = data;

        return await this.db.transaction(async (tx) => {
            const [newCampaign] = await tx.insert(campaigns).values({
                ...rest,
                workspaceId,
                creatorId,
                status: 'DRAFT',
                content: rest.content as any, // jsonb
                scheduledAt: rest.scheduledAt ? new Date(rest.scheduledAt) : null,
            }).returning();

            if (recipients && recipients.length > 0) {
                await tx.insert(campaignRecipients).values(
                    recipients.map(r => ({
                        campaignId: newCampaign.id,
                        groupId: r.groupId,
                        isExcluded: r.isExcluded.toString(),
                    }))
                );
            }

            return newCampaign;
        });
    }

    async updateCampaign(id: string, workspaceId: string, data: UpdateCampaignInput) {
        const { recipients, ...rest } = data;

        return await this.db.transaction(async (tx) => {
            const existing = await tx.query.campaigns.findFirst({
                where: and(
                    eq(campaigns.id, id),
                    eq(campaigns.workspaceId, workspaceId)
                )
            });

            if (!existing) throw new Error("Campaign not found");
            if (existing.status !== 'DRAFT' && existing.status !== 'REJECTED') {
                throw new Error("Only drafts or rejected campaigns can be updated");
            }

            const updateData: any = { ...rest };
            if (rest.content) updateData.content = rest.content;
            if (rest.scheduledAt) updateData.scheduledAt = new Date(rest.scheduledAt);

            const [updatedCampaign] = await tx.update(campaigns)
                .set(updateData)
                .where(eq(campaigns.id, id))
                .returning();

            if (recipients) {
                // Simple replace for recipients
                await tx.delete(campaignRecipients).where(eq(campaignRecipients.campaignId, id));
                if (recipients.length > 0) {
                    await tx.insert(campaignRecipients).values(
                        recipients.map(r => ({
                            campaignId: id,
                            groupId: r.groupId,
                            isExcluded: r.isExcluded.toString(),
                        }))
                    );
                }
            }

            return updatedCampaign;
        });
    }

    async submitCampaign(id: string, workspaceId: string) {
        const [updated] = await this.db.update(campaigns)
            .set({ status: 'PENDING' })
            .where(and(
                eq(campaigns.id, id),
                eq(campaigns.workspaceId, workspaceId),
                eq(campaigns.status, 'DRAFT')
            ))
            .returning();
        return updated;
    }

    async approveCampaign(id: string, workspaceId: string, approverId: string, action: 'APPROVE' | 'REJECT') {
        const status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

        return await this.db.transaction(async (tx) => {
            // Fetch first to check creator
            const existing = await tx.query.campaigns.findFirst({
                where: and(
                    eq(campaigns.id, id),
                    eq(campaigns.workspaceId, workspaceId),
                    eq(campaigns.status, 'PENDING')
                )
            });

            if (!existing) {
                return null;
            }

            if (existing.creatorId === approverId) {
                throw new Error("You cannot approve or reject your own campaign.");
            }

            const [updated] = await tx.update(campaigns)
                .set({
                    status,
                    approverId,
                    updatedAt: new Date()
                })
                .where(eq(campaigns.id, id))
                .returning();

            if (updated && action === 'APPROVE') {
                // If not scheduled for future, run immediately
                if (!updated.scheduledAt || new Date(updated.scheduledAt) <= new Date()) {
                    const engine = new CampaignsEngine(this.db as any);
                    // Run asynchronously in background so approval response is fast
                    engine.executeCampaign(updated.id).catch(err => {
                        console.error(`Automatic campaign execution failed for ${updated.id}:`, err);
                    });
                } else {
                    // Mark as SCHEDULED
                    await tx.update(campaigns)
                        .set({ status: 'SCHEDULED' })
                        .where(eq(campaigns.id, id));
                }
            }

            return updated;
        });
    }

    async deleteCampaign(id: string, workspaceId: string) {
        const [deleted] = await this.db.delete(campaigns)
            .where(and(
                eq(campaigns.id, id),
                eq(campaigns.workspaceId, workspaceId)
            ))
            .returning();
        return deleted;
    }
}
