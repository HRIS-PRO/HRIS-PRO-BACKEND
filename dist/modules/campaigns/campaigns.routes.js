"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.campaignsRoutes = campaignsRoutes;
const campaigns_controller_1 = require("./campaigns.controller");
const campaigns_service_1 = require("./campaigns.service");
const campaigns_schema_1 = require("./campaigns.schema");
const db_1 = require("../../db");
async function campaignsRoutes(app) {
    const campaignsService = new campaigns_service_1.CampaignsService(db_1.db);
    const campaignsController = new campaigns_controller_1.CampaignsController(campaignsService);
    app.addHook('preHandler', app.authenticate);
    // List campaigns in a workspace
    app.get('/:workspaceId', (request, reply) => campaignsController.getCampaigns(request, reply));
    // Get single campaign detail
    app.get('/:workspaceId/:id', (request, reply) => campaignsController.getCampaign(request, reply));
    // Create campaign
    app.post('/:workspaceId', {
        schema: {
            body: campaigns_schema_1.createCampaignSchema
        }
    }, (request, reply) => campaignsController.createCampaign(request, reply));
    // Send Test Email
    app.post('/:workspaceId/test-email', (request, reply) => campaignsController.sendTestEmail(request, reply));
    // Update campaign
    app.patch('/:workspaceId/:id', {
        schema: {
            body: campaigns_schema_1.updateCampaignSchema
        }
    }, (request, reply) => campaignsController.updateCampaign(request, reply));
    // Submit for approval
    app.post('/:workspaceId/:id/submit', (request, reply) => campaignsController.submitCampaign(request, reply));
    // Approve or Reject
    app.post('/:workspaceId/:id/review', {
        schema: {
            body: campaigns_schema_1.approveCampaignSchema
        }
    }, (request, reply) => campaignsController.approveCampaign(request, reply));
    // Delete campaign
    app.delete('/:workspaceId/:id', (request, reply) => campaignsController.deleteCampaign(request, reply));
}
