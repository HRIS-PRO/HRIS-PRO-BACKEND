import { z } from 'zod';

export const createAssetLocationSchema = z.object({
    name: z.string().min(1),
});

export type CreateAssetLocationInput = z.infer<typeof createAssetLocationSchema>;
