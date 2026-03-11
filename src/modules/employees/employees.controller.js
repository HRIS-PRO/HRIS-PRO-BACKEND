"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeesController = void 0;
class EmployeesController {
    employeesService;
    constructor(employeesService) {
        this.employeesService = employeesService;
    }
    async getAllEmployees(request, reply) {
        try {
            const employees = await this.employeesService.getAllEmployees();
            return reply.send(employees);
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({ message: 'Error fetching employees' });
        }
    }
    async createEmployee(request, reply) {
        try {
            const newEmployee = await this.employeesService.createEmployee(request.body);
            return reply.code(201).send(newEmployee);
        }
        catch (error) {
            request.log.error(error);
            // Distinguish Duplicate Email Error
            if (error.message === "User with this email already exists") {
                return reply.code(409).send({ message: error.message });
            }
            return reply.code(500).send({ message: 'Error creating employee' });
        }
    }
    async getEmployeeRoles(request, reply) {
        try {
            const roles = await this.employeesService.getEmployeeRoles(request.params.id);
            return reply.send(roles);
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({ message: 'Error fetching employee roles' });
        }
    }
    async assignEmployeeRole(request, reply) {
        try {
            const { id, app } = request.params;
            const { role } = request.body;
            const updatedRole = await this.employeesService.assignEmployeeRole(id, app, role);
            return reply.send(updatedRole);
        }
        catch (error) {
            request.log.error(error);
            if (error.message === 'User not found for this employee') {
                return reply.code(404).send({ message: error.message });
            }
            return reply.code(500).send({ message: 'Error assigning role' });
        }
    }
}
exports.EmployeesController = EmployeesController;
