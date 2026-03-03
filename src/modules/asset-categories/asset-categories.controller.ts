import { FastifyReply, FastifyRequest } from 'fastify';
import { AssetCategoriesService } from './asset-categories.service';
import { CreateAssetCategoryInput } from './asset-categories.schema';

const service = new AssetCategoriesService();

export class AssetCategoriesController {
    async getAll(request: FastifyRequest, reply: FastifyReply) {
        const categories = await service.getAll();
        return reply.send(categories);
    }

    async create(request: FastifyRequest<{ Body: CreateAssetCategoryInput }>, reply: FastifyReply) {
        const category = await service.create(request.body);
        return reply.code(201).send(category);
    }

    async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        await service.delete(request.params.id);
        return reply.code(204).send();
    }
}
