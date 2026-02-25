import { FastifyInstance } from 'fastify';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';

export async function assetsRoutes(app: FastifyInstance) {
    const assetsService = new AssetsService(app.db);
    const assetsController = new AssetsController(assetsService);

    app.get('/', assetsController.getAllAssets.bind(assetsController));

    app.post(
        '/',
        // Schema validation is tricky with multipart, handled manually or in service for now
        assetsController.createAsset.bind(assetsController)
    );
    app.put(
        '/:id/accept',
        assetsController.acceptAsset.bind(assetsController)
    );

    app.put(
        '/bulk-accept',
        assetsController.bulkAcceptAssets.bind(assetsController)
    );

    app.put(
        '/bulk-assign',
        assetsController.bulkAssignAssets.bind(assetsController)
    );

    app.put(
        '/:id/assign',
        assetsController.assignAsset.bind(assetsController)
    );
}
