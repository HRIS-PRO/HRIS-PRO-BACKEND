import { FastifyInstance } from 'fastify';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { createReportSchema, updateReportStatusSchema } from './reports.schema';

export default async function reportsRoutes(app: FastifyInstance) {
    const reportsService = new ReportsService(app.db);
    const reportsController = new ReportsController(reportsService);

    app.addHook('preHandler', app.authenticate);

    app.post('/', {
        schema: {
            body: createReportSchema,
        }
    }, reportsController.createReportHandler.bind(reportsController));

    app.get('/managed', reportsController.getManagedReportsHandler.bind(reportsController));

    app.get('/me', reportsController.getUserReportsHandler.bind(reportsController));

    app.patch('/:id/status', {
        schema: {
            body: updateReportStatusSchema,
        }
    }, reportsController.updateReportStatusHandler.bind(reportsController));
}
