"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTemplateSchema = exports.createTemplateSchema = void 0;
const zod_1 = require("zod");
exports.createTemplateSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    type: zod_1.z.enum(['Email', 'SMS', 'WhatsApp']),
    status: zod_1.z.enum(['Draft', 'Published']).default('Draft'),
    category: zod_1.z.string().optional().nullable(),
    tags: zod_1.z.array(zod_1.z.string()).optional().nullable(),
    subject: zod_1.z.string().optional().nullable(), // Email only
    content: zod_1.z.string().min(1),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional().nullable(),
});
exports.updateTemplateSchema = zod_1.z.object({
    title: zod_1.z.string().optional(),
    type: zod_1.z.enum(['Email', 'SMS', 'WhatsApp']).optional(),
    status: zod_1.z.enum(['Draft', 'Published']).optional(),
    category: zod_1.z.string().optional().nullable(),
    tags: zod_1.z.array(zod_1.z.string()).optional().nullable(),
    subject: zod_1.z.string().optional().nullable(),
    content: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional().nullable(),
});
