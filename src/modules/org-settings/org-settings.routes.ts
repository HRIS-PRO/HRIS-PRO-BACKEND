import { FastifyInstance } from 'fastify';
import { OrgSettingsController } from './org-settings.controller';
import { updateOrgSettingsSchema } from './org-settings.schema';

const controller = new OrgSettingsController();

export const orgSettingsRoutes = async (app: FastifyInstance) => {
    // Public read so branding/theme can load before login (e.g. scan page)
    app.get('/', controller.get);

    app.put('/', {
        schema: {
            body: updateOrgSettingsSchema
        },
        preHandler: [app.authenticate]
    }, controller.update);

    app.post('/logo', {
        preHandler: [app.authenticate]
    }, controller.uploadLogo);
};
