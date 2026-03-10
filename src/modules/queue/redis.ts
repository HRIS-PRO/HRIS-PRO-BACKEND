import Redis from 'ioredis';
import { env } from '../../config/env';

// We create a singleton connection reuse for BullMQ
export const connection = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
});

connection.on('error', (err) => {
    console.error('[Redis Core] Connection Error:', err);
});

// We check if we are in test mode
if (env.NODE_ENV !== 'test') {
    connection.on('connect', () => {
        console.log('[Redis Core] Connected to Upstash Redis');
    });
}
