"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignsService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../../db/schema");
const campaigns_engine_1 = require("./campaigns.engine");
const zepto_bulk_service_1 = require("./zepto-bulk.service");
const zepto_1 = require("../shared/zepto");
class CampaignsService {
    db;
    constructor(db) {
        this.db = db;
    }
    async sendTestEmail(workspaceId, payload) {
        // This avoids creating a full campaign object and hits Zepto directly for testing
        // You could theoretically add some basic variable injection here too for the test user
        const testSubject = payload.subject || 'Test Message';
        await (0, zepto_bulk_service_1.sendBulkEmail)(payload.to, testSubject, payload.htmlContent, payload.preheader, payload.fromName, payload.fromEmail);
        return { success: true, message: `Test email sent to ${payload.to}` };
    }
    async getCampaigns(workspaceId) {
        const results = await this.db.query.campaigns.findMany({
            where: (0, drizzle_orm_1.eq)(schema_1.campaigns.workspaceId, workspaceId),
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
                if (r.isExcluded === 'true' || !r.group)
                    continue;
                let count = 0;
                const g = r.group;
                if (g.type === 'static') {
                    const res = await this.db
                        .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                        .from(schema_1.groupMembers)
                        .where((0, drizzle_orm_1.eq)(schema_1.groupMembers.groupId, g.id));
                    count = Number(res[0]?.count || 0);
                }
                else if (g.type === 'dynamic' && g.rules?.length > 0) {
                    const conditions = g.rules.map((rule) => {
                        const column = schema_1.bulkCustomers[rule.field];
                        if (!column)
                            return (0, drizzle_orm_1.sql) `1=1`;
                        switch (rule.operator) {
                            case 'equals': return (0, drizzle_orm_1.eq)(column, rule.value);
                            case 'not_equals': return (0, drizzle_orm_1.sql) `${column} != ${rule.value}`;
                            case 'contains': return (0, drizzle_orm_1.sql) `${column} ILIKE ${'%' + rule.value + '%'}`;
                            case 'starts_with': return (0, drizzle_orm_1.sql) `${column} ILIKE ${rule.value + '%'}`;
                            default: return (0, drizzle_orm_1.sql) `1=1`;
                        }
                    });
                    const res = await this.db
                        .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                        .from(schema_1.bulkCustomers)
                        .where((0, drizzle_orm_1.and)(...conditions));
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
    async getCampaignById(id, workspaceId) {
        return await this.db.query.campaigns.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.campaigns.id, id), (0, drizzle_orm_1.eq)(schema_1.campaigns.workspaceId, workspaceId)),
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
    async createCampaign(workspaceId, creatorId, data) {
        const { recipients, ...rest } = data;
        return await this.db.transaction(async (tx) => {
            const [newCampaign] = await tx.insert(schema_1.campaigns).values({
                ...rest,
                workspaceId,
                creatorId,
                status: 'DRAFT',
                content: rest.content, // jsonb
                scheduledAt: rest.scheduledAt ? new Date(rest.scheduledAt) : null,
            }).returning();
            if (recipients && recipients.length > 0) {
                await tx.insert(schema_1.campaignRecipients).values(recipients.map(r => ({
                    campaignId: newCampaign.id,
                    groupId: r.groupId,
                    isExcluded: r.isExcluded.toString(),
                })));
            }
            return newCampaign;
        });
    }
    async updateCampaign(id, workspaceId, data) {
        const { recipients, ...rest } = data;
        return await this.db.transaction(async (tx) => {
            const existing = await tx.query.campaigns.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.campaigns.id, id), (0, drizzle_orm_1.eq)(schema_1.campaigns.workspaceId, workspaceId))
            });
            if (!existing)
                throw new Error("Campaign not found");
            if (existing.status !== 'DRAFT' && existing.status !== 'REJECTED') {
                throw new Error("Only drafts or rejected campaigns can be updated");
            }
            const updateData = { ...rest };
            if (rest.content)
                updateData.content = rest.content;
            if (rest.scheduledAt)
                updateData.scheduledAt = new Date(rest.scheduledAt);
            const [updatedCampaign] = await tx.update(schema_1.campaigns)
                .set(updateData)
                .where((0, drizzle_orm_1.eq)(schema_1.campaigns.id, id))
                .returning();
            if (recipients) {
                // Simple replace for recipients
                await tx.delete(schema_1.campaignRecipients).where((0, drizzle_orm_1.eq)(schema_1.campaignRecipients.campaignId, id));
                if (recipients.length > 0) {
                    await tx.insert(schema_1.campaignRecipients).values(recipients.map(r => ({
                        campaignId: id,
                        groupId: r.groupId,
                        isExcluded: r.isExcluded.toString(),
                    })));
                }
            }
            return updatedCampaign;
        });
    }
    async submitCampaign(id, workspaceId, actorId) {
        const [updated] = await this.db.update(schema_1.campaigns)
            .set({ status: 'PENDING' })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.campaigns.id, id), (0, drizzle_orm_1.eq)(schema_1.campaigns.workspaceId, workspaceId), (0, drizzle_orm_1.eq)(schema_1.campaigns.status, 'DRAFT')))
            .returning();
        if (updated) {
            this.notifyApprovers(workspaceId, id, actorId).catch(err => {
                console.error(`Failed to notify approvers for campaign ${id}:`, err);
            });
        }
        return updated;
    }
    async resendApprovalNotification(id, workspaceId, actorId) {
        const existing = await this.db.query.campaigns.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.campaigns.id, id), (0, drizzle_orm_1.eq)(schema_1.campaigns.workspaceId, workspaceId), (0, drizzle_orm_1.eq)(schema_1.campaigns.status, 'PENDING'))
        });
        if (!existing) {
            throw new Error("Campaign not found or not in PENDING state.");
        }
        await this.notifyApprovers(workspaceId, id, actorId);
        return existing;
    }
    async notifyApprovers(workspaceId, campaignId, actorId) {
        const workspace = await this.db.query.workspaces.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.workspaces.id, workspaceId),
        });
        const campaign = await this.db.query.campaigns.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.campaigns.id, campaignId),
        });
        if (!workspace || !campaign)
            return;
        const actor = await this.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.users.id, actorId),
            with: { employee: true },
        });
        const actorName = actor?.employee
            ? `${actor.employee.firstName} ${actor.employee.surname}`
            : actor?.email || 'A user';
        // Find all Admins or Managers in the workspace for MSGSCALE_BULK
        const members = await this.db.select({ userRole: schema_1.userRoles.role, email: schema_1.users.email, firstName: (0, drizzle_orm_1.sql) `${schema_1.users.id}` /* Dummy for now, we'll fetch full user if needed */ })
            .from(schema_1.workspaceMembers)
            .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.workspaceMembers.userId, schema_1.users.id))
            .innerJoin(schema_1.userRoles, (0, drizzle_orm_1.eq)(schema_1.users.id, schema_1.userRoles.userId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.workspaceMembers.workspaceId, workspaceId), (0, drizzle_orm_1.eq)(schema_1.userRoles.app, 'MSGSCALE_BULK')));
        const eligibleApprovers = members.filter(m => m.userRole === 'Admin' || m.userRole === 'Manager');
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
            (0, zepto_1.sendEmail)(email, `Approval Required: Campaign "${campaign.name}"`, emailHtml, `MsgScale Workspace: ${workspace.title}`, "MsgScale", undefined, "MsgScale").catch(console.error);
        }
    }
    async approveCampaign(id, workspaceId, approverId, action) {
        const status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
        return await this.db.transaction(async (tx) => {
            // Fetch first to check creator
            const existing = await tx.query.campaigns.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.campaigns.id, id), (0, drizzle_orm_1.eq)(schema_1.campaigns.workspaceId, workspaceId), (0, drizzle_orm_1.eq)(schema_1.campaigns.status, 'PENDING'))
            });
            if (!existing) {
                return null;
            }
            if (existing.creatorId === approverId) {
                throw new Error("You cannot approve or reject your own campaign.");
            }
            const [updated] = await tx.update(schema_1.campaigns)
                .set({
                status,
                approverId,
                updatedAt: new Date()
            })
                .where((0, drizzle_orm_1.eq)(schema_1.campaigns.id, id))
                .returning();
            if (updated && action === 'APPROVE') {
                // If not scheduled for future, run immediately
                if (!updated.scheduledAt || new Date(updated.scheduledAt) <= new Date()) {
                    const engine = new campaigns_engine_1.CampaignsEngine(this.db);
                    // Run asynchronously in background so approval response is fast
                    engine.executeCampaign(updated.id).catch(err => {
                        console.error(`Automatic campaign execution failed for ${updated.id}:`, err);
                    });
                }
                else {
                    // Mark as SCHEDULED
                    await tx.update(schema_1.campaigns)
                        .set({ status: 'SCHEDULED' })
                        .where((0, drizzle_orm_1.eq)(schema_1.campaigns.id, id));
                }
            }
            return updated;
        });
    }
    async deleteCampaign(id, workspaceId) {
        const [deleted] = await this.db.delete(schema_1.campaigns)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.campaigns.id, id), (0, drizzle_orm_1.eq)(schema_1.campaigns.workspaceId, workspaceId)))
            .returning();
        return deleted;
    }
}
exports.CampaignsService = CampaignsService;
