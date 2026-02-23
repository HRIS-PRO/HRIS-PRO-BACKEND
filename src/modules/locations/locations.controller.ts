import { FastifyReply, FastifyRequest } from 'fastify';
import { LocationsService } from './locations.service';

export class LocationsController {
    private locationsService: LocationsService;

    constructor() {
        this.locationsService = new LocationsService();
    }

    getLocations = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const allLocations = await this.locationsService.getLocations();
            return reply.code(200).send(allLocations);
        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ message: 'Internal Server Error' });
        }
    };

    createLocation = async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
        try {
            const data = request.body as any;
            const newLocation = await this.locationsService.createLocation(data);
            return reply.code(201).send(newLocation);
        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ message: 'Internal Server Error' });
        }
    };

    updateLocation = async (request: FastifyRequest<{ Params: { id: string }, Body: any }>, reply: FastifyReply) => {
        try {
            const { id } = request.params;
            const data = request.body as any;
            const updatedLocation = await this.locationsService.updateLocation(id, data);

            if (!updatedLocation) {
                return reply.code(404).send({ message: 'Location not found' });
            }

            return reply.code(200).send(updatedLocation);
        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ message: 'Internal Server Error' });
        }
    };

    deleteLocation = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
        try {
            const { id } = request.params;
            const deletedLocation = await this.locationsService.deleteLocation(id);

            if (!deletedLocation) {
                return reply.code(404).send({ message: 'Location not found' });
            }

            return reply.code(200).send({ message: 'Location deleted successfully' });
        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ message: 'Internal Server Error' });
        }
    };
}
