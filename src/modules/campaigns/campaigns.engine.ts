import { eq, and, sql, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { bulkCustomers, campaignAnalytics, campaignRecipients, campaigns, groupMembers, groups } from '../../db/schema';
import { addCampaignJob } from '../queue/queue.service';
import { sendBulkEmail } from './zepto-bulk.service';
import { sendSms } from '../shared/termii';

export class CampaignsEngine {
    constructor(private dbClient: typeof db) { }

    async executeCampaign(campaignId: string) {
        const campaign = await this.dbClient.query.campaigns.findFirst({
            where: eq(campaigns.id, campaignId),
            with: {
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

        if (!campaign) throw new Error("Campaign not found");
        if (campaign.status !== 'APPROVED' && campaign.status !== 'SENDING') {
            throw new Error(`Campaign cannot be executed in current status: ${campaign.status}`);
        }

        // 1. Mark as SENDING
        await this.dbClient.update(campaigns)
            .set({ status: 'SENDING', updatedAt: new Date() })
            .where(eq(campaigns.id, campaignId));

        try {
            // 2. Resolve all unique contacts
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
                    const conditions = (group as any).rules.map((rule: any) => {
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
                    const members = await this.dbClient.query.bulkCustomers.findMany({
                        where: and(...conditions)
                    });
                    groupContactIds = members.map(m => m.id);
                }

                if (isExcluded) {
                    groupContactIds.forEach(id => excludedContactIds.add(id));
                } else {
                    groupContactIds.forEach(id => contactIds.add(id));
                }
            }

            // Final list: included minus excluded
            const finalContactIds = Array.from(contactIds).filter(id => !excludedContactIds.has(id));

            if (finalContactIds.length === 0) {
                await this.dbClient.update(campaigns)
                    .set({ status: 'COMPLETED', updatedAt: new Date() })
                    .where(eq(campaigns.id, campaignId));
                return { sent: 0, message: "No recipients found" };
            }

            // 3. Fetch contact details and send
            const contacts = await this.dbClient.query.bulkCustomers.findMany({
                where: inArray(bulkCustomers.id, finalContactIds)
            });

            const content = campaign.content as any;
            let successCount = 0;
            // Removed failCount tracking locally since jobs are processed later by the worker

            // Determine if we need to throttle jobs by adding incremental delays
            // throttleRate is messages per hour (e.g. 3600/hr = 1 msg every 1000ms = 1 sec)
            const msPerHour = 3600000;
            const msDelayPerMsg = campaign.throttleRate && campaign.throttleRate > 0
                ? Math.floor(msPerHour / campaign.throttleRate)
                : 0;

            let currentDelay = 0;

            for (const contact of contacts) {
                try {
                    // Variable injection
                    const body = this.injectVariables(content.body, contact);
                    const subject = content.subject ? this.injectVariables(content.subject, contact) : "Mass Message";
                    const preheader = content.preheader ? this.injectVariables(content.preheader, contact) : "";

                    const jobId = `camp_${campaign.id}_${contact.id}`;

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

                    // Add delay to the next job if throttling is needed
                    if (msDelayPerMsg > 0) {
                        currentDelay += msDelayPerMsg;
                    }

                    successCount++;
                } catch (err: any) {
                    console.error(`Failed to dispatch job to queue for contact ${contact.id}:`, err);
                    // Log failure analytic locally if queueing entirely failed
                    await this.dbClient.insert(campaignAnalytics).values({
                        campaignId: campaign.id,
                        contactId: contact.id,
                        eventType: 'FAILED',
                        metadata: { error: "Failed to queue job: " + err.message },
                        occurredAt: new Date()
                    });
                }
            }

            // 4. Mark as scheduled or sending (the worker handles final completion right now analytically)
            await this.dbClient.update(campaigns)
                .set({
                    status: 'COMPLETED', // Still marked completed indicating it has hit the queue completely
                    updatedAt: new Date()
                })
                .where(eq(campaigns.id, campaignId));

            return { queuedCount: successCount };

        } catch (error: any) {
            console.error("Critical campaign execution failure:", error);
            await this.dbClient.update(campaigns)
                .set({ status: 'FAILED', updatedAt: new Date() })
                .where(eq(campaigns.id, campaignId));
            throw error;
        }
    }

    private injectVariables(template: string, contact: any) {
        if (!template) return "";
        return template
            .replace(/{{firstName}}/g, contact.firstName || "Customer")
            .replace(/{{surname}}/g, contact.surname || "")
            .replace(/{{fullName}}/g, contact.fullName || "Customer")
            .replace(/{{email}}/g, contact.email || "")
            .replace(/{{mobilePhone}}/g, contact.mobilePhone || "");
    }
}
