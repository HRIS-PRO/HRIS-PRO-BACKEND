import { Worker, Job } from 'bullmq';
import { connection } from './redis';
import { CampaignJobPayload, CAMPAIGN_QUEUE_NAME, CAMPAIGN_SCHEDULER_QUEUE_NAME, addSchedulerJob } from './queue.service';
import { sendBulkEmail } from '../campaigns/zepto-bulk.service';
import { sendSms } from '../shared/termii';
import { db } from '../../db';
import { campaignAnalytics, campaigns } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { CampaignsEngine } from '../campaigns/campaigns.engine';

const processCampaignMessage = async (job: Job<CampaignJobPayload>) => {
    const { data } = job;

    try {
        if (data.channel === 'EMAIL' && data.contactEmail) {
            await sendBulkEmail(
                data.contactEmail,
                data.subject || 'Mass Message',
                data.body,
                data.preheader || '',
                data.fromName,
                data.fromEmail
            );
        } else if (data.channel === 'SMS' && data.contactPhone) {
            const senderId = data.senderId || 'NOLTFINANCE';
            const smsChannel = data.category?.toLowerCase() === 'transactional' ? 'dnd' : 'generic';
            await sendSms(data.contactPhone, data.body, smsChannel, senderId);
        } else if (data.channel === 'WHATSAPP') {
            console.log(`[WhatsApp Simulation] To ${data.contactPhone}: ${data.body}`);
        }

        // Log success
        await db.insert(campaignAnalytics).values({
            campaignId: data.campaignId,
            contactId: data.contactId,
            eventType: 'SENT',
            occurredAt: new Date()
        });

    } catch (error: any) {
        console.error(`[Worker] Failed to process job ${job.id} for contact ${data.contactId}:`, error);

        // Log failure
        await db.insert(campaignAnalytics).values({
            campaignId: data.campaignId,
            contactId: data.contactId,
            eventType: 'FAILED',
            metadata: { error: error.message },
            occurredAt: new Date()
        });

        // Re-throw so BullMQ knows it failed and applies retry strategy
        throw error;
    }
};

// Create the worker
export const campaignWorker = new Worker(CAMPAIGN_QUEUE_NAME, processCampaignMessage, {
    connection: connection as any,
    // By default process 50 jobs concurrently if available and not throttled
    concurrency: 50,
});

// We listen to completed and failed events locally for logging
campaignWorker.on('completed', (job: Job) => {
    console.log(`[Worker] Job ${job.id} has completed!`);
});

campaignWorker.on('failed', (job: Job | undefined, err: Error) => {
    console.error(`[Worker] Job ${job?.id} has failed with ${err.message}`);
});

// Create the Scheduler Worker
export const campaignSchedulerWorker = new Worker(CAMPAIGN_SCHEDULER_QUEUE_NAME, async (job: Job) => {
    console.log(`[Scheduler] Running campaign checks at ${new Date().toISOString()}`);
    const engine = new CampaignsEngine(db as any);
    await engine.processScheduledCampaigns();
}, {
    connection: connection as any,
    concurrency: 1, // Only run one scheduler check at a time
});

campaignSchedulerWorker.on('completed', (job: Job) => {
    console.log(`[Scheduler] Job ${job.id} completed checks.`);
});

campaignSchedulerWorker.on('failed', (job: Job | undefined, err: Error) => {
    console.error(`[Scheduler] Job ${job?.id} failed checks: ${err.message}`);
});

export const startWorker = () => {
    console.log('[Worker] Campaign Workers Started');
    addSchedulerJob().catch(err => console.error('[Scheduler] Failed to add repeatable job', err));
};
