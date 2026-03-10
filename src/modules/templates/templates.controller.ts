import { FastifyReply, FastifyRequest } from 'fastify';
import { TemplatesService } from './templates.service';
import { CreateTemplateInput, UpdateTemplateInput } from './templates.schema';

export class TemplatesController {
    constructor(private templatesService: TemplatesService) { }

    async getTemplates(
        request: FastifyRequest,
        reply: FastifyReply
    ) {
        const userId = (request.user as any).id;
        try {
            const templates = await this.templatesService.getTemplates(userId);
            return reply.send(templates);
        } catch (error: any) {
            return reply.code(500).send({ message: error.message || 'Failed to fetch templates' });
        }
    }

    async getTemplate(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) {
        const userId = (request.user as any).id;
        const { id } = request.params;
        try {
            const template = await this.templatesService.getTemplateById(id, userId);
            if (!template) {
                return reply.code(404).send({ message: 'Template not found' });
            }
            return reply.send(template);
        } catch (error: any) {
            return reply.code(500).send({ message: error.message || 'Failed to fetch template' });
        }
    }

    async createTemplate(
        request: FastifyRequest<{ Body: CreateTemplateInput }>,
        reply: FastifyReply
    ) {
        const userId = (request.user as any).id;
        const data = request.body;
        try {
            const template = await this.templatesService.createTemplate(userId, data);
            return reply.code(201).send(template);
        } catch (error: any) {
            return reply.code(400).send({ message: error.message || 'Failed to create template' });
        }
    }

    async updateTemplate(
        request: FastifyRequest<{ Params: { id: string }, Body: UpdateTemplateInput }>,
        reply: FastifyReply
    ) {
        const userId = (request.user as any).id;
        const { id } = request.params;
        const data = request.body;
        try {
            const template = await this.templatesService.updateTemplate(id, userId, data);
            if (!template) {
                return reply.code(404).send({ message: 'Template not found or unauthorized' });
            }
            return reply.send(template);
        } catch (error: any) {
            return reply.code(400).send({ message: error.message || 'Failed to update template' });
        }
    }

    async deleteTemplate(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) {
        const userId = (request.user as any).id;
        const { id } = request.params;
        try {
            const template = await this.templatesService.deleteTemplate(id, userId);
            if (!template) {
                return reply.code(404).send({ message: 'Template not found or unauthorized' });
            }
            return reply.send({ message: 'Template deleted successfully' });
        } catch (error: any) {
            return reply.code(500).send({ message: error.message || 'Failed to delete template' });
        }
    }
}
