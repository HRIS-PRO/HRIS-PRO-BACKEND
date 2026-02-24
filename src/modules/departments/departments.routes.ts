import { FastifyInstance } from 'fastify';
import { DepartmentsService } from './departments.service';
import { DepartmentsController } from './departments.controller';
import { createDepartmentSchema, updateDepartmentSchema } from './departments.schema';
import { z } from 'zod';

export default async function departmentsRoutes(app: FastifyInstance) {
    const departmentsService = new DepartmentsService(app.db);
    const departmentsController = new DepartmentsController(departmentsService);

    app.addHook('onRequest', async (request, reply) => {
        try {
            if (request.headers.authorization) {
                await request.jwtVerify();
            }
        } catch (err) {
            // Log or ignore if some routes don't strictly need it, but we want request.user
            request.log.error(err);
        }
    });

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
