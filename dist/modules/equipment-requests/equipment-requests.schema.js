"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEquipmentRequestStatusSchema = exports.createEquipmentRequestSchema = void 0;
const zod_1 = require("zod");
exports.createEquipmentRequestSchema = zod_1.z.object({
    categoryId: zod_1.z.string().uuid(),
    priority: zod_1.z.enum(['STANDARD', 'HIGH', 'CRITICAL']),
    justification: zod_1.z.string().min(5),
});
exports.updateEquipmentRequestStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['PENDING_HOD', 'PENDING_HOO', 'PENDING_CATEGORY_ADMIN', 'APPROVED', 'REJECTED']),
});
