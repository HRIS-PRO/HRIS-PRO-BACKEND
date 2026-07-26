"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orgSettingsRoutes = void 0;
const org_settings_controller_1 = require("./org-settings.controller");
const org_settings_schema_1 = require("./org-settings.schema");
const controller = new org_settings_controller_1.OrgSettingsController();
const orgSettingsRoutes = async (app) => {
    // Public read so branding/theme can load before login (e.g. scan page)
    app.get('/', controller.get);
    app.put('/', {
        schema: {
            body: org_settings_schema_1.updateOrgSettingsSchema
        },
        preHandler: [app.authenticate]
    }, controller.update);
    app.post('/logo', {
        preHandler: [app.authenticate]
    }, controller.uploadLogo);
};
exports.orgSettingsRoutes = orgSettingsRoutes;
