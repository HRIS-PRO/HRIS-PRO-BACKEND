"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connection = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("../../config/env");
// We create a singleton connection reuse for BullMQ
exports.connection = new ioredis_1.default(env_1.env.REDIS_URL, {
    maxRetriesPerRequest: null,
});
exports.connection.on('error', (err) => {
    console.error('[Redis Core] Connection Error:', err);
});
// We check if we are in test mode
if (env_1.env.NODE_ENV !== 'test') {
    exports.connection.on('connect', () => {
        console.log('[Redis Core] Connected to Upstash Redis');
    });
}
