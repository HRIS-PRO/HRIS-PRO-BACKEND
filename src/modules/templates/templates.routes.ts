import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import { createTemplateSchema, updateTemplateSchema } from './templates.schema';

export default async function templatesRoutes(app: FastifyInstance) {
    const templatesService = new TemplatesService(app.db);
    const templatesController = new TemplatesController(templatesService);

    app.addHook('preHandler', app.authenticate);

    app.get('/', (request, reply) => templatesController.getTemplates(request, reply));

    app.get('/:id', {
        schema: {
            params: z.object({
                id: z.string().uuid()
            })
        }
    }, (request: any, reply) => templatesController.getTemplate(request, reply));

    app.post('/', {
        schema: {
            body: createTemplateSchema
        }
    }, (request: any, reply) => templatesController.createTemplate(request, reply));

    app.patch('/:id', {
        schema: {
            params: z.object({
                id: z.string().uuid()
            }),
            body: updateTemplateSchema
        }
    }, (request: any, reply) => templatesController.updateTemplate(request, reply));

    app.delete('/:id', {
        schema: {
            params: z.object({
                id: z.string().uuid()
            })
        }
    }, (request: any, reply) => templatesController.deleteTemplate(request, reply));
}
