"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetCategoriesController = void 0;
const asset_categories_service_1 = require("./asset-categories.service");
const service = new asset_categories_service_1.AssetCategoriesService();
class AssetCategoriesController {
    async getAll(request, reply) {
        const categories = await service.getAll();
        return reply.send(categories);
    }
    async create(request, reply) {
        const category = await service.create(request.body);
        return reply.code(201).send(category);
    }
    async delete(request, reply) {
        await service.delete(request.params.id);
        return reply.code(204).send();
    }
}
exports.AssetCategoriesController = AssetCategoriesController;
