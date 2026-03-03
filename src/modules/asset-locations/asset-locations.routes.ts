import { FastifyInstance } from 'fastify';
import { AssetLocationsController } from './asset-locations.controller';
import { createAssetLocationSchema } from './asset-locations.schema';

const controller = new AssetLocationsController();

export const assetLocationsRoutes = async (app: FastifyInstance) => {
    app.get('/', controller.getAll);

    app.post('/', {
        schema: {
            body: createAssetLocationSchema
        },
        preHandler: [app.authenticate]
    }, controller.create);

    app.delete('/:id', {
        preHandler: [app.authenticate]
    }, controller.delete);
};
