import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import { env } from './config/env';
import dbPlugin from './plugins/db';

// Import modules (to be created)
import authRoutes from './modules/auth/auth.routes';

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

    return app;
};

export default buildApp;
