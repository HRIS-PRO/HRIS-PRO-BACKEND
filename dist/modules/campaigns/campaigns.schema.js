"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.approveCampaignSchema = exports.updateCampaignSchema = exports.createCampaignSchema = void 0;
const zod_1 = require("zod");
exports.createCampaignSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    channel: zod_1.z.enum(['EMAIL', 'SMS', 'WHATSAPP']),
    category: zod_1.z.enum(['PROMOTIONAL', 'TRANSACTIONAL', 'NEWSLETTER']),
    content: zod_1.z.object({
        subject: zod_1.z.string().optional(),
        preheader: zod_1.z.string().optional(),
        body: zod_1.z.string().min(1),
        metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    }),
    scheduledAt: zod_1.z.string().optional().nullable(),
    throttleRate: zod_1.z.number().optional().nullable(),
    recipients: zod_1.z.array(zod_1.z.object({
        groupId: zod_1.z.string().uuid(),
        isExcluded: zod_1.z.boolean().default(false),
    })),
});
exports.updateCampaignSchema = exports.createCampaignSchema.partial();
exports.approveCampaignSchema = zod_1.z.object({
    action: zod_1.z.enum(['APPROVE', 'REJECT']),
    reason: zod_1.z.string().optional(),
});
