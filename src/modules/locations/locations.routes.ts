import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { LocationsController } from './locations.controller';
import { createLocationSchema, updateLocationSchema } from './locations.schema';
import { z } from 'zod';

export const locationsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
    const server = fastify.withTypeProvider<ZodTypeProvider>();
    const controller = new LocationsController();

    server.get('/', controller.getLocations);

    server.post('/', {
        schema: {
            body: createLocationSchema
        }
    }, controller.createLocation);

    server.put('/:id', {
        schema: {
            params: z.object({ id: z.string().uuid() }),
            body: updateLocationSchema
        }
    }, controller.updateLocation);

    server.delete('/:id', {
        schema: {
            params: z.object({ id: z.string().uuid() })
        }
    }, controller.deleteLocation);
};
