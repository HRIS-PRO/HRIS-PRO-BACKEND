import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AssetsService } from '../assets/assets.service';

// Public, unauthenticated routes (e.g. QR-code asset scan page).
// IMPORTANT: keep these strictly read-only and limited to non-sensitive fields.
export async function publicRoutes(app: FastifyInstance) {
    const assetsService = new AssetsService(app.db);

    app.get('/assets/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
        try {
            const { id } = request.params;
            const info = await assetsService.getPublicAssetInfo(id);
            if (!info) {
                return reply.status(404).send({ message: 'Asset not found' });
            }
            return reply.send(info);
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ message: error.message || 'Failed to fetch asset' });
        }
    });
}
