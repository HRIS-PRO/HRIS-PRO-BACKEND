"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsController = void 0;
class ReportsController {
    reportsService;
    constructor(reportsService) {
        this.reportsService = reportsService;
    }
    async createReportHandler(request, reply) {
        try {
            const userId = request.user.id;
            const report = await this.reportsService.createReport(userId, request.body);
            return reply.code(201).send(report);
        }
        catch (error) {
            if (error?.statusCode === 409) {
                return reply.code(409).send({ message: error.message });
            }
            request.log.error(error);
            return reply.code(500).send({ message: 'Internal Server Error' });
        }
    }
    async getManagedReportsHandler(request, reply) {
        try {
            const userId = request.user.id;
            const reports = await this.reportsService.fetchManagedReports(userId);
            return reply.send(reports);
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({ message: 'Internal Server Error' });
        }
    }
    async getUserReportsHandler(request, reply) {
        try {
            const userId = request.user.id;
            const reports = await this.reportsService.getReportsForUser(userId);
            return reply.send(reports);
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({ message: 'Internal Server Error' });
        }
    }
    async updateReportStatusHandler(request, reply) {
        try {
            const report = await this.reportsService.updateReportStatus(request.params.id, request.body.status);
            return reply.send(report);
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({ message: 'Internal Server Error' });
        }
    }
}
exports.ReportsController = ReportsController;
