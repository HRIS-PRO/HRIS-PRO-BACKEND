"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const worker_service_1 = require("./modules/queue/worker.service");
const start = async () => {
    const app = await (0, app_1.default)();
    try {
        await app.listen({ port: env_1.env.PORT, host: '0.0.0.0' });
        console.log(`🚀 Server running on http://localhost:${env_1.env.PORT}`);
        console.log(`Using database: ${env_1.env.DATABASE_URL.split('@')[1]}`); // Mask credentials
        // Start background queue workers
        (0, worker_service_1.startWorker)();
    }
    catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};
start();
