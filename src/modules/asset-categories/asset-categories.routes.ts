import { FastifyInstance } from 'fastify';
import { AssetCategoriesController } from './asset-categories.controller';
import { createAssetCategorySchema, updateAssetCategorySchema } from './asset-categories.schema';

const controller = new AssetCategoriesController();

export default async function assetCategoriesRoutes(app: FastifyInstance) {
    app.get('/', controller.getAll);

    app.post('/', {
        schema: {
            body: createAssetCategorySchema
        },
        preHandler: [app.authenticate]
    }, controller.create);

    app.put('/:id', {
        schema: {
            body: updateAssetCategorySchema
        },
        preHandler: [app.authenticate]
    }, controller.update);

    app.patch('/:id', {
        schema: {
            body: updateAssetCategorySchema
        },
        preHandler: [app.authenticate]
    }, controller.update);

    app.delete('/:id', {
        preHandler: [app.authenticate]
    }, controller.delete);
}
