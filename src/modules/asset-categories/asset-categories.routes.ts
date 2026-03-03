import { FastifyInstance } from 'fastify';
import { AssetCategoriesController } from './asset-categories.controller';
import { createAssetCategorySchema } from './asset-categories.schema';

const controller = new AssetCategoriesController();

export default async function assetCategoriesRoutes(app: FastifyInstance) {
    app.get('/', controller.getAll);

    app.post('/', {
        schema: {
            body: createAssetCategorySchema
        },
        preHandler: [app.authenticate]
    }, controller.create);

    app.delete('/:id', {
        preHandler: [app.authenticate]
    }, controller.delete);
}
