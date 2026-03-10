import { z } from 'zod';

export const createTemplateSchema = z.object({
    title: z.string().min(1),
    type: z.enum(['Email', 'SMS', 'WhatsApp']),
    status: z.enum(['Draft', 'Published']).default('Draft'),
    category: z.string().optional().nullable(),
    tags: z.array(z.string()).optional().nullable(),
    subject: z.string().optional().nullable(), // Email only
    content: z.string().min(1),
    metadata: z.record(z.string(), z.any()).optional().nullable(),
});

export const updateTemplateSchema = z.object({
    title: z.string().optional(),
    type: z.enum(['Email', 'SMS', 'WhatsApp']).optional(),
    status: z.enum(['Draft', 'Published']).optional(),
    category: z.string().optional().nullable(),
    tags: z.array(z.string()).optional().nullable(),
    subject: z.string().optional().nullable(),
    content: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional().nullable(),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
