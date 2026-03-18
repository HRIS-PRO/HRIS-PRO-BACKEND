import { z } from 'zod';

export const createAuditCycleSchema = z.object({
    name: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    auditorIds: z.array(z.string().uuid()).optional()
});

export const createAuditVerificationSchema = z.object({
    assetId: z.string(),
    result: z.enum(["Verified", "Missing", "Damaged", "Unclear"]),
    notes: z.string().optional()
});

export type CreateAuditCycleInput = z.infer<typeof createAuditCycleSchema>;
export type CreateAuditVerificationInput = z.infer<typeof createAuditVerificationSchema>;
