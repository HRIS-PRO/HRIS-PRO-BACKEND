"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignRoleSchema = exports.createEmployeeSchema = void 0;
const zod_1 = require("zod");
exports.createEmployeeSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1),
    surname: zod_1.z.string().min(1),
    middleName: zod_1.z.string().optional(),
    workEmail: zod_1.z.string().email(),
    personalEmail: zod_1.z.string().email().optional(),
    phoneNumber: zod_1.z.string().optional(),
    departmentId: zod_1.z.string().uuid(),
    roleId: zod_1.z.string().min(1),
    location: zod_1.z.string().min(1),
    hiringManagerId: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
    status: zod_1.z.enum(['ACTIVE', 'REMOTE', 'ON_LEAVE', 'TERMINATED']).default('ACTIVE')
});
exports.assignRoleSchema = zod_1.z.object({
    role: zod_1.z.string().min(1)
});
