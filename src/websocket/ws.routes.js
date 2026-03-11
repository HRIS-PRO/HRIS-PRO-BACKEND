"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wsRoutes = wsRoutes;
const websocket_1 = __importDefault(require("@fastify/websocket"));
const wsManager_1 = require("../websocket/wsManager");
async function wsRoutes(app) {
    await app.register(websocket_1.default);
    /**
     * ws://host/ws?token=<jwt>
     *
     * The client passes the JWT as a query-param because browser
     * WebSocket API does not support custom headers.
     */
    app.get('/ws', { websocket: true }, async (socket, request) => {
        let userId = null;
        try {
            const token = request.query.token;
            if (!token)
                throw new Error('No token provided');
            const decoded = app.jwt.verify(token);
            userId = decoded.id;
            wsManager_1.wsManager.register(userId, socket);
            // Confirm connection
            socket.send(JSON.stringify({
                type: 'connection:ok',
                payload: { userId, connectedAt: new Date().toISOString() }
            }));
            app.log.info(`WS connected: userId=${userId}, total=${wsManager_1.wsManager.connectedUserCount}`);
        }
        catch (err) {
            socket.send(JSON.stringify({ type: 'connection:error', payload: { message: 'Unauthorized' } }));
            socket.close();
        }
    });
}
