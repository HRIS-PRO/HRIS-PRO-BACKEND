import { FastifyInstance } from 'fastify';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';

export async function assetsRoutes(app: FastifyInstance) {
    const assetsService = new AssetsService(app.db);
    const assetsController = new AssetsController(assetsService);

    app.addHook('onRequest', app.checkAppRole('ASSET_TRACKER'));

    app.get('/', assetsController.getAllAssets.bind(assetsController));

    app.post(
        '/',
        assetsController.createAsset.bind(assetsController)
    );
    app.post(
        '/bulk-create',
        assetsController.bulkCreateAssets.bind(assetsController)
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

    app.put(
        '/:id/reassign',
        assetsController.reassignAsset.bind(assetsController)
    );

    app.put(
        '/:id/decommission',
        assetsController.decommissionAsset.bind(assetsController)
    );
    app.put(
        '/:id/unassign',
        assetsController.unassignAsset.bind(assetsController)
    );

    app.put(
        '/:id',
        assetsController.updateAsset.bind(assetsController)
    );
}
