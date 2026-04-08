import { FastifyReply, FastifyRequest } from 'fastify';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignInput, UpdateCampaignInput, approveCampaignSchema } from './campaigns.schema';

export class CampaignsController {
    constructor(private campaignsService: CampaignsService) { }

    private checkRole(request: FastifyRequest, allowedRoles: string[]) {
        const user = request.user as any;
        const msgScaleRole = user.roles?.find((r: any) => r.app === 'MSGSCALE_BULK')?.role;
        if (!msgScaleRole || !allowedRoles.includes(msgScaleRole)) {
            throw new Error(`Unauthorized: Required one of ${allowedRoles.join(', ')}`);
        }
        return msgScaleRole;
    }

    async getCampaigns(
        request: FastifyRequest<{ Params: { workspaceId: string } }>,
        reply: FastifyReply
    ) {
        const { workspaceId } = request.params;
        try {
            const campaigns = await this.campaignsService.getCampaigns(workspaceId);
            return reply.send(campaigns);
        } catch (error: any) {
            return reply.code(500).send({ message: error.message || 'Failed to fetch campaigns' });
        }
    }

    async getCampaign(
        request: FastifyRequest<{ Params: { workspaceId: string, id: string } }>,
        reply: FastifyReply
    ) {
        const { workspaceId, id } = request.params;
        try {
            const campaign = await this.campaignsService.getCampaignById(id, workspaceId);
            if (!campaign) {
                return reply.code(404).send({ message: 'Campaign not found' });
            }
            return reply.send(campaign);
        } catch (error: any) {
            return reply.code(500).send({ message: error.message || 'Failed to fetch campaign' });
        }
    }

    async createCampaign(
        request: FastifyRequest<{ Params: { workspaceId: string }, Body: CreateCampaignInput }>,
        reply: FastifyReply
    ) {
        const { workspaceId } = request.params;
        const userId = (request.user as any).id;
        const data = request.body;

        try {
            const role = this.checkRole(request, ['Admin', 'Manager', 'Editor', 'User']);
            
            if ((data.cycleConfig || data.anniversaryConfig) && role !== 'Admin' && role !== 'Manager') {
                return reply.code(403).send({ message: 'Only Managers and Admins can create recurring campaigns' });
            }

            const campaign = await this.campaignsService.createCampaign(workspaceId, userId, data);
            return reply.code(201).send(campaign);
        } catch (error: any) {
            return reply.code(error.message.includes('Unauthorized') ? 403 : 400).send({ message: error.message });
        }
    }

    async sendTestEmail(
        request: FastifyRequest<{ Params: { workspaceId: string }, Body: { to: string, subject: string, preheader: string, htmlContent: string, fromName?: string, fromEmail?: string } }>,
        reply: FastifyReply
    ) {
        const { workspaceId } = request.params;
        const payload = request.body;

        try {
            this.checkRole(request, ['Admin', 'Manager', 'Editor']);
            if (!payload.to || !payload.htmlContent) {
                return reply.code(400).send({ message: 'Recipient and HTML content are required' });
            }
            const result = await this.campaignsService.sendTestEmail(workspaceId, payload);
            return reply.send(result);
        } catch (error: any) {
            return reply.code(error.message.includes('Unauthorized') ? 403 : 500).send({ message: error.message });
        }
    }

    async updateCampaign(
        request: FastifyRequest<{ Params: { workspaceId: string, id: string }, Body: UpdateCampaignInput }>,
        reply: FastifyReply
    ) {
        const { workspaceId, id } = request.params;
        try {
            const role = this.checkRole(request, ['Admin', 'Manager', 'Editor', 'User']);
            const data = request.body;

            if ((data.cycleConfig || data.anniversaryConfig) && role !== 'Admin' && role !== 'Manager') {
                return reply.code(403).send({ message: 'Only Managers and Admins can manage recurring campaigns' });
            }

            const campaign = await this.campaignsService.updateCampaign(id, workspaceId, data);
            return reply.send(campaign);
        } catch (error: any) {
            return reply.code(error.message.includes('Unauthorized') ? 403 : 400).send({ message: error.message });
        }
    }

    async submitCampaign(
        request: FastifyRequest<{ Params: { workspaceId: string, id: string } }>,
        reply: FastifyReply
    ) {
        const { workspaceId, id } = request.params;
        try {
            const role = this.checkRole(request, ['Admin', 'Manager', 'Editor', 'User']);
            const campaign = await this.campaignsService.submitCampaign(id, workspaceId, (request.user as any)?.id as string, role);
            if (!campaign) {
                return reply.code(400).send({ message: 'Campaign must be in DRAFT status to submit' });
            }
            return reply.send(campaign);
        } catch (error: any) {
            return reply.code(error.message.includes('Unauthorized') ? 403 : 400).send({ message: error.message });
        }
    }

    async resendApprovalNotification(
        request: FastifyRequest<{ Params: { workspaceId: string, id: string } }>,
        reply: FastifyReply
    ) {
        const { workspaceId, id } = request.params;
        try {
            this.checkRole(request, ['Admin', 'Manager', 'Editor']);
            const campaign = await this.campaignsService.resendApprovalNotification(id, workspaceId, (request.user as any)?.id as string);
            return reply.send({ success: true, message: 'Approval notification resent successfully' });
        } catch (error: any) {
            return reply.code(error.message.includes('Unauthorized') ? 403 : 400).send({ message: error.message });
        }
    }

    async approveCampaign(
        request: FastifyRequest<{ Params: { workspaceId: string, id: string }, Body: { action: 'APPROVE' | 'REJECT' } }>,
        reply: FastifyReply
    ) {
        const { workspaceId, id } = request.params;
        const userId = (request.user as any).id;
        const { action } = request.body;

        try {
            const role = this.checkRole(request, ['Admin', 'Manager', 'Editor']);
            const campaign = await this.campaignsService.approveCampaign(id, workspaceId, userId, action, role);
            if (!campaign) {
                return reply.code(400).send({ message: 'Campaign must be in PENDING status to approve/reject' });
            }
            return reply.send(campaign);
        } catch (error: any) {
            return reply.code(error.message.includes('Unauthorized') ? 403 : 400).send({ message: error.message });
        }
    }

    async deleteCampaign(
        request: FastifyRequest<{ Params: { workspaceId: string, id: string } }>,
        reply: FastifyReply
    ) {
        const { workspaceId, id } = request.params;
        try {
            const role = this.checkRole(request, ['Admin', 'Manager', 'Editor', 'User']);
            const campaign = await this.campaignsService.deleteCampaign(id, workspaceId, (request.user as any).id, role);
            if (!campaign) {
                return reply.code(404).send({ message: 'Campaign not found' });
            }
            return reply.send({ message: 'Campaign deleted successfully' });
        } catch (error: any) {
            return reply.code(error.message.includes('Unauthorized') ? 403 : 400).send({ message: error.message });
        }
    }
}
