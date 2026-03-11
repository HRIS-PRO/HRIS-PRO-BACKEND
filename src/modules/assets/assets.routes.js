"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assetsRoutes = assetsRoutes;
const assets_service_1 = require("./assets.service");
const assets_controller_1 = require("./assets.controller");
async function assetsRoutes(app) {
    const assetsService = new assets_service_1.AssetsService(app.db);
    const assetsController = new assets_controller_1.AssetsController(assetsService);
    app.get('/', assetsController.getAllAssets.bind(assetsController));
    app.post('/', 
    // Schema validation is tricky with multipart, handled manually or in service for now
    assetsController.createAsset.bind(assetsController));
    app.put('/:id/accept', assetsController.acceptAsset.bind(assetsController));
    app.put('/bulk-accept', assetsController.bulkAcceptAssets.bind(assetsController));
    app.put('/bulk-assign', assetsController.bulkAssignAssets.bind(assetsController));
    app.put('/:id/assign', assetsController.assignAsset.bind(assetsController));
}
