import { FastifyReply, FastifyRequest } from 'fastify';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceInput, UpdateWorkspaceInput, AddMemberInput } from './workspaces.schema';
import { StorageService } from '../shared/storage.service';
import crypto from 'crypto';

export class WorkspacesController {
    constructor(private workspacesService: WorkspacesService) { }

    async getMyWorkspaces(
        request: FastifyRequest,
        reply: FastifyReply
    ) {
        const userId = (request.user as any).id;
        try {
            const workspaces = await this.workspacesService.getUserWorkspaces(userId);
            return reply.send(workspaces);
        } catch (error: any) {
            return reply.code(500).send({ message: error.message || 'Failed to fetch workspaces' });
        }
    }

    async createWorkspace(
        request: FastifyRequest<{ Body: CreateWorkspaceInput }>,
        reply: FastifyReply
    ) {
        const userId = (request.user as any).id;
        const data = request.body;
        try {
            const workspace = await this.workspacesService.createWorkspace(userId, data);
            return reply.code(201).send(workspace);
        } catch (error: any) {
            return reply.code(400).send({ message: error.message || 'Failed to create workspace' });
        }
    }

    async addMember(
        request: FastifyRequest<{ Params: { id: string }, Body: AddMemberInput }>,
        reply: FastifyReply
    ) {
        const workspaceId = request.params.id;
        const { userId } = request.body;
        try {
            const membership = await this.workspacesService.addWorkspaceMember(workspaceId, userId);
            return reply.send(membership);
        } catch (error: any) {
            return reply.code(400).send({ message: error.message || 'Failed to add member' });
        }
    }

    async removeMember(
        request: FastifyRequest<{ Params: { id: string, userId: string } }>,
        reply: FastifyReply
    ) {
        const workspaceId = request.params.id;
        const userId = request.params.userId;
        try {
            await this.workspacesService.removeWorkspaceMember(workspaceId, userId);
            return reply.send({ message: 'Member removed successfully' });
        } catch (error: any) {
            return reply.code(400).send({ message: error.message || 'Failed to remove member' });
        }
    }

    async getMembers(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) {
        const workspaceId = request.params.id;
        try {
            const members = await this.workspacesService.getWorkspaceMembers(workspaceId);
            return reply.send(members);
        } catch (error: any) {
            return reply.code(500).send({ message: error.message || 'Failed to fetch members' });
        }
    }

    async updateWorkspace(
        request: FastifyRequest<{ Params: { id: string }, Body: UpdateWorkspaceInput }>,
        reply: FastifyReply
    ) {
        const userId = (request.user as any).id;
        const workspaceId = request.params.id;
        const data = request.body;
        try {
            const workspace = await this.workspacesService.updateWorkspace(workspaceId, userId, data);
            return reply.send(workspace);
        } catch (error: any) {
            return reply.code(400).send({ message: error.message || 'Failed to update workspace' });
        }
    }

    async deleteWorkspace(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) {
        const userId = (request.user as any).id;
        const workspaceId = request.params.id;
        try {
            await this.workspacesService.deleteWorkspace(workspaceId, userId);
            return reply.send({ message: 'Workspace deleted successfully' });
        } catch (error: any) {
            return reply.code(400).send({ message: error.message || 'Failed to delete workspace' });
        }
    }

    async uploadLogo(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) {
        const userId = (request.user as any).id;
        const workspaceId = request.params.id;

        try {
            const data = await request.file();
            if (!data) {
                return reply.code(400).send({ message: 'No file uploaded' });
            }

            const buffer = await data.toBuffer();
            const extension = data.filename.split('.').pop() || 'webp';
            const uniqueFilename = `${crypto.randomUUID()}.${extension}`;
            const path = `workspaces/${workspaceId}/logo/${uniqueFilename}`;

            const uploadResult = await StorageService.uploadFile(
                { buffer, mimetype: data.mimetype },
                path
            );

            const workspace = await this.workspacesService.updateWorkspace(
                workspaceId,
                userId,
                { logo_url: uploadResult.url }
            );

            return reply.send(workspace);
        } catch (error: any) {
            console.error('Logo upload error:', error);
            return reply.code(400).send({ message: error.message || 'Failed to upload logo' });
        }
    }

