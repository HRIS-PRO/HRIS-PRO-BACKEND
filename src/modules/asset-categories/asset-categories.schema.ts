import { z } from 'zod';

export const createAssetCategorySchema = z.object({
    name: z.string().min(1),
    managedById: z.string().uuid().optional(),
});

export type CreateAssetCategoryInput = z.infer<typeof createAssetCategorySchema>;
