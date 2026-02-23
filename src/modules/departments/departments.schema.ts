import { z } from 'zod';
import { departmentStatusEnum } from '../../db/schema';

export const createDepartmentSchema = z.object({
    name: z.string().min(1, 'Department name is required'),
    description: z.string().optional(),
    parentId: z.string().uuid().optional().nullable(),
    headId: z.string().uuid().optional().nullable(),
    icon: z.string().optional().nullable(),
    color: z.string().optional().nullable(),
    status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

export const updateDepartmentSchema = z.object({
    name: z.string().min(1, 'Department name is required').optional(),
    description: z.string().optional(),
    parentId: z.string().uuid().optional().nullable(),
    headId: z.string().uuid().optional().nullable(),
    icon: z.string().optional().nullable(),
    color: z.string().optional().nullable(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
