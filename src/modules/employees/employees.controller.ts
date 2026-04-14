import { FastifyReply, FastifyRequest } from 'fastify';
import { EmployeesService } from './employees.service';
import { CreateEmployeeInput } from './employees.schema';

export class EmployeesController {
    constructor(private employeesService: EmployeesService) { }

    async getAllEmployees(request: FastifyRequest, reply: FastifyReply) {
        try {
            const employees = await this.employeesService.getAllEmployees();
            return reply.send(employees);
        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ message: 'Error fetching employees' });
        }
    }

    async createEmployee(
        request: FastifyRequest<{ Body: CreateEmployeeInput }>,
        reply: FastifyReply
    ) {
        try {
            const newEmployee = await this.employeesService.createEmployee(request.body);
            return reply.code(201).send(newEmployee);
        } catch (error: any) {
            request.log.error(error);
            // Distinguish Duplicate Email Error
            if (error.message === "User with this email already exists") {
                return reply.code(409).send({ message: error.message });
            }
            return reply.code(500).send({ message: 'Error creating employee' });
        }
    }

    async getEmployeeRoles(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) {
        try {
            const roles = await this.employeesService.getEmployeeRoles(request.params.id);
            return reply.send(roles);
        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ message: 'Error fetching employee roles' });
        }
    }

    async assignEmployeeRole(
        request: FastifyRequest<{ Params: { id: string, app: string }, Body: { role: string } }>,
        reply: FastifyReply
    ) {
        try {
            const { id, app } = request.params;
            const { role } = request.body;
            const updatedRole = await this.employeesService.assignEmployeeRole(id, app, role);
            return reply.send(updatedRole);
        } catch (error: any) {
            request.log.error(error);
            if (error.message === 'User not found for this employee') {
                return reply.code(404).send({ message: error.message });
            }
            return reply.code(500).send({ message: 'Error assigning role' });
        }
    }

    async revokeEmployeeRole(
        request: FastifyRequest<{ Params: { id: string, app: string } }>,
        reply: FastifyReply
    ) {
        try {
            const { id, app } = request.params;
            const result = await this.employeesService.revokeEmployeeRole(id, app);
            return reply.send(result);
        } catch (error: any) {
            request.log.error(error);
            if (error.message === 'User not found for this employee') {
                return reply.code(404).send({ message: error.message });
            }
            return reply.code(500).send({ message: 'Error revoking role' });
        }
    }
}
