"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decommissionAssetSchema = exports.reassignAssetSchema = exports.acceptAssetSchema = exports.createAssetSchema = void 0;
const zod_1 = require("zod");
exports.createAssetSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    category: zod_1.z.string().min(1),
    serialNumber: zod_1.z.string().optional(),
    purchasePrice: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).transform(String),
    purchaseDate: zod_1.z.string().min(1),
    condition: zod_1.z.string().min(1),
    location: zod_1.z.string().min(1),
    department: zod_1.z.string().min(1),
    manager: zod_1.z.string().min(1),
    assignedTo: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
});
exports.acceptAssetSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
});
exports.reassignAssetSchema = zod_1.z.object({
    assetId: zod_1.z.string().min(1),
    assignedTo: zod_1.z.string().min(1),
    department: zod_1.z.string().min(1),
    manager: zod_1.z.string().min(1),
});
exports.decommissionAssetSchema = zod_1.z.object({
    assetId: zod_1.z.string().min(1)
});
