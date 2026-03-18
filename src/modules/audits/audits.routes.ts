import { FastifyInstance } from 'fastify';
import { AuditsService } from './audits.service';
import { createAuditCycleSchema, createAuditVerificationSchema } from './audits.schema';
import { z } from 'zod';

export default async function auditsRoutes(fastify: FastifyInstance) {
    const auditsService = new AuditsService();

    fastify.addHook('onRequest', fastify.authenticate);

    fastify.post('/', {
        schema: {
            body: createAuditCycleSchema
        }
    }, async (request, reply) => {
        try {
            const user = request.user as { id: string };
            const body = request.body as import('./audits.schema').CreateAuditCycleInput;
            const cycle = await auditsService.createAuditCycle(body, user.id);
            return reply.code(201).send(cycle);
        } catch (error: any) {
            return reply.code(400).send({ message: error.message });
        }
    });

    fastify.get('/', async (request, reply) => {
        const cycles = await auditsService.getAuditCycles();
        return reply.send(cycles);
    });

    fastify.post('/:cycleId/verify', {
        schema: {
            params: z.object({
                cycleId: z.string().uuid()
            }),
            body: createAuditVerificationSchema
        }
    }, async (request, reply) => {
        const { cycleId } = request.params as { cycleId: string };
        const user = request.user as { id: string };
        const body = request.body as import('./audits.schema').CreateAuditVerificationInput;
        const verification = await auditsService.verifyAsset(cycleId, user.id, body);
        return reply.code(200).send(verification);
    });
}
