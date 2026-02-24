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

const buildApp = async (): Promise<FastifyInstance> => {
    const app = Fastify({
        logger: true,
    }).withTypeProvider<ZodTypeProvider>();

    // Core plugins
    await app.register(cors);
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

    // Zod validation setup
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    // Health check
    app.get('/health', async () => {
        return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // Register modules
    await app.register(authRoutes, { prefix: '/auth' });
    await app.register(departmentsRoutes, { prefix: '/departments' });
    await app.register(locationsRoutes, { prefix: '/locations' });
    await app.register(employeesRoutes, { prefix: '/employees' });
    await app.register(assetsRoutes, { prefix: '/assets' });

    return app;
};

export default buildApp;
