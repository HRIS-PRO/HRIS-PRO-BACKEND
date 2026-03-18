"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addSchedulerJob = exports.campaignSchedulerQueue = exports.CAMPAIGN_SCHEDULER_QUEUE_NAME = exports.addCampaignJob = exports.campaignQueue = exports.CAMPAIGN_QUEUE_NAME = void 0;
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
exports.CAMPAIGN_SCHEDULER_QUEUE_NAME = 'campaign-scheduler';
exports.campaignSchedulerQueue = new bullmq_1.Queue(exports.CAMPAIGN_SCHEDULER_QUEUE_NAME, {
    connection: redis_1.connection,
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
    },
});
const addSchedulerJob = async () => {
    await exports.campaignSchedulerQueue.add('check-campaigns', {}, {
        repeat: {
            pattern: '0 * * * *', // Run at the top of every hour
        },
        jobId: 'campaign-scheduler-job' // Ensure only one instance of the repeatable job exists
    });
};
exports.addSchedulerJob = addSchedulerJob;
