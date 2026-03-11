"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspacesController = void 0;
const storage_service_1 = require("../shared/storage.service");
const crypto_1 = __importDefault(require("crypto"));
class WorkspacesController {
    workspacesService;
    constructor(workspacesService) {
        this.workspacesService = workspacesService;
    }
    async getMyWorkspaces(request, reply) {
        const userId = request.user.id;
        try {
            const workspaces = await this.workspacesService.getUserWorkspaces(userId);
            return reply.send(workspaces);
        }
        catch (error) {
            return reply.code(500).send({ message: error.message || 'Failed to fetch workspaces' });
        }
    }
    async createWorkspace(request, reply) {
        const userId = request.user.id;
        const data = request.body;
        try {
            const workspace = await this.workspacesService.createWorkspace(userId, data);
            return reply.code(201).send(workspace);
        }
        catch (error) {
            return reply.code(400).send({ message: error.message || 'Failed to create workspace' });
        }
    }
    async addMember(request, reply) {
        const workspaceId = request.params.id;
        const { userId } = request.body;
        try {
            const membership = await this.workspacesService.addWorkspaceMember(workspaceId, userId);
            return reply.send(membership);
        }
        catch (error) {
            return reply.code(400).send({ message: error.message || 'Failed to add member' });
        }
    }
    async removeMember(request, reply) {
        const workspaceId = request.params.id;
        const userId = request.params.userId;
        try {
            await this.workspacesService.removeWorkspaceMember(workspaceId, userId);
            return reply.send({ message: 'Member removed successfully' });
        }
        catch (error) {
            return reply.code(400).send({ message: error.message || 'Failed to remove member' });
        }
    }
    async getMembers(request, reply) {
        const workspaceId = request.params.id;
        try {
            const members = await this.workspacesService.getWorkspaceMembers(workspaceId);
            return reply.send(members);
        }
        catch (error) {
            return reply.code(500).send({ message: error.message || 'Failed to fetch members' });
        }
    }
    async updateWorkspace(request, reply) {
        const userId = request.user.id;
        const workspaceId = request.params.id;
        const data = request.body;
        try {
            const workspace = await this.workspacesService.updateWorkspace(workspaceId, userId, data);
            return reply.send(workspace);
        }
        catch (error) {
            return reply.code(400).send({ message: error.message || 'Failed to update workspace' });
        }
    }
    async deleteWorkspace(request, reply) {
        const userId = request.user.id;
        const workspaceId = request.params.id;
        try {
            await this.workspacesService.deleteWorkspace(workspaceId, userId);
            return reply.send({ message: 'Workspace deleted successfully' });
        }
        catch (error) {
            return reply.code(400).send({ message: error.message || 'Failed to delete workspace' });
        }
    }
    async uploadLogo(request, reply) {
        const userId = request.user.id;
        const workspaceId = request.params.id;
        try {
            const data = await request.file();
            if (!data) {
                return reply.code(400).send({ message: 'No file uploaded' });
            }
            const buffer = await data.toBuffer();
            const extension = data.filename.split('.').pop() || 'webp';
            const uniqueFilename = `${crypto_1.default.randomUUID()}.${extension}`;
            const path = `workspaces/${workspaceId}/logo/${uniqueFilename}`;
            const uploadResult = await storage_service_1.StorageService.uploadFile({ buffer, mimetype: data.mimetype }, path);
            const workspace = await this.workspacesService.updateWorkspace(workspaceId, userId, { logo_url: uploadResult.url });
            return reply.send(workspace);
        }
        catch (error) {
            console.error('Logo upload error:', error);
            return reply.code(400).send({ message: error.message || 'Failed to upload logo' });
        }
    }
    async getEligibleUsers(request, reply) {
        const workspaceId = request.params.id;
        try {
            const users = await this.workspacesService.getEligibleUsers(workspaceId);
            return reply.send(users);
        }
        catch (error) {
            return reply.code(500).send({ message: error.message || 'Failed to fetch eligible users' });
        }
    }
    async bulkAddMembers(request, reply) {
        const workspaceId = request.params.id;
        const inviterUserId = request.user.id;
        const { userIds } = request.body;
        try {
            const result = await this.workspacesService.bulkAddMembers(workspaceId, inviterUserId, userIds);
            return reply.send(result);
        }
        catch (error) {
            return reply.code(400).send({ message: error.message || 'Failed to add members' });
        }
    }
    async bulkAddCustomers(request, reply) {
        const { customersData } = request.body;
        try {
            const result = await this.workspacesService.bulkAddCustomers(customersData);
            return reply.send(result);
        }
        catch (error) {
            return reply.code(400).send({ message: error.message || 'Failed to bulk add customers' });
        }
    }
    async getBulkCustomers(request, reply) {
        try {
            const customers = await this.workspacesService.getBulkCustomers();
            return reply.send(customers);
        }
        catch (error) {
            return reply.code(500).send({ message: error.message || 'Failed to fetch customers' });
        }
    }
    async deleteBulkCustomers(request, reply) {
        const { customerIds } = request.body;
        try {
            const result = await this.workspacesService.deleteBulkCustomers(customerIds);
            return reply.send(result);
        }
        catch (error) {
            return reply.code(400).send({ message: error.message || 'Failed to delete customers' });
        }
    }
    // --- CONTACT GROUPS ---
    async createGroup(request, reply) {
        const workspaceId = request.params.workspaceId;
        const data = request.body;
        try {
            const result = await this.workspacesService.createGroup(workspaceId, data);
            return reply.send(result);
        }
        catch (error) {
            return reply.code(400).send({ message: error.message || 'Failed to create group' });
        }
    }
    async getGroups(request, reply) {
        const workspaceId = request.params.workspaceId;
        try {
            const groups = await this.workspacesService.getGroups(workspaceId);
            return reply.send(groups);
        }
        catch (error) {
            return reply.code(500).send({ message: error.message || 'Failed to fetch groups' });
        }
    }
    async addGroupMembers(request, reply) {
        const { workspaceId, groupId } = request.params;
        const { customerIds } = request.body;
        try {
            const result = await this.workspacesService.addGroupMembers(workspaceId, groupId, customerIds);
            return reply.send(result);
        }
        catch (error) {
            return reply.code(400).send({ message: error.message || 'Failed to add group members' });
        }
    }
    async getDashboardStats(request, reply) {
        const workspaceId = request.params.workspaceId;
        try {
            const stats = await this.workspacesService.getDashboardStats(workspaceId);
            return reply.send(stats);
        }
        catch (error) {
            return reply.code(500).send({ message: error.message || 'Failed to fetch dashboard stats' });
        }
    }
}
exports.WorkspacesController = WorkspacesController;
