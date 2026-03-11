"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAssetLocationSchema = void 0;
const zod_1 = require("zod");
exports.createAssetLocationSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
});
