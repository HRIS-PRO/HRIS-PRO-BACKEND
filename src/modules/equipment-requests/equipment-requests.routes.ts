import { FastifyInstance } from 'fastify';
import { db } from '../../db';
import { EquipmentRequestsService } from './equipment-requests.service';
import { EquipmentRequestsController } from './equipment-requests.controller';
import { createEquipmentRequestSchema, updateEquipmentRequestStatusSchema } from './equipment-requests.schema';

export async function equipmentRequestsRoutes(fastify: FastifyInstance) {
    const service = new EquipmentRequestsService(db);
    const controller = new EquipmentRequestsController(service);

    fastify.post('/', {
        schema: {
            body: createEquipmentRequestSchema
        },
        preHandler: [fastify.authenticate]
    }, controller.create.bind(controller));

    fastify.get('/managed', {
        preHandler: [fastify.authenticate]
    }, controller.getManaged.bind(controller));

    fastify.get('/me', {
        preHandler: [fastify.authenticate]
    }, controller.getMyRequests.bind(controller));

    fastify.patch('/:id/status', {
        schema: {
            body: updateEquipmentRequestStatusSchema
        },
        preHandler: [fastify.authenticate]
    }, controller.updateStatus.bind(controller));
}
