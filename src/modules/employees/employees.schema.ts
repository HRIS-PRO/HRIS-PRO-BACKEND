import { z } from 'zod';

export const createEmployeeSchema = z.object({
    firstName: z.string().min(1),
    surname: z.string().min(1),
    middleName: z.string().optional(),
    workEmail: z.string().email(),
    personalEmail: z.string().email().optional(),
    phoneNumber: z.string().optional(),
    departmentId: z.string().uuid(),
    roleId: z.string().min(1),
    location: z.string().min(1),
    hiringManagerId: z.string().optional().nullable().or(z.literal('')),
    status: z.enum(['ACTIVE', 'REMOTE', 'ON_LEAVE', 'TERMINATED']).default('ACTIVE')
});

export const assignRoleSchema = z.object({
    role: z.string().min(1)
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
