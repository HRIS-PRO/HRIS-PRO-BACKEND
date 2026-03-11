"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = assetCategoriesRoutes;
const asset_categories_controller_1 = require("./asset-categories.controller");
const asset_categories_schema_1 = require("./asset-categories.schema");
const controller = new asset_categories_controller_1.AssetCategoriesController();
async function assetCategoriesRoutes(app) {
    app.get('/', controller.getAll);
    app.post('/', {
        schema: {
            body: asset_categories_schema_1.createAssetCategorySchema
        },
        preHandler: [app.authenticate]
    }, controller.create);
    app.delete('/:id', {
        preHandler: [app.authenticate]
    }, controller.delete);
}
