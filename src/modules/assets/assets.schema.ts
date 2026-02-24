import { z } from 'zod';

export const createAssetSchema = z.object({
    name: z.string().min(1),
    category: z.string().min(1),
    serialNumber: z.string().optional(),
    purchasePrice: z.string().transform(Number),
    purchaseDate: z.string().min(1),
    condition: z.string().min(1),
    location: z.string().min(1),
    department: z.string().min(1),
    manager: z.string().min(1),
    assignedTo: z.string().optional(),
    description: z.string().optional(),
});

export const acceptAssetSchema = z.object({
    id: z.string().min(1),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
