import { FastifyInstance } from 'fastify';
import { DepartmentsService } from './departments.service';
import { DepartmentsController } from './departments.controller';
import { createDepartmentSchema, updateDepartmentSchema } from './departments.schema';
import { z } from 'zod';

export default async function departmentsRoutes(app: FastifyInstance) {
    const departmentsService = new DepartmentsService(app.db);
    const departmentsController = new DepartmentsController(departmentsService);

    // Note: For production, we would add the `onRequest: [app.authenticate]` hook 
    // here to protect these routes. Assuming it matches auth logic.

    app.get(
        '/',
        departmentsController.getDepartments.bind(departmentsController)
    );

    app.get(
        '/eligible-heads',
        departmentsController.getEligibleHeads.bind(departmentsController)
    );

    app.post(
        '/',
        {
            schema: {
                body: createDepartmentSchema,
            },
        },
        departmentsController.createDepartment.bind(departmentsController)
    );

    app.put(
        '/:id',
        {
            schema: {
                params: z.object({ id: z.string().uuid() }),
                body: updateDepartmentSchema,
            },
        },
        departmentsController.updateDepartment.bind(departmentsController)
    );
}
