"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = workspacesRoutes;
const workspaces_service_1 = require("./workspaces.service");
const workspaces_controller_1 = require("./workspaces.controller");
const workspaces_schema_1 = require("./workspaces.schema");
async function workspacesRoutes(app) {
    const workspacesService = new workspaces_service_1.WorkspacesService(app.db);
    const workspacesController = new workspaces_controller_1.WorkspacesController(workspacesService);
    app.addHook('onRequest', app.authenticate);
    app.get('/', workspacesController.getMyWorkspaces.bind(workspacesController));
    app.post('/', {
        schema: {
            body: workspaces_schema_1.createWorkspaceSchema,
        },
    }, workspacesController.createWorkspace.bind(workspacesController));
    app.get('/:id/members', workspacesController.getMembers.bind(workspacesController));
    app.post('/:id/members', {
        schema: {
            body: workspaces_schema_1.addMemberSchema,
        },
    }, workspacesController.addMember.bind(workspacesController));
    app.delete('/:id/members/:userId', workspacesController.removeMember.bind(workspacesController));
    app.patch('/:id', {
        schema: {
            body: workspaces_schema_1.updateWorkspaceSchema,
        },
    }, workspacesController.updateWorkspace.bind(workspacesController));
    app.delete('/:id', workspacesController.deleteWorkspace.bind(workspacesController));
    app.post('/:id/logo', workspacesController.uploadLogo.bind(workspacesController));
    app.get('/:id/eligible-users', workspacesController.getEligibleUsers.bind(workspacesController));
    app.post('/:id/members/bulk', workspacesController.bulkAddMembers.bind(workspacesController));
    app.post('/customers/bulk', workspacesController.bulkAddCustomers.bind(workspacesController));
    app.patch('/customers/:id', workspacesController.updateBulkCustomer.bind(workspacesController));
    app.get('/customers', workspacesController.getBulkCustomers.bind(workspacesController));
    app.delete('/customers/bulk', workspacesController.deleteBulkCustomers.bind(workspacesController));
    // --- CONTACT GROUPS ---
    app.post('/:workspaceId/groups', workspacesController.createGroup.bind(workspacesController));
    app.get('/:workspaceId/groups', workspacesController.getGroups.bind(workspacesController));
    app.post('/:workspaceId/groups/:groupId/members', workspacesController.addGroupMembers.bind(workspacesController));
    app.get('/:workspaceId/dashboard-stats', workspacesController.getDashboardStats.bind(workspacesController));
}
