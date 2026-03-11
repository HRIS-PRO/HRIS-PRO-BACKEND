"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addMemberSchema = exports.updateWorkspaceSchema = exports.createWorkspaceSchema = void 0;
const zod_1 = require("zod");
exports.createWorkspaceSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    status: zod_1.z.enum(['ACTIVE', 'MAINTENANCE', 'SUSPENDED']).default('ACTIVE'),
    logo_url: zod_1.z.string().url().optional(),
    members: zod_1.z.array(zod_1.z.string().uuid()).optional(), // Initial list of user IDs to add as members
});
exports.updateWorkspaceSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).optional(),
    status: zod_1.z.enum(['ACTIVE', 'MAINTENANCE', 'SUSPENDED']).optional(),
    logo_url: zod_1.z.string().url().optional().nullable(),
});
exports.addMemberSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
});
