"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepartmentsController = void 0;
class DepartmentsController {
    departmentsService;
    constructor(departmentsService) {
        this.departmentsService = departmentsService;
    }
    async getDepartments(request, reply) {
        try {
            const depts = await this.departmentsService.getAllDepartments();
            // Map Drizzle data to the format the frontend expects in DepartmentConfiguration.tsx
            const formatted = depts.map(d => ({
                id: d.id,
                name: d.name,
                description: d.description || '',
                parentId: d.parentId,
                head: {
                    name: d.headName || 'Unassigned',
                    avatar: '', // Depending on your DB schema, could be populated or derived
                    initials: (d.headName || 'NA').substring(0, 2).toUpperCase()
                },
                staffCount: d.staffCount || 0,
                status: d.status === 'ACTIVE' ? 'Active' : 'Inactive',
                icon: d.icon || 'engineering',
                color: d.color || 'blue'
            }));
            return reply.send(formatted);
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({ message: 'Error fetching departments' });
        }
    }
    async getEligibleHeads(request, reply) {
        try {
            const heads = await this.departmentsService.getEligibleHeads();
            return reply.send(heads);
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({ message: 'Error fetching eligible heads' });
        }
    }
    async createDepartment(request, reply) {
        try {
            // In a real app we'd get the authenticated user ID from the JWT request payload.
            // E.g., const userId = (request.user as any)?.id;
            // We'll pass it if we have it to allow the service to default the head.
            const userId = request.user?.id;
            const newDept = await this.departmentsService.createDepartment(request.body, userId);
            return reply.code(201).send(newDept);
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({ message: 'Error creating department' });
        }
    }
    async updateDepartment(request, reply) {
        try {
            const { id } = request.params;
            const userId = request.user?.id;
            const updatedDept = await this.departmentsService.updateDepartment(id, request.body, userId);
            if (!updatedDept) {
                return reply.code(404).send({ message: 'Department not found' });
            }
            return reply.code(200).send(updatedDept);
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({ message: 'Error updating department' });
        }
    }
}
exports.DepartmentsController = DepartmentsController;
