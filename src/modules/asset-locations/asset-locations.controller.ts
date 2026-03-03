import { FastifyReply, FastifyRequest } from 'fastify';
import { AssetLocationsService } from './asset-locations.service';
import { CreateAssetLocationInput } from './asset-locations.schema';

const service = new AssetLocationsService();

export class AssetLocationsController {
    async getAll(request: FastifyRequest, reply: FastifyReply) {
        const locations = await service.getAll();
        return reply.send(locations);
    }

    async create(request: FastifyRequest<{ Body: CreateAssetLocationInput }>, reply: FastifyReply) {
        const location = await service.create(request.body);
        return reply.code(201).send(location);
    }

    async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        await service.delete(request.params.id);
        return reply.code(204).send();
    }
}
