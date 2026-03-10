import buildApp from './app';
import { env } from './config/env';

import { startWorker } from './modules/queue/worker.service';

const start = async () => {
    const app = await buildApp();

    try {
        await app.listen({ port: env.PORT, host: '0.0.0.0' });
        console.log(`🚀 Server running on http://localhost:${env.PORT}`);
        console.log(`Using database: ${env.DATABASE_URL.split('@')[1]}`); // Mask credentials

        // Start background queue workers
        startWorker();

    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
