"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLocationSchema = exports.createLocationSchema = void 0;
const zod_1 = require("zod");
exports.createLocationSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Location name is required'),
    address: zod_1.z.string().optional().nullable(),
    status: zod_1.z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});
exports.updateLocationSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Location name is required').optional(),
    address: zod_1.z.string().optional().nullable(),
    status: zod_1.z.enum(['ACTIVE', 'INACTIVE']).optional(),
});
