import { z } from 'zod';

export const createEquipmentRequestSchema = z.object({
    categoryId: z.string().uuid(),
    priority: z.enum(['STANDARD', 'HIGH', 'CRITICAL']),
    justification: z.string().min(5),
});

export const updateEquipmentRequestStatusSchema = z.object({
    status: z.enum(['PENDING_HOD', 'PENDING_HOO', 'PENDING_CATEGORY_ADMIN', 'APPROVED', 'REJECTED']),
});

export type CreateEquipmentRequestInput = z.infer<typeof createEquipmentRequestSchema>;
export type UpdateEquipmentRequestStatusInput = z.infer<typeof updateEquipmentRequestStatusSchema>;
