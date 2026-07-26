"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicRoutes = publicRoutes;
const assets_service_1 = require("../assets/assets.service");
// Public, unauthenticated routes (e.g. QR-code asset scan page).
// IMPORTANT: keep these strictly read-only and limited to non-sensitive fields.
async function publicRoutes(app) {
    const assetsService = new assets_service_1.AssetsService(app.db);
    app.get('/assets/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            const info = await assetsService.getPublicAssetInfo(id);
            if (!info) {
                return reply.status(404).send({ message: 'Asset not found' });
            }
            return reply.send(info);
        }
        catch (error) {
            request.log.error(error);
            return reply.status(500).send({ message: error.message || 'Failed to fetch asset' });
        }
    });
}
