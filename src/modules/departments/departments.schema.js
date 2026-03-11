"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDepartmentSchema = exports.createDepartmentSchema = void 0;
const zod_1 = require("zod");
exports.createDepartmentSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Department name is required'),
    description: zod_1.z.string().optional(),
    parentId: zod_1.z.string().uuid().optional().nullable(),
    headId: zod_1.z.string().uuid().optional().nullable(),
    icon: zod_1.z.string().optional().nullable(),
    color: zod_1.z.string().optional().nullable(),
    status: zod_1.z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});
exports.updateDepartmentSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Department name is required').optional(),
    description: zod_1.z.string().optional(),
    parentId: zod_1.z.string().uuid().optional().nullable(),
    headId: zod_1.z.string().uuid().optional().nullable(),
    icon: zod_1.z.string().optional().nullable(),
    color: zod_1.z.string().optional().nullable(),
    status: zod_1.z.enum(['ACTIVE', 'INACTIVE']).optional(),
});
