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
}
