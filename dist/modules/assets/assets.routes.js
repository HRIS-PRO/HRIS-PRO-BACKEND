"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assetsRoutes = assetsRoutes;
const assets_service_1 = require("./assets.service");
const assets_controller_1 = require("./assets.controller");
async function assetsRoutes(app) {
    const assetsService = new assets_service_1.AssetsService(app.db);
    const assetsController = new assets_controller_1.AssetsController(assetsService);
    app.addHook('onRequest', app.authenticate);
    app.get('/', assetsController.getAllAssets.bind(assetsController));
    app.post('/', assetsController.createAsset.bind(assetsController));
    app.put('/:id/accept', assetsController.acceptAsset.bind(assetsController));
    app.put('/bulk-accept', assetsController.bulkAcceptAssets.bind(assetsController));
    app.put('/bulk-assign', assetsController.bulkAssignAssets.bind(assetsController));
    app.put('/:id/assign', assetsController.assignAsset.bind(assetsController));
    app.put('/:id/reassign', assetsController.reassignAsset.bind(assetsController));
    app.put('/:id/decommission', assetsController.decommissionAsset.bind(assetsController));
}
