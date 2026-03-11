"use strict";
/**
 * WebSocket connection manager.
 * Tracks open WS connections keyed by userId so we can push events
 * to specific users (the report submitter) or admins (category managers).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.wsManager = void 0;
class WsManager {
    /** userId → Set of open WebSocket connections (a user may have multiple tabs) */
    connections = new Map();
    register(userId, socket) {
        if (!this.connections.has(userId)) {
            this.connections.set(userId, new Set());
        }
        this.connections.get(userId).add(socket);
        socket.on('close', () => this.unregister(userId, socket));
        socket.on('error', () => this.unregister(userId, socket));
    }
    unregister(userId, socket) {
        const sockets = this.connections.get(userId);
        if (sockets) {
            sockets.delete(socket);
            if (sockets.size === 0) {
                this.connections.delete(userId);
            }
        }
    }
    /** Send an event to ONE specific user. */
    sendToUser(userId, event) {
        const sockets = this.connections.get(userId);
        if (!sockets)
            return;
        const message = JSON.stringify(event);
        for (const socket of sockets) {
            if (socket.readyState === socket.OPEN) {
                socket.send(message);
            }
        }
    }
    /** Send an event to a list of user IDs (e.g. all category managers). */
    sendToUsers(userIds, event) {
        for (const id of userIds) {
            this.sendToUser(id, event);
        }
    }
    /** Broadcast to EVERY connected client (admin broadcasts etc.). */
    broadcast(type, payload) {
        const message = JSON.stringify({ type, payload });
        for (const sockets of this.connections.values()) {
            for (const socket of sockets) {
                if (socket.readyState === socket.OPEN) {
                    socket.send(message);
                }
            }
        }
    }
    get connectedUserCount() {
        return this.connections.size;
    }
}
/** Singleton shared across the app */
exports.wsManager = new WsManager();
