import { z } from 'zod';

export const createLocationSchema = z.object({
    name: z.string().min(1, 'Location name is required'),
    address: z.string().optional().nullable(),
    status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export const updateLocationSchema = z.object({
    name: z.string().min(1, 'Location name is required').optional(),
    address: z.string().optional().nullable(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});
