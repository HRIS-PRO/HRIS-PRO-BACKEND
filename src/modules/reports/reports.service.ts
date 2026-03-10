import { eq, inArray, sql } from 'drizzle-orm';
import { assetReports, assets, assetCategories, employees } from '../../db/schema';
import { CreateReportInput } from './reports.schema';
import { wsManager } from '../../websocket/wsManager';

export class ReportsService {
    constructor(private db: any) { }

    async createReport(userId: string, data: CreateReportInput) {
        // Prevent duplicate open reports for the same asset
        const existingOpenReport = await this.db.query.assetReports.findFirst({
            where: (reports: any, { and: a, inArray: inArr, eq: eqFn }: any) =>
                a(
                    eqFn(reports.assetId, data.assetId),
                    inArr(reports.status, ['PENDING', 'IN_REVIEW'])
                )
        });

        if (existingOpenReport) {
            const error: any = new Error(
                'A report for this asset is already open (PENDING or IN_REVIEW). Please wait until it is resolved before submitting a new one.'
            );
            error.statusCode = 409;
            throw error;
        }

        const [newReport] = await this.db.insert(assetReports).values({
            assetId: data.assetId,
            userId: userId,
            comment: data.comment,
            status: 'PENDING',
        }).returning();

        // --- Real-time: notify the category manager ---
        try {
            // Find the asset's category
            const [assetRow] = await this.db
                .select({ category: assets.category, name: assets.name, serialNumber: assets.serialNumber })
                .from(assets)
                .where(eq(assets.id, data.assetId));

            if (assetRow) {
                // Find the category manager
                const [categoryRow] = await this.db
                    .select({ managedById: assetCategories.managedById })
                    .from(assetCategories)
                    .where(eq(assetCategories.name, assetRow.category));

                if (categoryRow?.managedById) {
                    wsManager.sendToUser(categoryRow.managedById, {
                        type: 'report:created',
                        payload: {
                            ...newReport,
                            assetName: assetRow.name,
                            assetCategory: assetRow.category,
                            assetSerialNumber: assetRow.serialNumber,
                        },
                    });
                }
            }
        } catch (wsErr) {
            // WS broadcast failure must NOT break the HTTP response
            console.error('WS broadcast error (report:created):', wsErr);
        }

        // Fetch the newly created report with joined asset info to return a complete object
        const [populatedReport] = await this.db
            .select({
                id: assetReports.id,
                assetId: assetReports.assetId,
                userId: assetReports.userId,
                comment: assetReports.comment,
                status: assetReports.status,
                createdAt: assetReports.createdAt,
                updatedAt: assetReports.updatedAt,
                assetName: assets.name,
                assetCategory: assets.category,
                assetSerialNumber: assets.serialNumber,
            })
            .from(assetReports)
            .leftJoin(assets, eq(assetReports.assetId, assets.id))
            .where(eq(assetReports.id, newReport.id))
            .limit(1);

        return populatedReport || newReport;
    }

    async getReportsForManager(managerId: string) {
        // Find categories managed by this user
        const managedCategories = await this.db.query.assetCategories.findMany({
            where: eq(assetCategories.managedById, managerId),
        });

        const categoryNames = managedCategories.map((c: any) => c.name);

        if (categoryNames.length === 0) {
            return [];
        }

        // Find reports for assets in these categories
        return this.db.query.assetReports.findMany({
            with: {
                asset: true,
                user: {
                    with: {
                        employee: true
                    }
                }
            },
            where: inArray(
                this.db.select({ id: assets.id })
                    .from(assets)
                    .where(inArray(assets.category, categoryNames)),
                assetReports.assetId
            )
        });

        // Alternative approach if subqueries are complex with findMany:
        /*
        return this.db.select()
            .from(assetReports)
            .innerJoin(assets, eq(assetReports.assetId, assets.id))
            .where(inArray(assets.category, categoryNames))
            .execute();
        */
    }

