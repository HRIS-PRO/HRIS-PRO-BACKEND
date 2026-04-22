"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplatesService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../../db/schema");
class TemplatesService {
    db;
    constructor(db) {
        this.db = db;
    }
    async getTemplates(ownerId) {
        return await this.db.query.templates.findMany({
            // where: eq(templates.ownerId, ownerId),
            orderBy: (templates, { desc }) => [desc(templates.createdAt)],
        });
    }
    async getTemplateById(id, ownerId) {
        return await this.db.query.templates.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.templates.id, id), (0, drizzle_orm_1.eq)(schema_1.templates.ownerId, ownerId)),
        });
    }
    async createTemplate(ownerId, data) {
        const [newTemplate] = await this.db.insert(schema_1.templates).values({
            ...data,
            ownerId,
        }).returning();
        return newTemplate;
    }
    async updateTemplate(id, ownerId, data) {
        const [updatedTemplate] = await this.db.update(schema_1.templates)
            .set(data)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.templates.id, id), (0, drizzle_orm_1.eq)(schema_1.templates.ownerId, ownerId)))
            .returning();
        return updatedTemplate;
    }
    async deleteTemplate(id, ownerId) {
        const [deletedTemplate] = await this.db.delete(schema_1.templates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.templates.id, id), (0, drizzle_orm_1.eq)(schema_1.templates.ownerId, ownerId)))
            .returning();
        return deletedTemplate;
    }
}
exports.TemplatesService = TemplatesService;
