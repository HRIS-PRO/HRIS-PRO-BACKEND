import { FastifyReply, FastifyRequest } from 'fastify';
import { EquipmentRequestsService } from './equipment-requests.service';
import { CreateEquipmentRequestInput, UpdateEquipmentRequestStatusInput } from './equipment-requests.schema';

export class EquipmentRequestsController {
    constructor(private service: EquipmentRequestsService) { }

    async create(request: FastifyRequest<{ Body: CreateEquipmentRequestInput }>, reply: FastifyReply) {
        const userId = (request.user as any).id;
        const result = await this.service.createRequest(userId, request.body);
        return reply.code(201).send(result);
    }

    async getManaged(request: FastifyRequest, reply: FastifyReply) {
        const userId = (request.user as any).id;
        const results = await this.service.fetchManagedRequests(userId);
        return reply.send(results);
    }

    async getMyRequests(request: FastifyRequest, reply: FastifyReply) {
        const userId = (request.user as any).id;
        const results = await this.service.getRequestsForUser(userId);
        return reply.send(results);
    }

    async updateStatus(request: FastifyRequest<{ Params: { id: string }; Body: UpdateEquipmentRequestStatusInput }>, reply: FastifyReply) {
        const approverUserId = (request.user as any).id;
        const { id } = request.params;
        const { status } = request.body;
        const result = await this.service.updateRequestStatus(id, approverUserId, status);
        return reply.send(result);
    }
}
