"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationsController = void 0;
const locations_service_1 = require("./locations.service");
class LocationsController {
    locationsService;
    constructor() {
        this.locationsService = new locations_service_1.LocationsService();
    }
    getLocations = async (request, reply) => {
        try {
            const allLocations = await this.locationsService.getLocations();
            return reply.code(200).send(allLocations);
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({ message: 'Internal Server Error' });
        }
    };
    createLocation = async (request, reply) => {
        try {
            const data = request.body;
            const newLocation = await this.locationsService.createLocation(data);
            return reply.code(201).send(newLocation);
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({ message: 'Internal Server Error' });
        }
    };
    updateLocation = async (request, reply) => {
        try {
            const { id } = request.params;
            const data = request.body;
            const updatedLocation = await this.locationsService.updateLocation(id, data);
            if (!updatedLocation) {
                return reply.code(404).send({ message: 'Location not found' });
            }
            return reply.code(200).send(updatedLocation);
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({ message: 'Internal Server Error' });
        }
    };
    deleteLocation = async (request, reply) => {
        try {
            const { id } = request.params;
            const deletedLocation = await this.locationsService.deleteLocation(id);
            if (!deletedLocation) {
                return reply.code(404).send({ message: 'Location not found' });
            }
            return reply.code(200).send({ message: 'Location deleted successfully' });
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({ message: 'Internal Server Error' });
        }
    };
}
exports.LocationsController = LocationsController;
