import { eq, and } from 'drizzle-orm';
import { db } from '../../db';
import { templates } from '../../db/schema';
import { CreateTemplateInput, UpdateTemplateInput } from './templates.schema';

type DrizzleClient = typeof db;

export class TemplatesService {
    constructor(private db: DrizzleClient) { }

    async getTemplates(ownerId: string) {
        return await this.db.query.templates.findMany({
            where: eq(templates.ownerId, ownerId),
            orderBy: (templates, { desc }) => [desc(templates.createdAt)],
        });
    }

    async getTemplateById(id: string, ownerId: string) {
        return await this.db.query.templates.findFirst({
            where: and(
                eq(templates.id, id),
                eq(templates.ownerId, ownerId)
            ),
        });
    }

    async createTemplate(ownerId: string, data: CreateTemplateInput) {
        const [newTemplate] = await this.db.insert(templates).values({
            ...data,
            ownerId,
        }).returning();
        return newTemplate;
    }

    async updateTemplate(id: string, ownerId: string, data: UpdateTemplateInput) {
        const [updatedTemplate] = await this.db.update(templates)
            .set(data)
            .where(and(
                eq(templates.id, id),
                eq(templates.ownerId, ownerId)
            ))
            .returning();
        return updatedTemplate;
    }

    async deleteTemplate(id: string, ownerId: string) {
        const [deletedTemplate] = await this.db.delete(templates)
            .where(and(
                eq(templates.id, id),
                eq(templates.ownerId, ownerId)
            ))
            .returning();
        return deletedTemplate;
    }
}
