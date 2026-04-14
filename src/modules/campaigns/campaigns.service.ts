import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { bulkCustomers, campaignAnalytics, campaigns, groupMembers, campaignExternalData, campaignRecipients, workspaceMembers, userRoles, users, workspaces } from '../../db/schema';
import { CreateCampaignInput, UpdateCampaignInput } from './campaigns.schema';
import { CampaignsEngine } from './campaigns.engine';
import { normalizeIdentifier } from '../../utils/phone-utils';
import { sendBulkEmail } from './zepto-bulk.service';
import { sendEmail } from '../shared/zepto';

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
                creator: {
                    with: { employee: true }
                },
                approver: {
                    with: { employee: true }
                },
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
                    const rulesArr: any[] = (g as any).rules;
                    let querySql = sql`1=1`;
                    
                    for (let i = 0; i < rulesArr.length; i++) {
                        const r = rulesArr[i];
                        const column = (bulkCustomers as any)[r.field];
                        let condition = sql`1=1`;
                        
                        if (column) {
                            switch (r.operator) {
                                case 'equals': condition = sql`${column} = ${r.value}`; break;
                                case 'not_equals': condition = sql`${column} != ${r.value}`; break;
                                case 'contains': condition = sql`${column} ILIKE ${'%' + r.value + '%'}`; break;
                                case 'starts_with': condition = sql`${column} ILIKE ${r.value + '%'}`; break;
                            }
                        } else {
                            // Support for Custom Fields (JSONB)
                            const jsonColumn = sql`${bulkCustomers.customFields}->>${r.field}`;
                            switch (r.operator) {
                                case 'equals': condition = sql`${jsonColumn} = ${r.value}`; break;
                                case 'not_equals': condition = sql`${jsonColumn} != ${r.value}`; break;
                                case 'contains': condition = sql`${jsonColumn} ILIKE ${'%' + r.value + '%'}`; break;
                                case 'starts_with': condition = sql`${jsonColumn} ILIKE ${r.value + '%'}`; break;
                            }
                        }

                        if (i === 0) {
                            querySql = condition;
                        } else {
                            if (r.logicGate === 'OR') {
                                querySql = sql`${querySql} OR ${condition}`;
                            } else {
                                querySql = sql`${querySql} AND ${condition}`;
                            }
                        }
                    }
                    const res = await this.db
                        .select({ count: sql<number>`count(*)` })
                        .from(bulkCustomers)
                        .where(sql`(${querySql})`);
                    count = Number(res[0]?.count || 0);
                }
                totalReach += count;
            }

            // Fetch Analytics Stats - Unique counts only (if sent, they aren't 'failed' anymore)
            const sentRes = await this.db.select({ count: sql<number>`count(DISTINCT ${campaignAnalytics.contactId})` })
                .from(campaignAnalytics)
                .where(and(
                    eq(campaignAnalytics.campaignId, c.id),
                    eq(campaignAnalytics.eventType, 'SENT')
                ));
            
            const sentCountValue = Number(sentRes[0]?.count || 0);

            const failedRes = await this.db.select({ count: sql<number>`count(DISTINCT ${campaignAnalytics.contactId})` })
                .from(campaignAnalytics)
                .where(and(
                    eq(campaignAnalytics.campaignId, c.id),
                    sql`${campaignAnalytics.eventType} IN ('FAILED', 'BOUNCED')`,
                    // Only count as failed if there is NO successful 'SENT' event for this contact in this campaign
                    sql`NOT EXISTS (
                        SELECT 1 FROM "CAMPAIGN_ANALYTICS" sub 
                        WHERE sub."campaignId" = ${c.id} 
                        AND sub."contactId" = ${campaignAnalytics.contactId} 
                        AND sub."eventType" = 'SENT'
                    )`
                ));

            return {
                ...c,
                targetCount: totalReach,
                sentCount: sentCountValue,
                failedCount: Number(failedRes[0]?.count || 0),
                creatorName: (c.creator as any)?.employee?.firstName 
                    ? `${(c.creator as any).employee.firstName} ${(c.creator as any).employee.surname}`
                    : (c.creator?.email || 'System')
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

    async submitCampaign(id: string, workspaceId: string, actorId: string, actorRole: string) {
        const existing = await this.db.query.campaigns.findFirst({
            where: and(eq(campaigns.id, id), eq(campaigns.workspaceId, workspaceId), eq(campaigns.status, 'DRAFT'))
        });
        if (!existing) return null;

        // Skip flow for Admin or Manager
        if (actorRole === 'Admin' || actorRole === 'Manager') {
            const isRecurring = existing.cycleConfig || existing.anniversaryConfig;
            const status = existing.scheduledAt && new Date(existing.scheduledAt) > new Date() ? 'SCHEDULED' : 'APPROVED';

            const [updated] = await this.db.update(campaigns)
                .set({ status })
                .where(eq(campaigns.id, id))
                .returning();
            
            if (updated.status === 'APPROVED' && !isRecurring) {
                const engine = new CampaignsEngine(this.db as any);
                engine.executeCampaign(updated.id).catch(console.error);
            }
            return updated;
        }

        // Add metadata marker
        const approvalStage = actorRole === 'User' ? 'EDITOR' : 'MANAGER';
        const newMetadata = { ...(existing.content as Record<string, any>)?.metadata, approvalStage };
        const newContent = { ...(existing.content as Record<string, any>), metadata: newMetadata };

        const [updated] = await this.db.update(campaigns)
            .set({ status: 'PENDING', content: newContent })
            .where(eq(campaigns.id, id))
            .returning();

        if (updated) {
            this.notifyApprovers(workspaceId, id, actorId, approvalStage).catch(console.error);
        }

        return updated;
    }

    async resendApprovalNotification(id: string, workspaceId: string, actorId: string) {
        const existing = await this.db.query.campaigns.findFirst({
            where: and(
                eq(campaigns.id, id),
                eq(campaigns.workspaceId, workspaceId),
                eq(campaigns.status, 'PENDING')
            )
        });

        if (!existing) {
            throw new Error("Campaign not found or not in PENDING state.");
        }

        const approvalStage = (existing.content as any)?.metadata?.approvalStage || 'MANAGER';
        await this.notifyApprovers(workspaceId, id, actorId, approvalStage);
        return existing;
    }

    private async notifyApprovers(workspaceId: string, campaignId: string, actorId: string, stage: 'EDITOR' | 'MANAGER') {
        const workspace = await this.db.query.workspaces.findFirst({
            where: eq(workspaces.id, workspaceId),
        });

        const campaign = await this.db.query.campaigns.findFirst({
            where: eq(campaigns.id, campaignId),
        });

        if (!workspace || !campaign) return;

        const actor = await this.db.query.users.findFirst({
            where: eq(users.id, actorId),
            with: { employee: true },
        });

        const actorName = (actor as any)?.employee
            ? `${(actor as any).employee.firstName} ${(actor as any).employee.surname}`
            : actor?.email || 'A user';

        const members = await this.db.select({ userRole: userRoles.role, email: users.email, firstName: sql<string>`${users.id}` })
            .from(workspaceMembers)
            .innerJoin(users, eq(workspaceMembers.userId, users.id))
            .innerJoin(userRoles, eq(users.id, userRoles.userId))
            .where(and(
                eq(workspaceMembers.workspaceId, workspaceId),
                eq(userRoles.app, 'MSGSCALE_BULK')
            ));

        const eligibleApprovers = members.filter(m => {
            if (m.userRole === 'Admin') return true;
            if (stage === 'EDITOR') return m.userRole === 'Manager' || m.userRole === 'Editor';
            if (stage === 'MANAGER') return m.userRole === 'Manager';
            return false;
        });

        // Deduplicate by email
        const uniqueEmails = Array.from(new Set(eligibleApprovers.map(m => m.email.toLowerCase())));

        for (const email of uniqueEmails) {
            const emailHtml = `
                <div style="padding: 10px 0;">
                    <p style="font-size:16px;">Hi there,</p>
                    <p><strong>${actorName}</strong> has submitted a campaign that requires your review and approval in the <strong style="color:#4F46E5">"${workspace.title}"</strong> workspace.</p>
                    <div style="background:#f5f3ff;border-left:4px solid #4F46E5;padding:16px 20px;border-radius:8px;margin:24px 0">
                        <p style="margin:0;font-size:12px;color:#4F46E5;font-weight:700;text-transform:uppercase;letter-spacing:1px">Campaign Details</p>
                        <p style="margin:8px 0 0;font-size:14px"><strong>Name:</strong> ${campaign.name}</p>
                        <p style="margin:4px 0 0;font-size:14px"><strong>Channel:</strong> ${campaign.channel}</p>
                        <p style="margin:4px 0 0;font-size:14px"><strong>Submitted by:</strong> ${actorName}</p>
                    </div>
                    <p style="font-size:14px;color:#555">Please log in to review the details and approve or reject the broadcast.</p>
                    <div style="text-align:center;margin-top:32px">
                        <a href="https://msg.noltfinance.com/campaigns/${campaignId}" style="display:inline-block;background-color:#4F46E5;color:#fff;padding:14px 36px;border-radius:50px;text-decoration:none;font-weight:bold;font-size:14px">Review Campaign &rarr;</a>
                    </div>
                </div>
            `;

            sendEmail(
                email, 
                `Approval Required: Campaign "${campaign.name}"`, 
                emailHtml, 
                `MsgScale Workspace: ${workspace.title}`, 
                "MsgScale", 
                undefined, 
                "MsgScale"
            ).catch(console.error);
        }
    }

    async approveCampaign(id: string, workspaceId: string, approverId: string, action: 'APPROVE' | 'REJECT', approverRole: string) {
        return await this.db.transaction(async (tx) => {
            const existing = await tx.query.campaigns.findFirst({
                where: and(
                    eq(campaigns.id, id),
                    eq(campaigns.workspaceId, workspaceId),
                    eq(campaigns.status, 'PENDING')
                )
            });

            if (!existing) return null;

            if (existing.creatorId === approverId && approverRole !== 'Admin') {
                throw new Error("You cannot approve or reject your own campaign.");
            }

            const currentStage = (existing.content as any)?.metadata?.approvalStage || 'MANAGER';

            if (action === 'APPROVE' && approverRole !== 'Admin') {
                if (currentStage === 'EDITOR' && approverRole !== 'Editor') {
                    throw new Error("Unauthorized: Only Editors can perform the initial review stage.");
                }
                if (currentStage === 'MANAGER' && approverRole !== 'Manager') {
                    throw new Error("Unauthorized: Only Managers can perform the final approval stage.");
                }
            }

            // Step up to Manager Stage
            if (action === 'APPROVE' && currentStage === 'EDITOR' && approverRole === 'Editor') {
                const newMetadata = { ...(existing.content as Record<string, any>)?.metadata, approvalStage: 'MANAGER' };
                const newContent = { ...(existing.content as Record<string, any>), metadata: newMetadata };
                
                const [updated] = await tx.update(campaigns)
                    .set({ content: newContent })
                    .where(eq(campaigns.id, id))
                    .returning();
                
                this.notifyApprovers(workspaceId, id, approverId, 'MANAGER').catch(console.error);
                return updated;
            }

            // Final Approval or Reject
            const isRecurring = existing.cycleConfig || existing.anniversaryConfig;
            const status = action === 'APPROVE' 
                ? (existing.scheduledAt && new Date(existing.scheduledAt) > new Date() ? 'SCHEDULED' : 'APPROVED') 
                : 'REJECTED';

            const [updated] = await tx.update(campaigns)
                .set({
                    status,
                    approverId,
                    updatedAt: new Date()
                })
                .where(eq(campaigns.id, id))
                .returning();

            if (updated && updated.status === 'APPROVED' && !isRecurring) {
                const engine = new CampaignsEngine(this.db as any);
                engine.executeCampaign(updated.id).catch(err => {
                    console.error(`Automatic campaign execution failed for ${updated.id}:`, err);
                });
            }

            return updated;
        });
    }

    async deleteCampaign(id: string, workspaceId: string, actorId: string, actorRole: string) {
        const existing = await this.db.query.campaigns.findFirst({
            where: and(eq(campaigns.id, id), eq(campaigns.workspaceId, workspaceId))
        });
        if (!existing) return null;

        if (actorRole === 'User' || actorRole === 'Editor') {
            if (existing.creatorId !== actorId) {
                throw new Error('You can only delete your own campaigns.');
            }
        }

        const [deleted] = await this.db.delete(campaigns)
            .where(eq(campaigns.id, id))
            .returning();
        return deleted;
    }

    async retryCampaign(id: string, workspaceId: string) {
        // 1. Identify all failed/bounced contacts for this campaign
        const failedRecipients = await this.db.select({ contactId: campaignAnalytics.contactId })
            .from(campaignAnalytics)
            .where(and(
                eq(campaignAnalytics.campaignId, id),
                sql`${campaignAnalytics.eventType} IN ('FAILED', 'BOUNCED')`
            ));

        const uniqueFailedIds = [...new Set(failedRecipients.map(r => r.contactId).filter((id): id is string => !!id))];

        if (uniqueFailedIds.length === 0) {
            throw new Error("No failed or bounced recipients found to retry.");
        }

        // 2. Trigger the engine specifically for these IDs
        const engine = new CampaignsEngine(this.db as any);
        return await engine.executeCampaign(id, uniqueFailedIds);
    }

    async processExternalData(campaignId: string, rows: any[]) {
        // 1. Clear existing external data for this campaign to prevent duplicates
        await this.db.delete(campaignExternalData).where(eq(campaignExternalData.campaignId, campaignId));

        if (rows.length === 0) return;

        // 2. Prepare normalized records
        const records = rows.map(row => {
            const { identifier, ...data } = row;
            if (!identifier) return null;

            return {
                campaignId,
                identifier: normalizeIdentifier(String(identifier)),
                data: data // The rest of the columns become the dynamic placeholders
            };
        }).filter(r => r !== null) as any[];

        // 3. Batch insert (for performance)
        if (records.length > 0) {
            await this.db.insert(campaignExternalData).values(records);
        }
    }

    async previewContextMatch(workspaceId: string, groupIds: string[], externalData: { identifier: string }[]) {
        if (!groupIds.length || !externalData.length) {
            return { matchedCount: 0, unmatchedCount: externalData.length, totalExternal: externalData.length, unmatchedSamples: [] };
        }

        // 1. Resolve all identifiers in the selected groups
        // We fetch mobilePhone and email since either could be an identifier
        const engine = new CampaignsEngine(this.db as any);
        const contactIdentifiers = new Set<string>();

        for (const groupId of groupIds) {
            const contacts = await engine.resolveGroupContacts(groupId);
            contacts.forEach(c => {
                if (c.mobilePhone) contactIdentifiers.add(normalizeIdentifier(c.mobilePhone));
                if (c.email) contactIdentifiers.add(normalizeIdentifier(c.email));
            });
        }

        // 2. Compare with external data
        let matchedCount = 0;
        const unmatchedSamples: string[] = [];

        externalData.forEach(item => {
            const normalized = normalizeIdentifier(String(item.identifier));
            if (contactIdentifiers.has(normalized)) {
                matchedCount++;
            } else {
                if (unmatchedSamples.length < 5) unmatchedSamples.push(item.identifier);
            }
        });

        return {
            matched: matchedCount,
            unmatched: externalData.length - matchedCount,
            unmatchedIdentifiers: unmatchedSamples
        };
    }
}