    // A simpler version for now using join if findMany with subquery is tricky
    async getManagedReports(managerId: string) {
        const managedCategories = await this.db.query.assetCategories.findMany({
            where: eq(assetCategories.managedById, managerId),
        });

        const categoryNames = managedCategories.map((c: any) => c.name);

        if (categoryNames.length === 0) {
            return [];
        }

        const results = await this.db.select({
            id: assetReports.id,
            assetId: assetReports.assetId,
            userId: assetReports.userId,
            comment: assetReports.comment,
            status: assetReports.status,
            createdAt: assetReports.createdAt,
            assetName: assets.name,
            assetCategory: assets.category,
            userName: this.db.raw("concat(\"HRIS_EMPLOYEE\".\"firstName\", ' ', \"HRIS_EMPLOYEE\".\"surname\")"),
        })
            .from(assetReports)
            .innerJoin(assets, eq(assetReports.assetId, assets.id))
            .innerJoin(this.db.query.users, eq(assetReports.userId, this.db.query.users.id))
            .innerJoin(this.db.query.employees, eq(this.db.query.users.id, this.db.query.employees.userId))
            .where(inArray(assets.category, categoryNames))
            .execute();

        return results;
    }

    // Let's refine the getReportsForManager to use the simplest reliable query
    async fetchManagedReports(managerId: string) {
        // Step 1: find categories managed by this user
        const managedCategories = await this.db
            .select({ name: assetCategories.name })
            .from(assetCategories)
            .where(eq(assetCategories.managedById, managerId));

        const categoryNames = managedCategories.map((c: any) => c.name);

        if (categoryNames.length === 0) {
            return [];
        }

        // Step 2: fetch reports for assets in those categories, joining employee for user name
        const results = await this.db
            .select({
                id: assetReports.id,
                assetId: assetReports.assetId,
                userId: assetReports.userId,
                comment: assetReports.comment,
                status: assetReports.status,
                createdAt: assetReports.createdAt,
                updatedAt: assetReports.updatedAt,
                assetName: assets.name,
                assetCategory: assets.category,
                assetSerialNumber: assets.serialNumber,
                userName: sql<string>`COALESCE(${employees.firstName} || ' ' || ${employees.surname}, 'Unknown User')`,
            })
            .from(assetReports)
            .leftJoin(assets, eq(assetReports.assetId, assets.id))
            .leftJoin(employees, eq(assetReports.userId, employees.userId))
            .where(inArray(assets.category, categoryNames))
            .orderBy(sql`${assetReports.createdAt} DESC`);

        return results;
    }

    async getReportsForUser(userId: string) {
        const results = await this.db
            .select({
                id: assetReports.id,
                assetId: assetReports.assetId,
                userId: assetReports.userId,
                comment: assetReports.comment,
                status: assetReports.status,
                createdAt: assetReports.createdAt,
                updatedAt: assetReports.updatedAt,
                assetName: assets.name,
                assetCategory: assets.category,
                assetSerialNumber: assets.serialNumber,
            })
            .from(assetReports)
            .leftJoin(assets, eq(assetReports.assetId, assets.id))
            .where(eq(assetReports.userId, userId))
            .orderBy(sql`${assetReports.createdAt} DESC`);

        return results;
    }

    async updateReportStatus(reportId: string, status: 'PENDING' | 'IN_REVIEW' | 'RESOLVED') {
        const [updatedReport] = await this.db.update(assetReports)
            .set({
                status: status,
                updatedAt: new Date()
            })
            .where(eq(assetReports.id, reportId))
            .returning();

        // --- Real-time: notify the report submitter ---
        try {
            if (updatedReport?.userId) {
                wsManager.sendToUser(updatedReport.userId, {
                    type: 'report:status_updated',
                    payload: {
                        id: updatedReport.id,
                        assetId: updatedReport.assetId,
                        status: updatedReport.status,
                        updatedAt: updatedReport.updatedAt,
                    },
                });
            }
        } catch (wsErr) {
            console.error('WS broadcast error (report:status_updated):', wsErr);
        }

        return updatedReport;
    }
}
