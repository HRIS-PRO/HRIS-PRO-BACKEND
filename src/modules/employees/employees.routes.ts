import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { createEmployeeSchema } from './employees.schema';

export default async function employeesRoutes(app: FastifyInstance) {
    const employeesService = new EmployeesService(app.db);
    const employeesController = new EmployeesController(employeesService);

    app.get(
        '/',
        employeesController.getAllEmployees.bind(employeesController)
    );

    app.post(
        '/',
        {
            schema: {
                body: createEmployeeSchema,
            },
        },
        employeesController.createEmployee.bind(employeesController)
    );
}
