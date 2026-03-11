"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = reportsRoutes;
const reports_controller_1 = require("./reports.controller");
const reports_service_1 = require("./reports.service");
const reports_schema_1 = require("./reports.schema");
async function reportsRoutes(app) {
    const reportsService = new reports_service_1.ReportsService(app.db);
    const reportsController = new reports_controller_1.ReportsController(reportsService);
    app.addHook('preHandler', app.authenticate);
    app.post('/', {
        schema: {
            body: reports_schema_1.createReportSchema,
        }
    }, reportsController.createReportHandler.bind(reportsController));
    app.get('/managed', reportsController.getManagedReportsHandler.bind(reportsController));
    app.get('/me', reportsController.getUserReportsHandler.bind(reportsController));
    app.patch('/:id/status', {
        schema: {
            body: reports_schema_1.updateReportStatusSchema,
        }
    }, reportsController.updateReportStatusHandler.bind(reportsController));
}
