import { z } from 'zod';

export const createAssetCategorySchema = z.object({
    name: z.string().min(1),
    mnemonic: z.string().optional(),
    managedById: z.string().uuid().optional().nullable(),
});

export const updateAssetCategorySchema = z.object({
    name: z.string().min(1).optional(),
    mnemonic: z.string().optional(),
    managedById: z.string().uuid().optional().nullable(),
});

export type CreateAssetCategoryInput = z.infer<typeof createAssetCategorySchema>;
export type UpdateAssetCategoryInput = z.infer<typeof updateAssetCategorySchema>;
