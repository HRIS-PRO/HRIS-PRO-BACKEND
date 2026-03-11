"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateReportStatusSchema = exports.createReportSchema = void 0;
const zod_1 = require("zod");
exports.createReportSchema = zod_1.z.object({
    assetId: zod_1.z.string().min(1),
    comment: zod_1.z.string().min(1),
});
exports.updateReportStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['PENDING', 'IN_REVIEW', 'RESOLVED']),
});
