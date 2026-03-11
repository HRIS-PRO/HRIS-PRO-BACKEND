"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAssetCategorySchema = void 0;
const zod_1 = require("zod");
exports.createAssetCategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    managedById: zod_1.z.string().uuid().optional(),
});
