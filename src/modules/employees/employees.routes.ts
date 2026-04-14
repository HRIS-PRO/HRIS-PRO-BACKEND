import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { createEmployeeSchema, assignRoleSchema } from './employees.schema';

export default async function employeesRoutes(app: FastifyInstance) {
    const employeesService = new EmployeesService(app.db);
    const employeesController = new EmployeesController(employeesService);

    app.addHook('onRequest', app.checkAppRole('HRIS'));

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

    app.get(
        '/:id/roles',
        employeesController.getEmployeeRoles.bind(employeesController)
    );

    app.put(
        '/:id/roles/:app',
        {
            schema: {
                body: assignRoleSchema,
            },
        },
        employeesController.assignEmployeeRole.bind(employeesController)
    );

    app.delete(
        '/:id/roles/:app',
        employeesController.revokeEmployeeRole.bind(employeesController)
    );
}
