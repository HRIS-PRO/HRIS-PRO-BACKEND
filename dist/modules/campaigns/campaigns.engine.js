"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignsEngine = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../../db/schema");
const queue_service_1 = require("../queue/queue.service");
const phone_utils_1 = require("../../utils/phone-utils");
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
        let date = new Date(dateStr);
        if (!isNaN(date.getTime()))
            return date;
        // Fallback for explicit DD/MM/YYYY or DD-MM-YYYY when Javascript Date fails (e.g. 21/04/2000)
        const parts = dateStr.toString().split(/[\/\-]/);
        if (parts.length === 3) {
            const d = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            const y = parseInt(parts[2], 10);
            if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
                date = new Date(y, m - 1, d);
                if (!isNaN(date.getTime()))
                    return date;
            }
        }
        return null;
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
            let rawDate = contact[config.field];
            if (rawDate === undefined && contact.customFields) {
                rawDate = contact.customFields[config.field];
            }
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
    async executeCampaign(campaignId, targetCustomerIds) {
        const campaign = await this.dbClient.query.campaigns.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.campaigns.id, campaignId),
            with: { recipients: { with: { group: { with: { rules: true } } } } }
        });
        if (!campaign)
            throw new Error("Campaign not found");
        // Allowed statuses for execution: APPROVED (initial), SENDING (ongoing), COMPLETED (retry)
        if (campaign.status !== 'APPROVED' && campaign.status !== 'SENDING' && campaign.status !== 'COMPLETED') {
            throw new Error(`Campaign cannot be executed in current status: ${campaign.status}`);
        }
        await this.dbClient.update(schema_1.campaigns)
            .set({ status: 'SENDING', updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.campaigns.id, campaignId));
        try {
            const contacts = targetCustomerIds && targetCustomerIds.length > 0
                ? await this.dbClient.query.bulkCustomers.findMany({
                    where: (0, drizzle_orm_1.inArray)(schema_1.bulkCustomers.id, targetCustomerIds)
                })
                : await this.resolveCampaignContacts(campaign);
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
    async resolveGroupContacts(groupId) {
        const group = await this.dbClient.query.groups.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.groups.id, groupId),
            with: { rules: true }
        });
        if (!group)
            return [];
        return await this.resolveSingleGroupContacts(group);
    }
    async resolveSingleGroupContacts(group) {
        let groupContactIds = [];
        if (group.type === 'static') {
            const members = await this.dbClient.query.groupMembers.findMany({
                where: (0, drizzle_orm_1.eq)(schema_1.groupMembers.groupId, group.id)
            });
            groupContactIds = members.map(m => m.customerId);
        }
        else if (group.type === 'dynamic' && group.rules?.length > 0) {
            const rulesArr = group.rules;
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
            const members = await this.dbClient.query.bulkCustomers.findMany({
                where: (0, drizzle_orm_1.sql) `(${querySql})`
            });
            groupContactIds = members.map(m => m.id);
        }
        if (groupContactIds.length === 0)
            return [];
        return await this.dbClient.query.bulkCustomers.findMany({
            where: (0, drizzle_orm_1.inArray)(schema_1.bulkCustomers.id, groupContactIds)
        });
    }
    async resolveCampaignContacts(campaign) {
        const contactIds = new Set();
        const excludedContactIds = new Set();
        for (const recipientEntry of campaign.recipients) {
            const isExcluded = recipientEntry.isExcluded === 'true';
            const group = recipientEntry.group;
            if (!group)
                continue;
            const groupContacts = await this.resolveSingleGroupContacts(group);
            const groupContactIds = groupContacts.map(c => c.id);
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
        // Fetch External Contextual Data for this campaign
        const externalDataRecords = await this.dbClient.query.campaignExternalData.findMany({
            where: (0, drizzle_orm_1.eq)(schema_1.campaignExternalData.campaignId, campaign.id)
        });
        const externalDataMap = new Map();
        externalDataRecords.forEach(r => externalDataMap.set(r.identifier, r.data));
        // Fetch Group Contextual Data for this campaign's target groups
        const targetGroupIds = (campaign.recipients || []).map((r) => r.groupId).filter(Boolean);
        const groupContextRecords = targetGroupIds.length > 0
            ? await this.dbClient.query.groupContextualData.findMany({
                where: (0, drizzle_orm_1.inArray)(schema_1.groupContextualData.groupId, targetGroupIds)
            })
            : [];
        // Group context is keyed by customerId + groupId. 
        // If a customer is in multiple groups, we'll take the first match we find.
        const groupContextMap = new Map(); // customerId -> data
        groupContextRecords.forEach(r => {
            if (!groupContextMap.has(r.customerId)) {
                groupContextMap.set(r.customerId, r.data);
            }
        });
        const msPerHour = 3600000;
        const msDelayPerMsg = campaign.throttleRate && campaign.throttleRate > 0
            ? Math.floor(msPerHour / campaign.throttleRate)
            : 0;
        let currentDelay = 0;
        for (const contact of contacts) {
            try {
                // Merge external data if exists
                const contactKeyPhone = (0, phone_utils_1.normalizeIdentifier)(contact.mobilePhone);
                const contactKeyEmail = (0, phone_utils_1.normalizeIdentifier)(contact.email);
                // Precedence: Campaign External Data > Group Contextual Data
                const contextualData = {
                    ...(groupContextMap.get(contact.id) || {}),
                    ...(externalDataMap.get(contactKeyPhone) || externalDataMap.get(contactKeyEmail) || {})
                };
                let body = this.injectVariables(content.body, contact, contextualData);
                // If SMS or WHATSAPP, strip HTML tags from body
                if (campaign.channel === 'SMS' || campaign.channel === 'WHATSAPP') {
                    body = body.replace(/<[^>]*>/g, '');
                    // Handle common entities
                    body = body.replace(/&nbsp;/g, ' ')
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'");
                }
                const subject = content.subject ? this.injectVariables(content.subject, contact, contextualData) : "Mass Message";
                const preheader = content.preheader ? this.injectVariables(content.preheader, contact, contextualData) : "";
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
    injectVariables(template, contact, contextualData = {}) {
        if (!template)
            return "";
        let result = template
            .replace(/{{firstName}}/g, contact.firstName || "Customer")
            .replace(/{{surname}}/g, contact.surname || "")
            .replace(/{{fullName}}/g, contact.fullName || "Customer")
            .replace(/{{email}}/g, contact.email || "")
            .replace(/{{mobilePhone}}/g, (contact.mobilePhone && contact.mobilePhone.startsWith('234') ? '+' : '') + (contact.mobilePhone || ""));
        // Inject Dynamic Contextual Data from CSV
        Object.keys(contextualData).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            let value = contextualData[key] || "";
            const lowerKey = key.toLowerCase();
            const isIdentifier = lowerKey.includes('account') ||
                lowerKey.includes('number') ||
                lowerKey.includes('id') ||
                lowerKey.includes('bvn') ||
                lowerKey.includes('nin') ||
                lowerKey.includes('phone') ||
                lowerKey.includes('mobile') ||
                lowerKey.includes('code');
            // Auto-format numbers with commas (e.g. 2500 -> 2,500)
            // Skip formatting for identifiers like account numbers, BVNs, etc.
            if (!isIdentifier && (typeof value === 'number' || (!isNaN(Number(value)) && value.toString().length > 3 && !value.toString().includes('-')))) {
                const num = Number(value);
                value = num.toLocaleString('en-US');
            }
            result = result.replace(regex, value);
        });
        return result;
    }
}
exports.CampaignsEngine = CampaignsEngine;
