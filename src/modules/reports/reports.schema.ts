import { z } from 'zod';

export const createReportSchema = z.object({
    assetId: z.string().min(1),
    comment: z.string().min(1),
});

export const updateReportStatusSchema = z.object({
    status: z.enum(['PENDING', 'IN_REVIEW', 'RESOLVED']),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type UpdateReportStatusInput = z.infer<typeof updateReportStatusSchema>;
