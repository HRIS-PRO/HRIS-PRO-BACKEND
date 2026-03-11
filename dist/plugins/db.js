"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const db_1 = require("../db");
const dbPlugin = async (fastify) => {
    // Make the Drizzle client available as fastify.db
    fastify.decorate('db', db_1.db);
    fastify.addHook('onClose', async (instance) => {
        // Drizzle with postgres.js handles connection closing automatically when the process exits,
        // but if we needed manual cleanup, it would go here.
        // instance.log.info('Database connection closed');
    });
    fastify.log.info('Create Drizzle Plugin');
};
exports.default = (0, fastify_plugin_1.default)(dbPlugin);
