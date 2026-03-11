"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetLocationsController = void 0;
const asset_locations_service_1 = require("./asset-locations.service");
const service = new asset_locations_service_1.AssetLocationsService();
class AssetLocationsController {
    async getAll(request, reply) {
        const locations = await service.getAll();
        return reply.send(locations);
    }
    async create(request, reply) {
        const location = await service.create(request.body);
        return reply.code(201).send(location);
    }
    async delete(request, reply) {
        await service.delete(request.params.id);
        return reply.code(204).send();
    }
}
exports.AssetLocationsController = AssetLocationsController;
