"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditVerificationSchema = exports.createAuditCycleSchema = void 0;
const zod_1 = require("zod");
exports.createAuditCycleSchema = zod_1.z.object({
    name: zod_1.z.string(),
    startDate: zod_1.z.string(),
    endDate: zod_1.z.string(),
    auditorIds: zod_1.z.array(zod_1.z.string().uuid()).optional()
});
exports.createAuditVerificationSchema = zod_1.z.object({
    assetId: zod_1.z.string(),
    result: zod_1.z.enum(["Verified", "Missing", "Damaged", "Unclear"]),
    notes: zod_1.z.string().optional()
});
