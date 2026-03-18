"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWorker = exports.campaignSchedulerWorker = exports.campaignWorker = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("./redis");
const queue_service_1 = require("./queue.service");
const zepto_bulk_service_1 = require("../campaigns/zepto-bulk.service");
const termii_1 = require("../shared/termii");
const db_1 = require("../../db");
const schema_1 = require("../../db/schema");
const campaigns_engine_1 = require("../campaigns/campaigns.engine");
const processCampaignMessage = async (job) => {
    const { data } = job;
    try {
        if (data.channel === 'EMAIL' && data.contactEmail) {
            await (0, zepto_bulk_service_1.sendBulkEmail)(data.contactEmail, data.subject || 'Mass Message', data.body, data.preheader || '', data.fromName, data.fromEmail);
        }
        else if (data.channel === 'SMS' && data.contactPhone) {
            const senderId = data.senderId || 'NOLTFINANCE';
            const smsChannel = data.category?.toLowerCase() === 'transactional' ? 'dnd' : 'generic';
            await (0, termii_1.sendSms)(data.contactPhone, data.body, smsChannel, senderId);
        }
        else if (data.channel === 'WHATSAPP') {
            console.log(`[WhatsApp Simulation] To ${data.contactPhone}: ${data.body}`);
        }
        // Log success
        await db_1.db.insert(schema_1.campaignAnalytics).values({
            campaignId: data.campaignId,
            contactId: data.contactId,
            eventType: 'SENT',
            occurredAt: new Date()
        });
    }
    catch (error) {
        console.error(`[Worker] Failed to process job ${job.id} for contact ${data.contactId}:`, error);
        // Log failure
        await db_1.db.insert(schema_1.campaignAnalytics).values({
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
exports.campaignWorker = new bullmq_1.Worker(queue_service_1.CAMPAIGN_QUEUE_NAME, processCampaignMessage, {
    connection: redis_1.connection,
    // By default process 50 jobs concurrently if available and not throttled
    concurrency: 50,
});
// We listen to completed and failed events locally for logging
exports.campaignWorker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} has completed!`);
});
exports.campaignWorker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} has failed with ${err.message}`);
});
// Create the Scheduler Worker
exports.campaignSchedulerWorker = new bullmq_1.Worker(queue_service_1.CAMPAIGN_SCHEDULER_QUEUE_NAME, async (job) => {
    console.log(`[Scheduler] Running campaign checks at ${new Date().toISOString()}`);
    const engine = new campaigns_engine_1.CampaignsEngine(db_1.db);
    await engine.processScheduledCampaigns();
}, {
    connection: redis_1.connection,
    concurrency: 1, // Only run one scheduler check at a time
});
exports.campaignSchedulerWorker.on('completed', (job) => {
    console.log(`[Scheduler] Job ${job.id} completed checks.`);
});
exports.campaignSchedulerWorker.on('failed', (job, err) => {
    console.error(`[Scheduler] Job ${job?.id} failed checks: ${err.message}`);
});
const startWorker = () => {
    console.log('[Worker] Campaign Workers Started');
    (0, queue_service_1.addSchedulerJob)().catch(err => console.error('[Scheduler] Failed to add repeatable job', err));
};
exports.startWorker = startWorker;
