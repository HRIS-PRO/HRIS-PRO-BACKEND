"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplatesController = void 0;
class TemplatesController {
    templatesService;
    constructor(templatesService) {
        this.templatesService = templatesService;
    }
    async getTemplates(request, reply) {
        const userId = request.user.id;
        try {
            const templates = await this.templatesService.getTemplates(userId);
            return reply.send(templates);
        }
        catch (error) {
            return reply.code(500).send({ message: error.message || 'Failed to fetch templates' });
        }
    }
    async getTemplate(request, reply) {
        const userId = request.user.id;
        const { id } = request.params;
        try {
            const template = await this.templatesService.getTemplateById(id, userId);
            if (!template) {
                return reply.code(404).send({ message: 'Template not found' });
            }
            return reply.send(template);
        }
        catch (error) {
            return reply.code(500).send({ message: error.message || 'Failed to fetch template' });
        }
    }
    async createTemplate(request, reply) {
        const userId = request.user.id;
        const data = request.body;
        try {
            const template = await this.templatesService.createTemplate(userId, data);
            return reply.code(201).send(template);
        }
        catch (error) {
            return reply.code(400).send({ message: error.message || 'Failed to create template' });
        }
    }
    async updateTemplate(request, reply) {
        const userId = request.user.id;
        const { id } = request.params;
        const data = request.body;
        try {
            const template = await this.templatesService.updateTemplate(id, userId, data);
            if (!template) {
                return reply.code(404).send({ message: 'Template not found or unauthorized' });
            }
            return reply.send(template);
        }
        catch (error) {
            return reply.code(400).send({ message: error.message || 'Failed to update template' });
        }
    }
    async deleteTemplate(request, reply) {
        const userId = request.user.id;
        const { id } = request.params;
        try {
            const template = await this.templatesService.deleteTemplate(id, userId);
            if (!template) {
                return reply.code(404).send({ message: 'Template not found or unauthorized' });
            }
            return reply.send({ message: 'Template deleted successfully' });
        }
        catch (error) {
            return reply.code(500).send({ message: error.message || 'Failed to delete template' });
        }
    }
}
exports.TemplatesController = TemplatesController;
