"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignsController = void 0;
class CampaignsController {
    campaignsService;
    constructor(campaignsService) {
        this.campaignsService = campaignsService;
    }
    checkRole(request, allowedRoles) {
        const user = request.user;
        const msgScaleRole = user.roles?.find((r) => r.app === 'MSGSCALE_BULK')?.role;
        if (!msgScaleRole || !allowedRoles.includes(msgScaleRole)) {
            throw new Error(`Unauthorized: Required one of ${allowedRoles.join(', ')}`);
        }
        return msgScaleRole;
    }
    async getCampaigns(request, reply) {
        const { workspaceId } = request.params;
        try {
            const campaigns = await this.campaignsService.getCampaigns(workspaceId);
            return reply.send(campaigns);
        }
        catch (error) {
            return reply.code(500).send({ message: error.message || 'Failed to fetch campaigns' });
        }
    }
    async getCampaign(request, reply) {
        const { workspaceId, id } = request.params;
        try {
            const campaign = await this.campaignsService.getCampaignById(id, workspaceId);
            if (!campaign) {
                return reply.code(404).send({ message: 'Campaign not found' });
            }
            return reply.send(campaign);
        }
        catch (error) {
            return reply.code(500).send({ message: error.message || 'Failed to fetch campaign' });
        }
    }
    async createCampaign(request, reply) {
        const { workspaceId } = request.params;
        const userId = request.user.id;
        const data = request.body;
        try {
            const role = this.checkRole(request, ['Admin', 'Manager', 'Editor', 'User']);
            if ((data.cycleConfig || data.anniversaryConfig) && role !== 'Admin' && role !== 'Manager') {
                return reply.code(403).send({ message: 'Only Managers and Admins can create recurring campaigns' });
            }
            const campaign = await this.campaignsService.createCampaign(workspaceId, userId, data);
            return reply.code(201).send(campaign);
        }
        catch (error) {
            return reply.code(error.message.includes('Unauthorized') ? 403 : 400).send({ message: error.message });
        }
    }
    async sendTestEmail(request, reply) {
        const { workspaceId } = request.params;
        const payload = request.body;
        try {
            this.checkRole(request, ['Admin', 'Manager', 'Editor']);
            if (!payload.to || !payload.htmlContent) {
                return reply.code(400).send({ message: 'Recipient and HTML content are required' });
            }
            const result = await this.campaignsService.sendTestEmail(workspaceId, payload);
            return reply.send(result);
        }
        catch (error) {
            return reply.code(error.message.includes('Unauthorized') ? 403 : 500).send({ message: error.message });
        }
    }
    async updateCampaign(request, reply) {
        const { workspaceId, id } = request.params;
        try {
            const role = this.checkRole(request, ['Admin', 'Manager', 'Editor', 'User']);
            const data = request.body;
            if ((data.cycleConfig || data.anniversaryConfig) && role !== 'Admin' && role !== 'Manager') {
                return reply.code(403).send({ message: 'Only Managers and Admins can manage recurring campaigns' });
            }
            const campaign = await this.campaignsService.updateCampaign(id, workspaceId, data);
            return reply.send(campaign);
        }
        catch (error) {
            return reply.code(error.message.includes('Unauthorized') ? 403 : 400).send({ message: error.message });
        }
    }
    async submitCampaign(request, reply) {
        const { workspaceId, id } = request.params;
        try {
            const role = this.checkRole(request, ['Admin', 'Manager', 'Editor', 'User']);
            const campaign = await this.campaignsService.submitCampaign(id, workspaceId, request.user?.id, role);
            if (!campaign) {
                return reply.code(400).send({ message: 'Campaign must be in DRAFT status to submit' });
            }
            return reply.send(campaign);
        }
        catch (error) {
            return reply.code(error.message.includes('Unauthorized') ? 403 : 400).send({ message: error.message });
        }
    }
    async resendApprovalNotification(request, reply) {
        const { workspaceId, id } = request.params;
        try {
            this.checkRole(request, ['Admin', 'Manager', 'Editor']);
            const campaign = await this.campaignsService.resendApprovalNotification(id, workspaceId, request.user?.id);
            return reply.send({ success: true, message: 'Approval notification resent successfully' });
        }
        catch (error) {
            return reply.code(error.message.includes('Unauthorized') ? 403 : 400).send({ message: error.message });
        }
    }
    async approveCampaign(request, reply) {
        const { workspaceId, id } = request.params;
        const userId = request.user.id;
        const { action } = request.body;
        try {
            const role = this.checkRole(request, ['Admin', 'Manager', 'Editor']);
            const campaign = await this.campaignsService.approveCampaign(id, workspaceId, userId, action, role);
            if (!campaign) {
                return reply.code(400).send({ message: 'Campaign must be in PENDING status to approve/reject' });
            }
            return reply.send(campaign);
        }
        catch (error) {
            return reply.code(error.message.includes('Unauthorized') ? 403 : 400).send({ message: error.message });
        }
    }
    async deleteCampaign(request, reply) {
        const { workspaceId, id } = request.params;
        try {
            const role = this.checkRole(request, ['Admin', 'Manager', 'Editor', 'User']);
            const campaign = await this.campaignsService.deleteCampaign(id, workspaceId, request.user.id, role);
            if (!campaign) {
                return reply.code(404).send({ message: 'Campaign not found' });
            }
            return reply.send({ message: 'Campaign deleted successfully' });
        }
        catch (error) {
            return reply.code(error.message.includes('Unauthorized') ? 403 : 400).send({ message: error.message });
        }
    }
    async retryCampaign(request, reply) {
        const { workspaceId, id } = request.params;
        try {
            this.checkRole(request, ['Admin', 'Manager', 'Editor']);
            const result = await this.campaignsService.retryCampaign(id, workspaceId);
            return reply.send(result);
        }
        catch (error) {
            return reply.code(error.message.includes('Unauthorized') ? 403 : 400).send({ message: error.message });
        }
    }
    async uploadExternalData(request, reply) {
        const { workspaceId, id } = request.params;
        const { rows } = request.body;
        try {
            this.checkRole(request, ['Admin', 'Manager', 'Editor']);
            await this.campaignsService.processExternalData(id, rows);
            return reply.send({ success: true, message: 'External contextual data processed successfully' });
        }
        catch (error) {
            return reply.code(error.message.includes('Unauthorized') ? 403 : 400).send({ message: error.message });
        }
    }
    async previewContextMatch(request, reply) {
        const { workspaceId } = request.params;
        const { groupIds, externalData } = request.body;
        try {
            this.checkRole(request, ['Admin', 'Manager', 'Editor', 'User']);
            const result = await this.campaignsService.previewContextMatch(workspaceId, groupIds, externalData);
            return reply.send(result);
        }
        catch (error) {
            return reply.code(error.message.includes('Unauthorized') ? 403 : 500).send({ message: error.message });
        }
    }
}
exports.CampaignsController = CampaignsController;
