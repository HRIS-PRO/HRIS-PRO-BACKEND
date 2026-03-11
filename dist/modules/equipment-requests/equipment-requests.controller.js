"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EquipmentRequestsController = void 0;
class EquipmentRequestsController {
    service;
    constructor(service) {
        this.service = service;
    }
    async create(request, reply) {
        const userId = request.user.id;
        const result = await this.service.createRequest(userId, request.body);
        return reply.code(201).send(result);
    }
    async getManaged(request, reply) {
        const userId = request.user.id;
        const results = await this.service.fetchManagedRequests(userId);
        return reply.send(results);
    }
    async getMyRequests(request, reply) {
        const userId = request.user.id;
        const results = await this.service.getRequestsForUser(userId);
        return reply.send(results);
    }
    async updateStatus(request, reply) {
        const approverUserId = request.user.id;
        const { id } = request.params;
        const { status } = request.body;
        const result = await this.service.updateRequestStatus(id, approverUserId, status);
        return reply.send(result);
    }
}
exports.EquipmentRequestsController = EquipmentRequestsController;
