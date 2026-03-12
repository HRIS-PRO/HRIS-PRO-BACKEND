import { z } from 'zod';

export const createCampaignSchema = z.object({
    name: z.string().min(1),
    channel: z.enum(['EMAIL', 'SMS', 'WHATSAPP']),
    category: z.enum(['PROMOTIONAL', 'TRANSACTIONAL', 'NEWSLETTER']),
    content: z.object({
        subject: z.string().optional(),
        preheader: z.string().optional(),
        body: z.string().min(1),
        metadata: z.record(z.string(), z.any()).optional(),
    }),
    scheduledAt: z.string().optional().nullable(),
    throttleRate: z.number().optional().nullable(),
    cycleConfig: z.object({
        type: z.enum(['daily', 'weekly']),
        dayOfWeek: z.number().nullable(),
        time: z.string()
    }).optional().nullable(),
    anniversaryConfig: z.object({
        field: z.string(),
        time: z.string()
    }).optional().nullable(),
    recipients: z.array(z.object({
        groupId: z.string().uuid(),
        isExcluded: z.boolean().default(false),
    })),
});

export const updateCampaignSchema = createCampaignSchema.partial();

export const approveCampaignSchema = z.object({
    action: z.enum(['APPROVE', 'REJECT']),
    reason: z.string().optional(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
