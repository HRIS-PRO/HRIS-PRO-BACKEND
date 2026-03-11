"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assetLocationsRoutes = void 0;
const asset_locations_controller_1 = require("./asset-locations.controller");
const asset_locations_schema_1 = require("./asset-locations.schema");
const controller = new asset_locations_controller_1.AssetLocationsController();
const assetLocationsRoutes = async (app) => {
    app.get('/', controller.getAll);
    app.post('/', {
        schema: {
            body: asset_locations_schema_1.createAssetLocationSchema
        },
        preHandler: [app.authenticate]
    }, controller.create);
    app.delete('/:id', {
        preHandler: [app.authenticate]
    }, controller.delete);
};
exports.assetLocationsRoutes = assetLocationsRoutes;
