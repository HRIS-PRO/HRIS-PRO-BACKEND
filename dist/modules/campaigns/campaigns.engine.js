"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignsEngine = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../../db/schema");
const queue_service_1 = require("../queue/queue.service");
class CampaignsEngine {
    dbClient;
    constructor(dbClient) {
        this.dbClient = dbClient;
    }
    async processScheduledCampaigns() {
        const activeCampaigns = await this.dbClient.query.campaigns.findMany({
            where: (0, drizzle_orm_1.eq)(schema_1.campaigns.status, 'APPROVED')
        });
        for (const campaign of activeCampaigns) {
            try {
                if (campaign.cycleConfig) {
                    await this.executeCycleCampaign(campaign.id);
                }
                else if (campaign.anniversaryConfig) {
                    await this.executeAnniversaryCampaign(campaign.id);
                }
            }
            catch (error) {
                console.error(`Failed to process scheduled campaign ${campaign.id}:`, error);
            }
        }
    }
    parseDateAnyFormat(dateStr) {
        if (!dateStr)
            return null;
        // Check if it's an Excel serial date (numeric string)
        if (!isNaN(Number(dateStr)) && Number(dateStr) > 1000) {
            const excelDays = Number(dateStr);
            const date = new Date((excelDays - (excelDays > 59 ? 25569 : 25568)) * 86400 * 1000);
            return isNaN(date.getTime()) ? null : date;
        }
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
    }
    async executeCycleCampaign(campaignId) {
        const campaign = await this.dbClient.query.campaigns.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.campaigns.id, campaignId),
            with: { recipients: { with: { group: { with: { rules: true } } } } }
        });
        if (!campaign || !campaign.cycleConfig)
            return;
        const config = campaign.cycleConfig;
        const now = new Date();
        const currentHour = now.getHours();
        if (config.time) {
            const [hourStr] = config.time.split(':');
            const targetHour = parseInt(hourStr, 10);
            if (currentHour !== targetHour)
                return;
        }
        if (config.type === 'weekly') {
            const jsDay = now.getDay();
            const mappedDay = jsDay === 0 ? 6 : jsDay - 1; // Map JS Sunday=0 to Frontend Sunday=6
            if (config.dayOfWeek !== mappedDay)
                return;
        }
        const allContacts = await this.resolveCampaignContacts(campaign);
        if (allContacts.length === 0)
            return;
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const recentAnalytics = await this.dbClient.query.campaignAnalytics.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.campaignAnalytics.campaignId, campaign.id), (0, drizzle_orm_1.sql) `${schema_1.campaignAnalytics.occurredAt} >= ${startOfDay}`)
        });
        if (recentAnalytics)
            return; // Already triggered this campaign today
        await this.dispatchToContacts(campaign, allContacts);
    }
    async executeAnniversaryCampaign(campaignId) {
        const campaign = await this.dbClient.query.campaigns.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.campaigns.id, campaignId),
            with: { recipients: { with: { group: { with: { rules: true } } } } }
        });
        if (!campaign || !campaign.anniversaryConfig)
            return;
        const config = campaign.anniversaryConfig;
        const now = new Date();
        const currentHour = now.getHours();
        if (config.time) {
            const [hourStr] = config.time.split(':');
            const targetHour = parseInt(hourStr, 10);
            if (currentHour !== targetHour)
                return;
        }
        const allContacts = await this.resolveCampaignContacts(campaign);
        if (allContacts.length === 0)
            return;
        const currentMonth = now.getMonth();
        const currentDate = now.getDate();
        const anniversaryContacts = allContacts.filter(contact => {
            const rawDate = contact[config.field];
            const parsedDate = this.parseDateAnyFormat(rawDate);
            if (!parsedDate)
                return false;
            return parsedDate.getMonth() === currentMonth && parsedDate.getDate() === currentDate;
        });
        if (anniversaryContacts.length === 0)
            return;
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const pastSends = await this.dbClient.query.campaignAnalytics.findMany({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.campaignAnalytics.campaignId, campaign.id), (0, drizzle_orm_1.sql) `${schema_1.campaignAnalytics.occurredAt} >= ${startOfYear}`),
            columns: { contactId: true }
        });
        const pastSendSet = new Set(pastSends.map(p => p.contactId));
        const pendingContacts = anniversaryContacts.filter(c => !pastSendSet.has(c.id));
        if (pendingContacts.length === 0)
            return;
        await this.dispatchToContacts(campaign, pendingContacts);
    }
    async executeCampaign(campaignId) {
        const campaign = await this.dbClient.query.campaigns.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.campaigns.id, campaignId),
            with: { recipients: { with: { group: { with: { rules: true } } } } }
        });
        if (!campaign)
            throw new Error("Campaign not found");
        if (campaign.status !== 'APPROVED' && campaign.status !== 'SENDING') {
            throw new Error(`Campaign cannot be executed in current status: ${campaign.status}`);
        }
        await this.dbClient.update(schema_1.campaigns)
            .set({ status: 'SENDING', updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.campaigns.id, campaignId));
        try {
            const contacts = await this.resolveCampaignContacts(campaign);
            if (contacts.length === 0) {
                await this.dbClient.update(schema_1.campaigns)
                    .set({ status: 'COMPLETED', updatedAt: new Date() })
                    .where((0, drizzle_orm_1.eq)(schema_1.campaigns.id, campaignId));
                return { sent: 0, message: "No recipients found" };
            }
            const result = await this.dispatchToContacts(campaign, contacts);
            await this.dbClient.update(schema_1.campaigns)
                .set({ status: 'COMPLETED', updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.campaigns.id, campaignId));
            return result;
        }
        catch (error) {
            console.error("Critical campaign execution failure:", error);
            await this.dbClient.update(schema_1.campaigns)
                .set({ status: 'FAILED', updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.campaigns.id, campaignId));
            throw error;
        }
    }
    async resolveCampaignContacts(campaign) {
        const contactIds = new Set();
        const excludedContactIds = new Set();
        for (const recipientEntry of campaign.recipients) {
            const isExcluded = recipientEntry.isExcluded === 'true';
            const group = recipientEntry.group;
            if (!group)
                continue;
            let groupContactIds = [];
            if (group.type === 'static') {
                const members = await this.dbClient.query.groupMembers.findMany({
                    where: (0, drizzle_orm_1.eq)(schema_1.groupMembers.groupId, group.id)
                });
                groupContactIds = members.map(m => m.customerId);
            }
            else if (group.type === 'dynamic' && group.rules?.length > 0) {
                const conditions = group.rules.map((rule) => {
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
                const members = await this.dbClient.query.bulkCustomers.findMany({
                    where: (0, drizzle_orm_1.and)(...conditions)
                });
                groupContactIds = members.map(m => m.id);
            }
            if (isExcluded) {
                groupContactIds.forEach(id => excludedContactIds.add(id));
            }
            else {
                groupContactIds.forEach(id => contactIds.add(id));
            }
        }
        const finalContactIds = Array.from(contactIds).filter(id => !excludedContactIds.has(id));
        if (finalContactIds.length === 0)
            return [];
        return await this.dbClient.query.bulkCustomers.findMany({
            where: (0, drizzle_orm_1.inArray)(schema_1.bulkCustomers.id, finalContactIds)
        });
    }
    async dispatchToContacts(campaign, contacts) {
        const content = campaign.content;
        let successCount = 0;
        const msPerHour = 3600000;
        const msDelayPerMsg = campaign.throttleRate && campaign.throttleRate > 0
            ? Math.floor(msPerHour / campaign.throttleRate)
            : 0;
        let currentDelay = 0;
        for (const contact of contacts) {
            try {
                const body = this.injectVariables(content.body, contact);
                const subject = content.subject ? this.injectVariables(content.subject, contact) : "Mass Message";
                const preheader = content.preheader ? this.injectVariables(content.preheader, contact) : "";
                const jobId = `camp_${campaign.id}_${contact.id}_${Date.now()}`;
                await (0, queue_service_1.addCampaignJob)(jobId, {
                    campaignId: campaign.id,
                    contactId: contact.id,
                    contactEmail: contact.email || undefined,
                    contactPhone: contact.mobilePhone || undefined,
                    channel: campaign.channel,
                    subject,
                    preheader,
                    body,
                    fromName: content.senderId,
                    fromEmail: content.fromEmail,
                    senderId: content.senderId,
                    category: campaign.category
                }, currentDelay);
                if (msDelayPerMsg > 0) {
                    currentDelay += msDelayPerMsg;
                }
                successCount++;
            }
            catch (err) {
                console.error(`Failed to dispatch job to queue for contact ${contact.id}:`, err);
                await this.dbClient.insert(schema_1.campaignAnalytics).values({
                    campaignId: campaign.id,
                    contactId: contact.id,
                    eventType: 'FAILED',
                    metadata: { error: "Failed to queue job: " + err.message },
                    occurredAt: new Date()
                });
            }
        }
        return { queuedCount: successCount };
    }
    injectVariables(template, contact) {
        if (!template)
            return "";
        return template
            .replace(/{{firstName}}/g, contact.firstName || "Customer")
            .replace(/{{surname}}/g, contact.surname || "")
            .replace(/{{fullName}}/g, contact.fullName || "Customer")
            .replace(/{{email}}/g, contact.email || "")
            .replace(/{{mobilePhone}}/g, contact.mobilePhone || "");
    }
}
exports.CampaignsEngine = CampaignsEngine;
