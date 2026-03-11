import { FastifyInstance, FastifyRequest } from 'fastify';
import websocketPlugin from '@fastify/websocket';
import { wsManager } from '../websocket/wsManager';

export async function wsRoutes(app: FastifyInstance) {
    await app.register(websocketPlugin);

    /**
     * ws://host/ws?token=<jwt>
     *
     * The client passes the JWT as a query-param because browser
     * WebSocket API does not support custom headers.
     */
    app.get('/ws', { websocket: true }, async (connection: any, request: FastifyRequest<{ Querystring: { token?: string } }>) => {
        let userId: string | null = null;
        const socket = connection.socket;

        try {
            const token = (request.query as any).token as string | undefined;
            if (!token) throw new Error('No token provided');

            const decoded = app.jwt.verify<{ id: string }>(token);
            userId = decoded.id;
            wsManager.register(userId, socket);

            // Confirm connection
            socket.send(JSON.stringify({
                type: 'connection:ok',
                payload: { userId, connectedAt: new Date().toISOString() }
            }));

            app.log.info(`WS connected: userId=${userId}, total=${wsManager.connectedUserCount}`);
        } catch (err) {
            socket.send(JSON.stringify({ type: 'connection:error', payload: { message: 'Unauthorized' } }));
            socket.close();
        }
    });
}
