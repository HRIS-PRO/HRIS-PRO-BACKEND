"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = employeesRoutes;
const employees_service_1 = require("./employees.service");
const employees_controller_1 = require("./employees.controller");
const employees_schema_1 = require("./employees.schema");
async function employeesRoutes(app) {
    const employeesService = new employees_service_1.EmployeesService(app.db);
    const employeesController = new employees_controller_1.EmployeesController(employeesService);
    app.addHook('onRequest', app.checkAppRole('HRIS'));
    app.get('/', employeesController.getAllEmployees.bind(employeesController));
    app.post('/', {
        schema: {
            body: employees_schema_1.createEmployeeSchema,
        },
    }, employeesController.createEmployee.bind(employeesController));
    app.get('/:id/roles', employeesController.getEmployeeRoles.bind(employeesController));
    app.put('/:id/roles/:app', {
        schema: {
            body: employees_schema_1.assignRoleSchema,
        },
    }, employeesController.assignEmployeeRole.bind(employeesController));
    app.delete('/:id/roles/:app', employeesController.revokeEmployeeRole.bind(employeesController));
    app.delete('/:id', employeesController.deleteEmployee.bind(employeesController));
}
