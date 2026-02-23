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
    hiringManagerId: z.string().min(1),
    status: z.enum(['ACTIVE', 'REMOTE', 'ON_LEAVE', 'TERMINATED']).default('ACTIVE')
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
