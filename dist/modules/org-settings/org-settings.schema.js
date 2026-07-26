"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrgSettingsSchema = exports.THEME_IDS = void 0;
const zod_1 = require("zod");
exports.THEME_IDS = ['default', 'emerald', 'violet', 'rose', 'amber', 'teal'];
exports.updateOrgSettingsSchema = zod_1.z.object({
    orgName: zod_1.z.string().trim().min(2, 'Organization name must be at least 2 characters').max(120).optional(),
    contactEmail: zod_1.z.string().trim().email('Invalid contact email').max(160).optional(),
    theme: zod_1.z.enum(exports.THEME_IDS).optional(),
    logoUrl: zod_1.z.string().trim().nullable().optional(),
}).refine(data => Object.keys(data).length > 0, { message: 'At least one field is required' });
