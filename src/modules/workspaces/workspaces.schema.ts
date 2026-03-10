import { z } from 'zod';

export const createWorkspaceSchema = z.object({
    title: z.string().min(1),
    status: z.enum(['ACTIVE', 'MAINTENANCE', 'SUSPENDED']).default('ACTIVE'),
    logo_url: z.string().url().optional(),
    members: z.array(z.string().uuid()).optional(), // Initial list of user IDs to add as members
});

export const updateWorkspaceSchema = z.object({
    title: z.string().min(1).optional(),
    status: z.enum(['ACTIVE', 'MAINTENANCE', 'SUSPENDED']).optional(),
    logo_url: z.string().url().optional().nullable(),
});

export const addMemberSchema = z.object({
    userId: z.string().uuid(),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
