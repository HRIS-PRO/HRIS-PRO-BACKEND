"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.locationsRoutes = void 0;
const locations_controller_1 = require("./locations.controller");
const locations_schema_1 = require("./locations.schema");
const zod_1 = require("zod");
const locationsRoutes = async (fastify) => {
    const server = fastify.withTypeProvider();
    const controller = new locations_controller_1.LocationsController();
    server.get('/', controller.getLocations);
    server.post('/', {
        schema: {
            body: locations_schema_1.createLocationSchema
        }
    }, controller.createLocation);
    server.put('/:id', {
        schema: {
            params: zod_1.z.object({ id: zod_1.z.string().uuid() }),
            body: locations_schema_1.updateLocationSchema
        }
    }, controller.updateLocation);
    server.delete('/:id', {
        schema: {
            params: zod_1.z.object({ id: zod_1.z.string().uuid() })
        }
    }, controller.deleteLocation);
};
exports.locationsRoutes = locationsRoutes;
