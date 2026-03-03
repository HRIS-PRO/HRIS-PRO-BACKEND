import { FastifyReply, FastifyRequest } from 'fastify';
import { CreateReportInput, UpdateReportStatusInput } from './reports.schema';
import { ReportsService } from './reports.service';

export class ReportsController {
    constructor(private reportsService: ReportsService) { }

    async createReportHandler(
        request: FastifyRequest<{ Body: CreateReportInput }>,
        reply: FastifyReply
    ) {
        try {
            const userId = (request.user as any).id;
            const report = await this.reportsService.createReport(userId, request.body);
            return reply.code(201).send(report);
        } catch (error: any) {
            if (error?.statusCode === 409) {
                return reply.code(409).send({ message: error.message });
            }
            request.log.error(error);
            return reply.code(500).send({ message: 'Internal Server Error' });
        }
    }

    async getManagedReportsHandler(
        request: FastifyRequest,
        reply: FastifyReply
    ) {
        try {
            const userId = (request.user as any).id;
            const reports = await this.reportsService.fetchManagedReports(userId);
            return reply.send(reports);
        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ message: 'Internal Server Error' });
        }
    }

    async getUserReportsHandler(
        request: FastifyRequest,
        reply: FastifyReply
    ) {
        try {
            const userId = (request.user as any).id;
            const reports = await this.reportsService.getReportsForUser(userId);
            return reply.send(reports);
        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ message: 'Internal Server Error' });
        }
    }

    async updateReportStatusHandler(
        request: FastifyRequest<{ Params: { id: string }, Body: UpdateReportStatusInput }>,
        reply: FastifyReply
    ) {
        try {
            const report = await this.reportsService.updateReportStatus(request.params.id, request.body.status);
            return reply.send(report);
        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ message: 'Internal Server Error' });
        }
    }
}
