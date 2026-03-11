"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.equipmentRequestsRoutes = equipmentRequestsRoutes;
const db_1 = require("../../db");
const equipment_requests_service_1 = require("./equipment-requests.service");
const equipment_requests_controller_1 = require("./equipment-requests.controller");
const equipment_requests_schema_1 = require("./equipment-requests.schema");
async function equipmentRequestsRoutes(fastify) {
    const service = new equipment_requests_service_1.EquipmentRequestsService(db_1.db);
    const controller = new equipment_requests_controller_1.EquipmentRequestsController(service);
    fastify.post('/', {
        schema: {
            body: equipment_requests_schema_1.createEquipmentRequestSchema
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
            body: equipment_requests_schema_1.updateEquipmentRequestStatusSchema
        },
        preHandler: [fastify.authenticate]
    }, controller.updateStatus.bind(controller));
}
