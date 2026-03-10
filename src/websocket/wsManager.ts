/**
 * WebSocket connection manager.
 * Tracks open WS connections keyed by userId so we can push events
 * to specific users (the report submitter) or admins (category managers).
 */

import { WebSocket } from '@fastify/websocket';

export type WsEvent =
    | { type: 'report:created'; payload: Record<string, any> }
    | { type: 'report:status_updated'; payload: Record<string, any> }
    | { type: 'request:created'; payload: Record<string, any> }
    | { type: 'request:status_updated'; payload: Record<string, any> };

class WsManager {
    /** userId → Set of open WebSocket connections (a user may have multiple tabs) */
    private connections = new Map<string, Set<WebSocket>>();

    register(userId: string, socket: WebSocket): void {
        if (!this.connections.has(userId)) {
            this.connections.set(userId, new Set());
        }
        this.connections.get(userId)!.add(socket);

        socket.on('close', () => this.unregister(userId, socket));
        socket.on('error', () => this.unregister(userId, socket));
    }

    private unregister(userId: string, socket: WebSocket): void {
        const sockets = this.connections.get(userId);
        if (sockets) {
            sockets.delete(socket);
            if (sockets.size === 0) {
                this.connections.delete(userId);
            }
        }
    }

    /** Send an event to ONE specific user. */
    sendToUser(userId: string, event: WsEvent): void {
        const sockets = this.connections.get(userId);
        if (!sockets) return;
        const message = JSON.stringify(event);
        for (const socket of sockets) {
            if (socket.readyState === socket.OPEN) {
                socket.send(message);
            }
        }
    }

    /** Send an event to a list of user IDs (e.g. all category managers). */
    sendToUsers(userIds: string[], event: WsEvent): void {
        for (const id of userIds) {
            this.sendToUser(id, event);
        }
    }

    /** Broadcast to EVERY connected client (admin broadcasts etc.). */
    broadcast(type: string, payload: any): void {
        const message = JSON.stringify({ type, payload });
        for (const sockets of this.connections.values()) {
            for (const socket of sockets) {
                if (socket.readyState === socket.OPEN) {
                    socket.send(message);
                }
            }
        }
    }

    get connectedUserCount(): number {
        return this.connections.size;
    }
}

/** Singleton shared across the app */
export const wsManager = new WsManager();
