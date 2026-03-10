import { Queue } from 'bullmq';
import { connection } from './redis';

export interface CampaignJobPayload {
    campaignId: string;
    contactId: string;
    contactEmail?: string;
    contactPhone?: string;
    channel: 'EMAIL' | 'SMS' | 'WHATSAPP';
    subject?: string;
    preheader?: string;
    body: string;
    fromName?: string;
    fromEmail?: string;
    senderId?: string; // SMS
    category?: string;
}

export const CAMPAIGN_QUEUE_NAME = 'campaign-messages';

// Create a new queue instance
export const campaignQueue = new Queue<CampaignJobPayload>(CAMPAIGN_QUEUE_NAME, {
    connection: connection as any,
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

export const addCampaignJob = async (jobId: string, payload: CampaignJobPayload, delayMs: number = 0) => {
    await campaignQueue.add('send-message', payload, {
        jobId, // Unique ID to prevent duplicates if retried
        delay: delayMs > 0 ? delayMs : undefined,
    });
};
