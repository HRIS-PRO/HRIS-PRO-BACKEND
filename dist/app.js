"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const fastify_type_provider_zod_1 = require("fastify-type-provider-zod");
const env_1 = require("./config/env");
const db_1 = __importDefault(require("./plugins/db"));
// Import modules (to be created)
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const departments_routes_1 = __importDefault(require("./modules/departments/departments.routes"));
const locations_routes_1 = require("./modules/locations/locations.routes");
const employees_routes_1 = __importDefault(require("./modules/employees/employees.routes"));
const assets_routes_1 = require("./modules/assets/assets.routes");
const asset_categories_routes_1 = __importDefault(require("./modules/asset-categories/asset-categories.routes"));
const asset_locations_routes_1 = require("./modules/asset-locations/asset-locations.routes");
const users_routes_1 = __importDefault(require("./modules/users/users.routes"));
const reports_routes_1 = __importDefault(require("./modules/reports/reports.routes"));
const equipment_requests_routes_1 = require("./modules/equipment-requests/equipment-requests.routes");
const workspaces_routes_1 = __importDefault(require("./modules/workspaces/workspaces.routes"));
const templates_routes_1 = __importDefault(require("./modules/templates/templates.routes"));
const campaigns_routes_1 = require("./modules/campaigns/campaigns.routes");
const audits_routes_1 = __importDefault(require("./modules/audits/audits.routes"));
const activities_routes_1 = __importDefault(require("./modules/activities/activities.routes"));
const ws_routes_1 = require("./websocket/ws.routes");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("./db/schema");
const buildApp = async () => {
    const app = (0, fastify_1.default)({
        logger: true,
        bodyLimit: 50 * 1024 * 1024, // 50MB
    }).withTypeProvider();
    // Core plugins
    await app.register(cors_1.default, {
        origin: '*', // Allow all origins (for development)
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
        credentials: true,
    });
    await app.register(helmet_1.default);
    await app.register(jwt_1.default, {
        secret: env_1.env.JWT_SECRET,
    });
    await app.register(multipart_1.default, {
        limits: {
            fileSize: 10 * 1024 * 1024, // 10MB
        }
    });
    // Custom plugins
    await app.register(db_1.default);
    app.decorate('authenticate', async (request, reply) => {
        try {
            await request.jwtVerify();
        }
        catch (err) {
            reply.send(err);
        }
    });
    app.decorate('checkAppRole', (appName) => {
        return async (request, reply) => {
            if (!request.user) {
                try {
                    await request.jwtVerify();
                }
                catch (err) {
                    return reply.code(401).send({ message: 'Unauthorized' });
                }
            }
            const userId = request.user.id;
            // Fresh check against database to catch revocations immediately
            const roles = await app.db.query.userRoles.findMany({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userRoles.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userRoles.app, appName))
            });
            if (roles.length === 0) {
                return reply.code(403).send({
                    message: `Access Denied: You do not have an active role for ${appName}.`
                });
            }
        };
    });
    // Zod validation setup
    app.setValidatorCompiler(fastify_type_provider_zod_1.validatorCompiler);
    app.setSerializerCompiler(fastify_type_provider_zod_1.serializerCompiler);
    // Health check
    app.get('/health', async () => {
        return { status: 'ok', timestamp: new Date().toISOString() };
    });
    // Register WebSocket (must come before route modules that use it)
    await app.register(ws_routes_1.wsRoutes);
    // Register modules
    await app.register(auth_routes_1.default, { prefix: '/auth' });
    await app.register(departments_routes_1.default, { prefix: '/departments' });
    await app.register(locations_routes_1.locationsRoutes, { prefix: '/locations' });
    await app.register(employees_routes_1.default, { prefix: '/employees' });
    await app.register(assets_routes_1.assetsRoutes, { prefix: '/assets' });
    await app.register(asset_categories_routes_1.default, { prefix: '/asset-categories' });
    await app.register(asset_locations_routes_1.assetLocationsRoutes, { prefix: '/asset-locations' });
    await app.register(users_routes_1.default, { prefix: '/users' });
    await app.register(reports_routes_1.default, { prefix: '/reports' });
    await app.register(equipment_requests_routes_1.equipmentRequestsRoutes, { prefix: '/equipment-requests' });
    await app.register(workspaces_routes_1.default, { prefix: '/workspaces' });
    await app.register(templates_routes_1.default, { prefix: '/templates' });
    await app.register(campaigns_routes_1.campaignsRoutes, { prefix: '/campaigns' });
    await app.register(audits_routes_1.default, { prefix: '/audits' });
    await app.register(activities_routes_1.default, { prefix: '/activities' });
    return app;
};
exports.default = buildApp;
