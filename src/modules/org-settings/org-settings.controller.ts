import { FastifyReply, FastifyRequest } from 'fastify';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { userRoles } from '../../db/schema';
import { OrgSettingsService } from './org-settings.service';
import { UpdateOrgSettingsInput } from './org-settings.schema';

import { StorageService } from '../shared/storage.service';
import crypto from 'crypto';

const service = new OrgSettingsService();

const ADMIN_ROLES = ['Super Admin', 'Admin User'];
const ALLOWED_LOGO_MIME_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;

export class OrgSettingsController {
    async get(request: FastifyRequest, reply: FastifyReply) {
        const settings = await service.get();
        return reply.send(settings);
    }

    async update(request: FastifyRequest<{ Body: UpdateOrgSettingsInput }>, reply: FastifyReply) {
        const userId = (request.user as any)?.id;

        const adminRoles = await db.select({ id: userRoles.id })
            .from(userRoles)
            .where(and(
                eq(userRoles.userId, userId),
                eq(userRoles.app, 'ASSET_TRACKER'),
                inArray(userRoles.role, ADMIN_ROLES)
            ));

        if (adminRoles.length === 0) {
            return reply.code(403).send({ message: 'Access Denied: Only administrators can update organization settings.' });
        }

        const settings = await service.update(request.body, userId);
        return reply.send(settings);
    }

    async uploadLogo(request: FastifyRequest, reply: FastifyReply) {
        const userId = (request.user as any)?.id;

        const adminRoles = await db.select({ id: userRoles.id })
            .from(userRoles)
            .where(and(
                eq(userRoles.userId, userId),
                eq(userRoles.app, 'ASSET_TRACKER'),
                inArray(userRoles.role, ADMIN_ROLES)
            ));

        if (adminRoles.length === 0) {
            return reply.code(403).send({ message: 'Access Denied: Only administrators can update organization settings.' });
        }

        try {
            let buffer: Buffer;
            let mimetype: string;
            let filename: string;

            if (request.headers['content-type']?.includes('application/json')) {
                const body = request.body as { fileBase64?: string; mimetype?: string; filename?: string };
                if (!body || !body.fileBase64 || !body.mimetype) {
                    return reply.code(400).send({ message: 'No file uploaded' });
                }
                buffer = Buffer.from(body.fileBase64, 'base64');
                mimetype = body.mimetype;
                filename = body.filename || 'logo.png';
            } else {
                const data = await request.file();
                if (!data) {
                    return reply.code(400).send({ message: 'No file uploaded' });
                }
                buffer = await data.toBuffer();
                mimetype = data.mimetype;
                filename = data.filename;
            }

            if (!ALLOWED_LOGO_MIME_TYPES.includes(mimetype)) {
                return reply.code(400).send({ message: 'Unsupported file type. Please upload a PNG, JPG, SVG, or WebP image.' });
            }

            if (buffer.length > MAX_LOGO_SIZE_BYTES) {
                return reply.code(400).send({ message: 'Logo image size must be less than 2MB' });
            }

            const extension = filename.split('.').pop() || 'png';
            const uniqueFilename = `org-logo-${crypto.randomUUID()}.${extension}`;
            const path = `org-branding/${uniqueFilename}`;

            const uploadResult = await StorageService.uploadFile(
                { buffer, mimetype },
                path,
                'AssetTracker'
            );

            const settings = await service.update({ logoUrl: uploadResult.url }, userId);
            return reply.send(settings);
        } catch (error: any) {
            console.error('Org logo upload error:', error);
            return reply.code(400).send({ message: error.message || 'Failed to upload logo' });
        }
    }
}
