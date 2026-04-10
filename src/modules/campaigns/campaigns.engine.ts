import { eq, and, sql, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { bulkCustomers, campaignAnalytics, campaigns, groupMembers, campaignExternalData, groupContextualData, campaignRecipients } from '../../db/schema';
import { addCampaignJob } from '../queue/queue.service';
import { normalizeIdentifier } from '../../utils/phone-utils';

export class CampaignsEngine {
    constructor(private dbClient: typeof db) { }

    async processScheduledCampaigns() {
        const activeCampaigns = await this.dbClient.query.campaigns.findMany({
            where: eq(campaigns.status, 'APPROVED')
        });

        for (const campaign of activeCampaigns) {
            try {
                if (campaign.cycleConfig) {
                    await this.executeCycleCampaign(campaign.id);
                } else if (campaign.anniversaryConfig) {
                    await this.executeAnniversaryCampaign(campaign.id);
                }
            } catch (error) {
                console.error(`Failed to process scheduled campaign ${campaign.id}:`, error);
            }
        }
    }

    private parseDateAnyFormat(dateStr: string | null | undefined): Date | null {
        if (!dateStr) return null;
        
        // Check if it's an Excel serial date (numeric string)
        if (!isNaN(Number(dateStr)) && Number(dateStr) > 1000) {
            const excelDays = Number(dateStr);
            const date = new Date((excelDays - (excelDays > 59 ? 25569 : 25568)) * 86400 * 1000);
            return isNaN(date.getTime()) ? null : date;
        }

        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
    }

    async executeCycleCampaign(campaignId: string) {
        const campaign = await this.dbClient.query.campaigns.findFirst({
            where: eq(campaigns.id, campaignId),
            with: { recipients: { with: { group: { with: { rules: true } } } } }
        });
        if (!campaign || !campaign.cycleConfig) return;

        const config = campaign.cycleConfig as any;
        const now = new Date();
        const currentHour = now.getHours();

        if (config.time) {
            const [hourStr] = config.time.split(':');
            const targetHour = parseInt(hourStr, 10);
            if (currentHour !== targetHour) return;
        }

        if (config.type === 'weekly') {
            const jsDay = now.getDay();
            const mappedDay = jsDay === 0 ? 6 : jsDay - 1; // Map JS Sunday=0 to Frontend Sunday=6
            if (config.dayOfWeek !== mappedDay) return;
        }

        const allContacts = await this.resolveCampaignContacts(campaign);
        if (allContacts.length === 0) return;

        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const recentAnalytics = await this.dbClient.query.campaignAnalytics.findFirst({
            where: and(
                eq(campaignAnalytics.campaignId, campaign.id),
                sql`${campaignAnalytics.occurredAt} >= ${startOfDay}`
            )
        });

        if (recentAnalytics) return; // Already triggered this campaign today

        await this.dispatchToContacts(campaign, allContacts);
    }

    async executeAnniversaryCampaign(campaignId: string) {
        const campaign = await this.dbClient.query.campaigns.findFirst({
            where: eq(campaigns.id, campaignId),
            with: { recipients: { with: { group: { with: { rules: true } } } } }
        });
        if (!campaign || !campaign.anniversaryConfig) return;

        const config = campaign.anniversaryConfig as any;
        const now = new Date();
        const currentHour = now.getHours();

        if (config.time) {
            const [hourStr] = config.time.split(':');
            const targetHour = parseInt(hourStr, 10);
            if (currentHour !== targetHour) return;
        }

        const allContacts = await this.resolveCampaignContacts(campaign);
        if (allContacts.length === 0) return;

        const currentMonth = now.getMonth();
        const currentDate = now.getDate();
        
        const anniversaryContacts = allContacts.filter(contact => {
            const rawDate = (contact as any)[config.field];
            const parsedDate = this.parseDateAnyFormat(rawDate);
            if (!parsedDate) return false;
            
            return parsedDate.getMonth() === currentMonth && parsedDate.getDate() === currentDate;
        });

        if (anniversaryContacts.length === 0) return;

        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const pastSends = await this.dbClient.query.campaignAnalytics.findMany({
            where: and(
                eq(campaignAnalytics.campaignId, campaign.id),
                sql`${campaignAnalytics.occurredAt} >= ${startOfYear}`
            ),
            columns: { contactId: true }
        });
        const pastSendSet = new Set(pastSends.map(p => p.contactId));

        const pendingContacts = anniversaryContacts.filter(c => !pastSendSet.has(c.id));
        if (pendingContacts.length === 0) return;

        await this.dispatchToContacts(campaign, pendingContacts);
    }

    async executeCampaign(campaignId: string, targetCustomerIds?: string[]) {
        const campaign = await this.dbClient.query.campaigns.findFirst({
            where: eq(campaigns.id, campaignId),
            with: { recipients: { with: { group: { with: { rules: true } } } } }
        });

        if (!campaign) throw new Error("Campaign not found");
        
        // Allowed statuses for execution: APPROVED (initial), SENDING (ongoing), COMPLETED (retry)
        if (campaign.status !== 'APPROVED' && campaign.status !== 'SENDING' && campaign.status !== 'COMPLETED') {
            throw new Error(`Campaign cannot be executed in current status: ${campaign.status}`);
        }

        await this.dbClient.update(campaigns)
            .set({ status: 'SENDING', updatedAt: new Date() })
            .where(eq(campaigns.id, campaignId));

        try {
            const contacts = targetCustomerIds && targetCustomerIds.length > 0
                ? await this.dbClient.query.bulkCustomers.findMany({
                    where: inArray(bulkCustomers.id, targetCustomerIds)
                })
                : await this.resolveCampaignContacts(campaign);

            if (contacts.length === 0) {
                await this.dbClient.update(campaigns)
                    .set({ status: 'COMPLETED', updatedAt: new Date() })
                    .where(eq(campaigns.id, campaignId));
                return { sent: 0, message: "No recipients found" };
            }

            const result = await this.dispatchToContacts(campaign, contacts);

            await this.dbClient.update(campaigns)
                .set({ status: 'COMPLETED', updatedAt: new Date() })
                .where(eq(campaigns.id, campaignId));

            return result;
        } catch (error: any) {
            console.error("Critical campaign execution failure:", error);
            await this.dbClient.update(campaigns)
                .set({ status: 'FAILED', updatedAt: new Date() })
                .where(eq(campaigns.id, campaignId));
            throw error;
        }
    }

    private async resolveCampaignContacts(campaign: any) {
        const contactIds = new Set<string>();
        const excludedContactIds = new Set<string>();

        for (const recipientEntry of campaign.recipients) {
            const isExcluded = recipientEntry.isExcluded === 'true';
            const group = recipientEntry.group;
            if (!group) continue;

            let groupContactIds: string[] = [];

            if (group.type === 'static') {
                const members = await this.dbClient.query.groupMembers.findMany({
                    where: eq(groupMembers.groupId, group.id)
                });
                groupContactIds = members.map(m => m.customerId);
            } else if (group.type === 'dynamic' && (group as any).rules?.length > 0) {
                const rulesArr: any[] = (group as any).rules;
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

                const members = await this.dbClient.query.bulkCustomers.findMany({
                    where: sql`(${querySql})`
                });
                groupContactIds = members.map(m => m.id);
            }

            if (isExcluded) {
                groupContactIds.forEach(id => excludedContactIds.add(id));
            } else {
                groupContactIds.forEach(id => contactIds.add(id));
            }
        }

        const finalContactIds = Array.from(contactIds).filter(id => !excludedContactIds.has(id));
        if (finalContactIds.length === 0) return [];

        return await this.dbClient.query.bulkCustomers.findMany({
            where: inArray(bulkCustomers.id, finalContactIds)
        });
    }

    private async dispatchToContacts(campaign: any, contacts: any[]) {
        const content = campaign.content as any;
        let successCount = 0;

        // Fetch External Contextual Data for this campaign
        const externalDataRecords = await this.dbClient.query.campaignExternalData.findMany({
            where: eq(campaignExternalData.campaignId, campaign.id)
        });
        const externalDataMap = new Map<string, any>();
        externalDataRecords.forEach(r => externalDataMap.set(r.identifier, r.data));

        // Fetch Group Contextual Data for this campaign's target groups
        const targetGroupIds = (campaign.recipients || []).map((r: any) => r.groupId).filter(Boolean);
        const groupContextRecords = targetGroupIds.length > 0
            ? await this.dbClient.query.groupContextualData.findMany({
                where: inArray(groupContextualData.groupId, targetGroupIds)
            })
            : [];
        
        // Group context is keyed by customerId + groupId. 
        // If a customer is in multiple groups, we'll take the first match we find.
        const groupContextMap = new Map<string, any>(); // customerId -> data
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
                const contactKeyPhone = normalizeIdentifier(contact.mobilePhone);
                const contactKeyEmail = normalizeIdentifier(contact.email);
                
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

                await addCampaignJob(jobId, {
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
            } catch (err: any) {
                console.error(`Failed to dispatch job to queue for contact ${contact.id}:`, err);
                await this.dbClient.insert(campaignAnalytics).values({
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

    private injectVariables(template: string, contact: any, contextualData: any = {}) {
        if (!template) return "";
        let result = template
            .replace(/{{firstName}}/g, contact.firstName || "Customer")
            .replace(/{{surname}}/g, contact.surname || "")
            .replace(/{{fullName}}/g, contact.fullName || "Customer")
            .replace(/{{email}}/g, contact.email || "")
            .replace(/{{mobilePhone}}/g, contact.mobilePhone || "");

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
