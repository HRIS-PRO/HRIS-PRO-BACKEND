"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = departmentsRoutes;
const departments_service_1 = require("./departments.service");
const departments_controller_1 = require("./departments.controller");
const departments_schema_1 = require("./departments.schema");
const zod_1 = require("zod");
async function departmentsRoutes(app) {
    const departmentsService = new departments_service_1.DepartmentsService(app.db);
    const departmentsController = new departments_controller_1.DepartmentsController(departmentsService);
    app.addHook('onRequest', async (request, reply) => {
        try {
            if (request.headers.authorization) {
                await request.jwtVerify();
            }
        }
        catch (err) {
            // Log or ignore if some routes don't strictly need it, but we want request.user
            request.log.error(err);
        }
    });
    app.get('/', departmentsController.getDepartments.bind(departmentsController));
    app.get('/eligible-heads', departmentsController.getEligibleHeads.bind(departmentsController));
    app.post('/', {
        schema: {
            body: departments_schema_1.createDepartmentSchema,
        },
    }, departmentsController.createDepartment.bind(departmentsController));
    app.put('/:id', {
        schema: {
            params: zod_1.z.object({ id: zod_1.z.string().uuid() }),
            body: departments_schema_1.updateDepartmentSchema,
        },
    }, departmentsController.updateDepartment.bind(departmentsController));
}
