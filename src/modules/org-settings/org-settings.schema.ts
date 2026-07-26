import { z } from 'zod';

export const THEME_IDS = ['default', 'emerald', 'violet', 'rose', 'amber', 'teal'] as const;

export const updateOrgSettingsSchema = z.object({
    orgName: z.string().trim().min(2, 'Organization name must be at least 2 characters').max(120).optional(),
    contactEmail: z.string().trim().email('Invalid contact email').max(160).optional(),
    theme: z.enum(THEME_IDS).optional(),
    logoUrl: z.string().trim().nullable().optional(),
}).refine(data => Object.keys(data).length > 0, { message: 'At least one field is required' });

export type UpdateOrgSettingsInput = z.infer<typeof updateOrgSettingsSchema>;
