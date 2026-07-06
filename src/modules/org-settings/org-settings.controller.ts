import { FastifyReply, FastifyRequest } from 'fastify';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { userRoles } from '../../db/schema';
import { OrgSettingsService } from './org-settings.service';
import { UpdateOrgSettingsInput } from './org-settings.schema';

const service = new OrgSettingsService();

const ADMIN_ROLES = ['Super Admin', 'Admin User'];

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
}
