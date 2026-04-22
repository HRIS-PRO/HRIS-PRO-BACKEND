import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import fastifyMultipart from '@fastify/multipart';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import { env } from './config/env';
import dbPlugin from './plugins/db';

// Import modules (to be created)
import authRoutes from './modules/auth/auth.routes';
import departmentsRoutes from './modules/departments/departments.routes';
import { locationsRoutes } from './modules/locations/locations.routes';
import employeesRoutes from './modules/employees/employees.routes';
import { assetsRoutes } from './modules/assets/assets.routes';
import assetCategoriesRoutes from './modules/asset-categories/asset-categories.routes';
import { assetLocationsRoutes } from './modules/asset-locations/asset-locations.routes';
import usersRoutes from './modules/users/users.routes';
import reportsRoutes from './modules/reports/reports.routes';
import { equipmentRequestsRoutes } from './modules/equipment-requests/equipment-requests.routes';
import workspacesRoutes from './modules/workspaces/workspaces.routes';
import templatesRoutes from './modules/templates/templates.routes';
import { campaignsRoutes } from './modules/campaigns/campaigns.routes';
import auditsRoutes from './modules/audits/audits.routes';
import activitiesRoutes from './modules/activities/activities.routes';
import { wsRoutes } from './websocket/ws.routes';

import { eq, and } from 'drizzle-orm';
import { userRoles } from './db/schema';

declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (request: any, reply: any) => Promise<void>;
        checkAppRole: (appName: string) => (request: any, reply: any) => Promise<void>;
    }
}

const buildApp = async (): Promise<FastifyInstance> => {
    const app = Fastify({
        logger: true,
        bodyLimit: 50 * 1024 * 1024, // 50MB
    }).withTypeProvider<ZodTypeProvider>();

    // Core plugins
    await app.register(cors, {
        origin: '*', // Allow all origins (for development)
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
        credentials: true,
    });
    await app.register(helmet);
    await app.register(jwt, {
        secret: env.JWT_SECRET,
    });
    await app.register(fastifyMultipart, {
        limits: {
            fileSize: 10 * 1024 * 1024, // 10MB
        }
    });

    // Custom plugins
    await app.register(dbPlugin);

    app.decorate('authenticate', async (request: any, reply: any) => {
        try {
            await request.jwtVerify();
        } catch (err) {
            reply.send(err);
        }
    });

    app.decorate('checkAppRole', (appName: string) => {
        return async (request: any, reply: any) => {
            if (!request.user) {
                try {
                    await request.jwtVerify();
                } catch (err) {
                    return reply.code(401).send({ message: 'Unauthorized' });
                }
            }

            const userId = request.user.id;
            
            // Fresh check against database to catch revocations immediately
            const roles = await app.db.query.userRoles.findMany({
                where: and(
                    eq(userRoles.userId, userId),
                    eq(userRoles.app, appName as any)
                )
            });

            if (roles.length === 0) {
                return reply.code(403).send({ 
                    message: `Access Denied: You do not have an active role for ${appName}.` 
                });
            }
        };
    });

    // Zod validation setup
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    // Health check
    app.get('/health', async () => {
        return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // Register WebSocket (must come before route modules that use it)
    await app.register(wsRoutes);

    // Register modules
    await app.register(authRoutes, { prefix: '/auth' });
    await app.register(departmentsRoutes, { prefix: '/departments' });
    await app.register(locationsRoutes, { prefix: '/locations' });
    await app.register(employeesRoutes, { prefix: '/employees' });
    await app.register(assetsRoutes, { prefix: '/assets' });
    await app.register(assetCategoriesRoutes, { prefix: '/asset-categories' });
    await app.register(assetLocationsRoutes, { prefix: '/asset-locations' });
    await app.register(usersRoutes, { prefix: '/users' });
    await app.register(reportsRoutes, { prefix: '/reports' });
    await app.register(equipmentRequestsRoutes, { prefix: '/equipment-requests' });
    await app.register(workspacesRoutes, { prefix: '/workspaces' });
    await app.register(templatesRoutes, { prefix: '/templates' });
    await app.register(campaignsRoutes, { prefix: '/campaigns' });
    await app.register(auditsRoutes, { prefix: '/audits' });
    await app.register(activitiesRoutes, { prefix: '/activities' });

    return app;
};

export default buildApp;
