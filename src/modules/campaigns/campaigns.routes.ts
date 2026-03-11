import { FastifyInstance } from 'fastify';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { createCampaignSchema, updateCampaignSchema, approveCampaignSchema } from './campaigns.schema';
import { db } from '../../db';

export async function campaignsRoutes(app: FastifyInstance) {
    const campaignsService = new CampaignsService(db);
    const campaignsController = new CampaignsController(campaignsService);

    app.addHook('preHandler', app.authenticate);

    // List campaigns in a workspace
    app.get('/:workspaceId', (request: any, reply) => campaignsController.getCampaigns(request, reply));

    // Get single campaign detail
    app.get('/:workspaceId/:id', (request: any, reply) => campaignsController.getCampaign(request, reply));

    // Create campaign
    app.post('/:workspaceId', {
        schema: {
            body: createCampaignSchema
        }
    }, (request: any, reply) => campaignsController.createCampaign(request, reply));

    // Send Test Email
    app.post('/:workspaceId/test-email', (request: any, reply) => campaignsController.sendTestEmail(request, reply));

    // Update campaign
    app.patch('/:workspaceId/:id', {
        schema: {
            body: updateCampaignSchema
        }
    }, (request: any, reply) => campaignsController.updateCampaign(request, reply));

    // Submit for approval
    app.post('/:workspaceId/:id/submit', (request: any, reply) => campaignsController.submitCampaign(request, reply));

    // Resend approval notification
    app.post('/:workspaceId/:id/resend-approval', (request: any, reply) => campaignsController.resendApprovalNotification(request, reply));

    // Approve or Reject
    app.post('/:workspaceId/:id/review', {
        schema: {
            body: approveCampaignSchema
        }
    }, (request: any, reply) => campaignsController.approveCampaign(request, reply));

    // Delete campaign
    app.delete('/:workspaceId/:id', (request: any, reply) => campaignsController.deleteCampaign(request, reply));
}
