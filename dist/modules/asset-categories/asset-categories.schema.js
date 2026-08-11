"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAssetCategorySchema = exports.createAssetCategorySchema = void 0;
const zod_1 = require("zod");
exports.createAssetCategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    mnemonic: zod_1.z.string().optional(),
    managedById: zod_1.z.string().uuid().optional().nullable(),
});
exports.updateAssetCategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    mnemonic: zod_1.z.string().optional(),
    managedById: zod_1.z.string().uuid().optional().nullable(),
});
