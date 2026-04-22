"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignsService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../../db/schema");
const campaigns_engine_1 = require("./campaigns.engine");
const phone_utils_1 = require("../../utils/phone-utils");
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
                    const rulesArr = g.rules;
                    let querySql = (0, drizzle_orm_1.sql) `1=1`;
                    for (let i = 0; i < rulesArr.length; i++) {
                        const r = rulesArr[i];
                        const column = schema_1.bulkCustomers[r.field];
                        let condition = (0, drizzle_orm_1.sql) `1=1`;
                        if (column) {
                            switch (r.operator) {
                                case 'equals':
                                    condition = (0, drizzle_orm_1.sql) `${column} = ${r.value}`;
                                    break;
                                case 'not_equals':
                                    condition = (0, drizzle_orm_1.sql) `${column} != ${r.value}`;
                                    break;
                                case 'contains':
                                    condition = (0, drizzle_orm_1.sql) `${column} ILIKE ${'%' + r.value + '%'}`;
                                    break;
                                case 'starts_with':
                                    condition = (0, drizzle_orm_1.sql) `${column} ILIKE ${r.value + '%'}`;
                                    break;
                            }
                        }
                        else {
                            // Support for Custom Fields (JSONB)
                            const jsonColumn = (0, drizzle_orm_1.sql) `${schema_1.bulkCustomers.customFields}->>${r.field}`;
                            switch (r.operator) {
                                case 'equals':
                                    condition = (0, drizzle_orm_1.sql) `${jsonColumn} = ${r.value}`;
                                    break;
                                case 'not_equals':
                                    condition = (0, drizzle_orm_1.sql) `${jsonColumn} != ${r.value}`;
                                    break;
                                case 'contains':
                                    condition = (0, drizzle_orm_1.sql) `${jsonColumn} ILIKE ${'%' + r.value + '%'}`;
                                    break;
                                case 'starts_with':
                                    condition = (0, drizzle_orm_1.sql) `${jsonColumn} ILIKE ${r.value + '%'}`;
                                    break;
                            }
                        }
                        if (i === 0) {
                            querySql = condition;
                        }
                        else {
                            if (r.logicGate === 'OR') {
                                querySql = (0, drizzle_orm_1.sql) `${querySql} OR ${condition}`;
                            }
                            else {
                                querySql = (0, drizzle_orm_1.sql) `${querySql} AND ${condition}`;
                            }
                        }
                    }
                    const res = await this.db
                        .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                        .from(schema_1.bulkCustomers)
                        .where((0, drizzle_orm_1.sql) `(${querySql})`);
                    count = Number(res[0]?.count || 0);
                }
                totalReach += count;
            }
            // Fetch Analytics Stats - Unique counts only (if sent, they aren't 'failed' anymore)
            const sentRes = await this.db.select({ count: (0, drizzle_orm_1.sql) `count(DISTINCT ${schema_1.campaignAnalytics.contactId})` })
                .from(schema_1.campaignAnalytics)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.campaignAnalytics.campaignId, c.id), (0, drizzle_orm_1.eq)(schema_1.campaignAnalytics.eventType, 'SENT')));
            const sentCountValue = Number(sentRes[0]?.count || 0);
            const failedRes = await this.db.select({ count: (0, drizzle_orm_1.sql) `count(DISTINCT ${schema_1.campaignAnalytics.contactId})` })
                .from(schema_1.campaignAnalytics)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.campaignAnalytics.campaignId, c.id), (0, drizzle_orm_1.sql) `${schema_1.campaignAnalytics.eventType} IN ('FAILED', 'BOUNCED')`, 
            // Only count as failed if there is NO successful 'SENT' event for this contact in this campaign
            (0, drizzle_orm_1.sql) `NOT EXISTS (
                        SELECT 1 FROM "CAMPAIGN_ANALYTICS" sub 
                        WHERE sub."campaignId" = ${c.id} 
                        AND sub."contactId" = ${schema_1.campaignAnalytics.contactId} 
                        AND sub."eventType" = 'SENT'
                    )`));
            return {
                ...c,
                targetCount: totalReach,
                sentCount: sentCountValue,
                failedCount: Number(failedRes[0]?.count || 0),
                creatorName: c.creator?.employee?.firstName
                    ? `${c.creator.employee.firstName} ${c.creator.employee.surname}`
                    : (c.creator?.email || 'System')
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
            if (existing.status === 'REJECTED') {
                updateData.status = 'DRAFT';
                updateData.approverId = null;
            }
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
    async submitCampaign(id, workspaceId, actorId, actorRole) {
        const existing = await this.db.query.campaigns.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.campaigns.id, id), (0, drizzle_orm_1.eq)(schema_1.campaigns.workspaceId, workspaceId), (0, drizzle_orm_1.eq)(schema_1.campaigns.status, 'DRAFT'))
        });
        if (!existing)
            return null;
        // Skip flow for Admin or Manager
        if (actorRole === 'Admin' || actorRole === 'Manager') {
            const isRecurring = existing.cycleConfig || existing.anniversaryConfig;
            const status = existing.scheduledAt && new Date(existing.scheduledAt) > new Date() ? 'SCHEDULED' : 'APPROVED';
            const [updated] = await this.db.update(schema_1.campaigns)
                .set({ status })
                .where((0, drizzle_orm_1.eq)(schema_1.campaigns.id, id))
                .returning();
            if (updated.status === 'APPROVED' && !isRecurring) {
                const engine = new campaigns_engine_1.CampaignsEngine(this.db);
                engine.executeCampaign(updated.id).catch(console.error);
            }
            return updated;
        }
        // Add metadata marker
        const approvalStage = actorRole === 'User' ? 'EDITOR' : 'MANAGER';
        const newMetadata = { ...existing.content?.metadata, approvalStage };
        const newContent = { ...existing.content, metadata: newMetadata };
        const [updated] = await this.db.update(schema_1.campaigns)
            .set({ status: 'PENDING', content: newContent })
            .where((0, drizzle_orm_1.eq)(schema_1.campaigns.id, id))
            .returning();
        if (updated) {
            this.notifyApprovers(workspaceId, id, actorId, approvalStage).catch(console.error);
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
        const approvalStage = existing.content?.metadata?.approvalStage || 'MANAGER';
        await this.notifyApprovers(workspaceId, id, actorId, approvalStage);
        return existing;
    }
    async notifyApprovers(workspaceId, campaignId, actorId, stage) {
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
        const members = await this.db.select({ userRole: schema_1.userRoles.role, email: schema_1.users.email, firstName: (0, drizzle_orm_1.sql) `${schema_1.users.id}` })
            .from(schema_1.workspaceMembers)
            .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.workspaceMembers.userId, schema_1.users.id))
            .innerJoin(schema_1.userRoles, (0, drizzle_orm_1.eq)(schema_1.users.id, schema_1.userRoles.userId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.workspaceMembers.workspaceId, workspaceId), (0, drizzle_orm_1.eq)(schema_1.userRoles.app, 'MSGSCALE_BULK')));
        const eligibleApprovers = members.filter(m => {
            if (m.userRole === 'Admin')
                return true;
            if (stage === 'EDITOR')
                return m.userRole === 'Manager' || m.userRole === 'Editor';
            if (stage === 'MANAGER')
                return m.userRole === 'Manager';
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
                        <p style="margin:4px 0 0;font-size:14px"><strong>Workspace:</strong> ${workspace.title}</p>
                        <p style="margin:4px 0 0;font-size:14px"><strong>Channel:</strong> ${campaign.channel}</p>
                        <p style="margin:4px 0 0;font-size:14px"><strong>Submitted by:</strong> ${actorName}</p>
                    </div>
                    <p style="font-size:14px;color:#555">Please log in to review the details and approve or reject the broadcast.</p>
                    <div style="text-align:center;margin-top:32px">
                        <a href="https://msg.noltfinance.com" style="display:inline-block;background-color:#4F46E5;color:#fff;padding:14px 36px;border-radius:50px;text-decoration:none;font-weight:bold;font-size:14px">Review Campaign &rarr;</a>
                    </div>
                </div>
            `;
            (0, zepto_1.sendEmail)(email, `Approval Required: Campaign "${campaign.name}"`, emailHtml, `MsgScale Workspace: ${workspace.title}`, "MsgScale", undefined, "MsgScale").catch(console.error);
        }
    }
    async approveCampaign(id, workspaceId, approverId, action, approverRole) {
        return await this.db.transaction(async (tx) => {
            const existing = await tx.query.campaigns.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.campaigns.id, id), (0, drizzle_orm_1.eq)(schema_1.campaigns.workspaceId, workspaceId), (0, drizzle_orm_1.eq)(schema_1.campaigns.status, 'PENDING'))
            });
            if (!existing)
                return null;
            if (existing.creatorId === approverId && approverRole !== 'Admin') {
                throw new Error("You cannot approve or reject your own campaign.");
            }
            const currentStage = existing.content?.metadata?.approvalStage || 'MANAGER';
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
                const newMetadata = { ...existing.content?.metadata, approvalStage: 'MANAGER' };
                const newContent = { ...existing.content, metadata: newMetadata };
                const [updated] = await tx.update(schema_1.campaigns)
                    .set({ content: newContent })
                    .where((0, drizzle_orm_1.eq)(schema_1.campaigns.id, id))
                    .returning();
                this.notifyApprovers(workspaceId, id, approverId, 'MANAGER').catch(console.error);
                return updated;
            }
            // Final Approval or Reject
            const isRecurring = existing.cycleConfig || existing.anniversaryConfig;
            const status = action === 'APPROVE'
                ? (existing.scheduledAt && new Date(existing.scheduledAt) > new Date() ? 'SCHEDULED' : 'APPROVED')
                : 'REJECTED';
            const [updated] = await tx.update(schema_1.campaigns)
                .set({
                status,
                approverId,
                updatedAt: new Date()
            })
                .where((0, drizzle_orm_1.eq)(schema_1.campaigns.id, id))
                .returning();
            if (updated && updated.status === 'APPROVED' && !isRecurring) {
                const engine = new campaigns_engine_1.CampaignsEngine(this.db);
                engine.executeCampaign(updated.id).catch(err => {
                    console.error(`Automatic campaign execution failed for ${updated.id}:`, err);
                });
            }
            return updated;
        });
    }
    async deleteCampaign(id, workspaceId, actorId, actorRole) {
        const existing = await this.db.query.campaigns.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.campaigns.id, id), (0, drizzle_orm_1.eq)(schema_1.campaigns.workspaceId, workspaceId))
        });
        if (!existing)
            return null;
        if (actorRole === 'User' || actorRole === 'Editor') {
            if (existing.creatorId !== actorId) {
                throw new Error('You can only delete your own campaigns.');
            }
        }
        const [deleted] = await this.db.delete(schema_1.campaigns)
            .where((0, drizzle_orm_1.eq)(schema_1.campaigns.id, id))
            .returning();
        return deleted;
    }
    async retryCampaign(id, workspaceId) {
        // 1. Identify all failed/bounced contacts for this campaign
        const failedRecipients = await this.db.select({ contactId: schema_1.campaignAnalytics.contactId })
            .from(schema_1.campaignAnalytics)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.campaignAnalytics.campaignId, id), (0, drizzle_orm_1.sql) `${schema_1.campaignAnalytics.eventType} IN ('FAILED', 'BOUNCED')`));
        const uniqueFailedIds = [...new Set(failedRecipients.map(r => r.contactId).filter((id) => !!id))];
        if (uniqueFailedIds.length === 0) {
            throw new Error("No failed or bounced recipients found to retry.");
        }
        // 2. Trigger the engine specifically for these IDs
        const engine = new campaigns_engine_1.CampaignsEngine(this.db);
        return await engine.executeCampaign(id, uniqueFailedIds);
    }
    async processExternalData(campaignId, rows) {
        // 1. Clear existing external data for this campaign to prevent duplicates
        await this.db.delete(schema_1.campaignExternalData).where((0, drizzle_orm_1.eq)(schema_1.campaignExternalData.campaignId, campaignId));
        if (rows.length === 0)
            return;
        // 2. Prepare normalized records
        const records = rows.map(row => {
            const { identifier, ...data } = row;
            if (!identifier)
                return null;
            return {
                campaignId,
                identifier: (0, phone_utils_1.normalizeIdentifier)(String(identifier)),
                data: data // The rest of the columns become the dynamic placeholders
            };
        }).filter(r => r !== null);
        // 3. Batch insert (for performance)
        if (records.length > 0) {
            await this.db.insert(schema_1.campaignExternalData).values(records);
        }
    }
    async previewContextMatch(workspaceId, groupIds, externalData) {
        if (!groupIds.length) {
            return { matched: 0, unmatched: externalData?.length || 0, unmatchedIdentifiers: [], sampleContacts: [] };
        }
        const engine = new campaigns_engine_1.CampaignsEngine(this.db);
        const contactIdentifiers = new Map();
        const sampleContacts = [];
        for (const groupId of groupIds) {
            const contacts = await engine.resolveGroupContacts(groupId);
            contacts.forEach(c => {
                const contactData = { ...c };
                if (c.customFields) {
                    Object.assign(contactData, c.customFields);
                }
                if (c.mobilePhone)
                    contactIdentifiers.set((0, phone_utils_1.normalizeIdentifier)(c.mobilePhone), contactData);
                if (c.email)
                    contactIdentifiers.set((0, phone_utils_1.normalizeIdentifier)(c.email), contactData);
                if (sampleContacts.length < 10) {
                    sampleContacts.push(contactData);
                }
            });
        }
        if (!externalData || externalData.length === 0) {
            return { matched: 0, unmatched: 0, unmatchedIdentifiers: [], sampleContacts: sampleContacts.slice(0, 10) };
        }
        let matchedCount = 0;
        const unmatchedSamples = [];
        const enrichedSamples = [];
        externalData.forEach(item => {
            const normalized = (0, phone_utils_1.normalizeIdentifier)(String(item.identifier));
            if (contactIdentifiers.has(normalized)) {
                matchedCount++;
                const contact = contactIdentifiers.get(normalized);
                if (enrichedSamples.length < 10) {
                    const enriched = { ...contact, ...item };
                    if (item.data)
                        Object.assign(enriched, item.data);
                    enrichedSamples.push(enriched);
                }
            }
            else {
                if (unmatchedSamples.length < 5)
                    unmatchedSamples.push(item.identifier);
            }
        });
        return {
            matched: matchedCount,
            unmatched: externalData.length - matchedCount,
            unmatchedIdentifiers: unmatchedSamples,
            sampleContacts: enrichedSamples.length > 0 ? enrichedSamples : sampleContacts.slice(0, 10)
        };
    }
}
exports.CampaignsService = CampaignsService;
