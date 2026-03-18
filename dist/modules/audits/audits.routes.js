"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = auditsRoutes;
const audits_service_1 = require("./audits.service");
const audits_schema_1 = require("./audits.schema");
const zod_1 = require("zod");
async function auditsRoutes(fastify) {
    const auditsService = new audits_service_1.AuditsService();
    fastify.addHook('onRequest', fastify.authenticate);
    fastify.post('/', {
        schema: {
            body: audits_schema_1.createAuditCycleSchema
        }
    }, async (request, reply) => {
        const user = request.user;
        const body = request.body;
        const cycle = await auditsService.createAuditCycle(body, user.id);
        return reply.code(201).send(cycle);
    });
    fastify.get('/', async (request, reply) => {
        const cycles = await auditsService.getAuditCycles();
        return reply.send(cycles);
    });
    fastify.post('/:cycleId/verify', {
        schema: {
            params: zod_1.z.object({
                cycleId: zod_1.z.string().uuid()
            }),
            body: audits_schema_1.createAuditVerificationSchema
        }
    }, async (request, reply) => {
        const { cycleId } = request.params;
        const user = request.user;
        const body = request.body;
        const verification = await auditsService.verifyAsset(cycleId, user.id, body);
        return reply.code(200).send(verification);
    });
}
