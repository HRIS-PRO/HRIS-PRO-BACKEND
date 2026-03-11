"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWorker = exports.campaignWorker = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("./redis");
const queue_service_1 = require("./queue.service");
const zepto_bulk_service_1 = require("../campaigns/zepto-bulk.service");
const termii_1 = require("../shared/termii");
const db_1 = require("../../db");
const schema_1 = require("../../db/schema");
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
const startWorker = () => {
    console.log('[Worker] Campaign Worker Started');
};
exports.startWorker = startWorker;
