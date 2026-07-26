"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrgSettingsController = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../../db");
const schema_1 = require("../../db/schema");
const org_settings_service_1 = require("./org-settings.service");
const storage_service_1 = require("../shared/storage.service");
const crypto_1 = __importDefault(require("crypto"));
const service = new org_settings_service_1.OrgSettingsService();
const ADMIN_ROLES = ['Super Admin', 'Admin User'];
const ALLOWED_LOGO_MIME_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;
class OrgSettingsController {
    async get(request, reply) {
        const settings = await service.get();
        return reply.send(settings);
    }
    async update(request, reply) {
        const userId = request.user?.id;
        const adminRoles = await db_1.db.select({ id: schema_1.userRoles.id })
            .from(schema_1.userRoles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userRoles.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userRoles.app, 'ASSET_TRACKER'), (0, drizzle_orm_1.inArray)(schema_1.userRoles.role, ADMIN_ROLES)));
        if (adminRoles.length === 0) {
            return reply.code(403).send({ message: 'Access Denied: Only administrators can update organization settings.' });
        }
        const settings = await service.update(request.body, userId);
        return reply.send(settings);
    }
    async uploadLogo(request, reply) {
        const userId = request.user?.id;
        const adminRoles = await db_1.db.select({ id: schema_1.userRoles.id })
            .from(schema_1.userRoles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userRoles.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userRoles.app, 'ASSET_TRACKER'), (0, drizzle_orm_1.inArray)(schema_1.userRoles.role, ADMIN_ROLES)));
        if (adminRoles.length === 0) {
            return reply.code(403).send({ message: 'Access Denied: Only administrators can update organization settings.' });
        }
        try {
            const data = await request.file();
            if (!data) {
                return reply.code(400).send({ message: 'No file uploaded' });
            }
            if (!ALLOWED_LOGO_MIME_TYPES.includes(data.mimetype)) {
                return reply.code(400).send({ message: 'Unsupported file type. Please upload a PNG, JPG, SVG, or WebP image.' });
            }
            const buffer = await data.toBuffer();
            if (buffer.length > MAX_LOGO_SIZE_BYTES) {
                return reply.code(400).send({ message: 'Logo image size must be less than 2MB' });
            }
            const extension = data.filename.split('.').pop() || 'png';
            const uniqueFilename = `org-logo-${crypto_1.default.randomUUID()}.${extension}`;
            const path = `org-branding/${uniqueFilename}`;
            const uploadResult = await storage_service_1.StorageService.uploadFile({ buffer, mimetype: data.mimetype }, path, 'AssetTracker');
            const settings = await service.update({ logoUrl: uploadResult.url }, userId);
            return reply.send(settings);
        }
        catch (error) {
            console.error('Org logo upload error:', error);
            return reply.code(400).send({ message: error.message || 'Failed to upload logo' });
        }
    }
}
exports.OrgSettingsController = OrgSettingsController;
