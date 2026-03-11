"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = templatesRoutes;
const zod_1 = require("zod");
const templates_controller_1 = require("./templates.controller");
const templates_service_1 = require("./templates.service");
const templates_schema_1 = require("./templates.schema");
async function templatesRoutes(app) {
    const templatesService = new templates_service_1.TemplatesService(app.db);
    const templatesController = new templates_controller_1.TemplatesController(templatesService);
    app.addHook('preHandler', app.authenticate);
    app.get('/', (request, reply) => templatesController.getTemplates(request, reply));
    app.get('/:id', {
        schema: {
            params: zod_1.z.object({
                id: zod_1.z.string().uuid()
            })
        }
    }, (request, reply) => templatesController.getTemplate(request, reply));
    app.post('/', {
        schema: {
            body: templates_schema_1.createTemplateSchema
        }
    }, (request, reply) => templatesController.createTemplate(request, reply));
    app.patch('/:id', {
        schema: {
            params: zod_1.z.object({
                id: zod_1.z.string().uuid()
            }),
            body: templates_schema_1.updateTemplateSchema
        }
    }, (request, reply) => templatesController.updateTemplate(request, reply));
    app.delete('/:id', {
        schema: {
            params: zod_1.z.object({
                id: zod_1.z.string().uuid()
            })
        }
    }, (request, reply) => templatesController.deleteTemplate(request, reply));
}
