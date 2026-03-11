"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addCampaignJob = exports.campaignQueue = exports.CAMPAIGN_QUEUE_NAME = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("./redis");
exports.CAMPAIGN_QUEUE_NAME = 'campaign-messages';
// Create a new queue instance
exports.campaignQueue = new bullmq_1.Queue(exports.CAMPAIGN_QUEUE_NAME, {
    connection: redis_1.connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false, // Keep failed jobs for inspection/retry
    },
});
const addCampaignJob = async (jobId, payload, delayMs = 0) => {
    await exports.campaignQueue.add('send-message', payload, {
        jobId, // Unique ID to prevent duplicates if retried
        delay: delayMs > 0 ? delayMs : undefined,
    });
};
exports.addCampaignJob = addCampaignJob;
