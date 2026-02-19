import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import * as schema from '../db/schema';

// Use typeof db to infer the type of the Drizzle client
type DrizzleClient = typeof db;

// Extend FastifyInstance to include the 'db' property
declare module 'fastify' {
    interface FastifyInstance {
        db: DrizzleClient;
    }
}

const dbPlugin: FastifyPluginAsync = async (fastify) => {
    // Make the Drizzle client available as fastify.db
    fastify.decorate('db', db);

    fastify.addHook('onClose', async (instance) => {
        // Drizzle with postgres.js handles connection closing automatically when the process exits,
        // but if we needed manual cleanup, it would go here.
        // instance.log.info('Database connection closed');
    });

    fastify.log.info('Create Drizzle Plugin');
};

export default fp(dbPlugin);