    async getEligibleUsers(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) {
        const workspaceId = request.params.id;
        try {
            const users = await this.workspacesService.getEligibleUsers(workspaceId);
            return reply.send(users);
        } catch (error: any) {
            return reply.code(500).send({ message: error.message || 'Failed to fetch eligible users' });
        }
    }

    async bulkAddMembers(
        request: FastifyRequest<{ Params: { id: string }, Body: { userIds: string[] } }>,
        reply: FastifyReply
    ) {
        const workspaceId = request.params.id;
        const inviterUserId = (request.user as any).id;
        const { userIds } = request.body;
        try {
            const result = await this.workspacesService.bulkAddMembers(workspaceId, inviterUserId, userIds);
            return reply.send(result);
        } catch (error: any) {
            return reply.code(400).send({ message: error.message || 'Failed to add members' });
        }
    }

    async bulkAddCustomers(
        request: FastifyRequest<{ Body: { customersData: any[] } }>,
        reply: FastifyReply
    ) {
        const { customersData } = request.body;
        try {
            const result = await this.workspacesService.bulkAddCustomers(customersData);
            return reply.send(result);
        } catch (error: any) {
            return reply.code(400).send({ message: error.message || 'Failed to bulk add customers' });
        }
    }

    async getBulkCustomers(
        request: FastifyRequest,
        reply: FastifyReply
    ) {
        try {
            const customers = await this.workspacesService.getBulkCustomers();
            return reply.send(customers);
        } catch (error: any) {
            return reply.code(500).send({ message: error.message || 'Failed to fetch customers' });
        }
    }

    async deleteBulkCustomers(
        request: FastifyRequest<{ Body: { customerIds: string[] } }>,
        reply: FastifyReply
    ) {
        const { customerIds } = request.body;
        try {
            const result = await this.workspacesService.deleteBulkCustomers(customerIds);
            return reply.send(result);
        } catch (error: any) {
            return reply.code(400).send({ message: error.message || 'Failed to delete customers' });
        }
    }
    // --- CONTACT GROUPS ---

    async createGroup(
        request: FastifyRequest<{ Params: { workspaceId: string }, Body: any }>,
        reply: FastifyReply
    ) {
        const workspaceId = request.params.workspaceId;
        const data = request.body as Parameters<typeof this.workspacesService.createGroup>[1];
        try {
            const result = await this.workspacesService.createGroup(workspaceId, data);
            return reply.send(result);
        } catch (error: any) {
            return reply.code(400).send({ message: error.message || 'Failed to create group' });
        }
    }

    async getGroups(
        request: FastifyRequest<{ Params: { workspaceId: string } }>,
        reply: FastifyReply
    ) {
        const workspaceId = request.params.workspaceId;
        try {
            const groups = await this.workspacesService.getGroups(workspaceId);
            return reply.send(groups);
        } catch (error: any) {
            return reply.code(500).send({ message: error.message || 'Failed to fetch groups' });
        }
    }

    async addGroupMembers(
        request: FastifyRequest<{ Params: { workspaceId: string, groupId: string }, Body: { customerIds: string[] } }>,
        reply: FastifyReply
    ) {
        const { workspaceId, groupId } = request.params;
        const { customerIds } = request.body;
        try {
            const result = await this.workspacesService.addGroupMembers(workspaceId, groupId, customerIds);
            return reply.send(result);
        } catch (error: any) {
            return reply.code(400).send({ message: error.message || 'Failed to add group members' });
        }
    }

    async getDashboardStats(
        request: FastifyRequest<{ Params: { workspaceId: string } }>,
        reply: FastifyReply
    ) {
        const workspaceId = request.params.workspaceId;
        try {
            const stats = await this.workspacesService.getDashboardStats(workspaceId);
            return reply.send(stats);
        } catch (error: any) {
            return reply.code(500).send({ message: error.message || 'Failed to fetch dashboard stats' });
        }
    }
}
