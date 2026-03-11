"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../../db/schema");
const wsManager_1 = require("../../websocket/wsManager");
class ReportsService {
    db;
    constructor(db) {
        this.db = db;
    }
    async createReport(userId, data) {
        // Prevent duplicate open reports for the same asset
        const existingOpenReport = await this.db.query.assetReports.findFirst({
            where: (reports, { and: a, inArray: inArr, eq: eqFn }) => a(eqFn(reports.assetId, data.assetId), inArr(reports.status, ['PENDING', 'IN_REVIEW']))
        });
        if (existingOpenReport) {
            const error = new Error('A report for this asset is already open (PENDING or IN_REVIEW). Please wait until it is resolved before submitting a new one.');
            error.statusCode = 409;
            throw error;
        }
        const [newReport] = await this.db.insert(schema_1.assetReports).values({
            assetId: data.assetId,
            userId: userId,
            comment: data.comment,
            status: 'PENDING',
        }).returning();
        // --- Real-time: notify the category manager ---
        try {
            // Find the asset's category
            const [assetRow] = await this.db
                .select({ category: schema_1.assets.category, name: schema_1.assets.name, serialNumber: schema_1.assets.serialNumber })
                .from(schema_1.assets)
                .where((0, drizzle_orm_1.eq)(schema_1.assets.id, data.assetId));
            if (assetRow) {
                // Find the category manager
                const [categoryRow] = await this.db
                    .select({ managedById: schema_1.assetCategories.managedById })
                    .from(schema_1.assetCategories)
                    .where((0, drizzle_orm_1.eq)(schema_1.assetCategories.name, assetRow.category));
                if (categoryRow?.managedById) {
                    wsManager_1.wsManager.sendToUser(categoryRow.managedById, {
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
        }
        catch (wsErr) {
            // WS broadcast failure must NOT break the HTTP response
            console.error('WS broadcast error (report:created):', wsErr);
        }
        // Fetch the newly created report with joined asset info to return a complete object
        const [populatedReport] = await this.db
            .select({
            id: schema_1.assetReports.id,
            assetId: schema_1.assetReports.assetId,
            userId: schema_1.assetReports.userId,
            comment: schema_1.assetReports.comment,
            status: schema_1.assetReports.status,
            createdAt: schema_1.assetReports.createdAt,
            updatedAt: schema_1.assetReports.updatedAt,
            assetName: schema_1.assets.name,
            assetCategory: schema_1.assets.category,
            assetSerialNumber: schema_1.assets.serialNumber,
        })
            .from(schema_1.assetReports)
            .leftJoin(schema_1.assets, (0, drizzle_orm_1.eq)(schema_1.assetReports.assetId, schema_1.assets.id))
            .where((0, drizzle_orm_1.eq)(schema_1.assetReports.id, newReport.id))
            .limit(1);
        return populatedReport || newReport;
    }
    async getReportsForManager(managerId) {
        // Find categories managed by this user
        const managedCategories = await this.db.query.assetCategories.findMany({
            where: (0, drizzle_orm_1.eq)(schema_1.assetCategories.managedById, managerId),
        });
        const categoryNames = managedCategories.map((c) => c.name);
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
            where: (0, drizzle_orm_1.inArray)(this.db.select({ id: schema_1.assets.id })
                .from(schema_1.assets)
                .where((0, drizzle_orm_1.inArray)(schema_1.assets.category, categoryNames)), schema_1.assetReports.assetId)
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
    async getManagedReports(managerId) {
        const managedCategories = await this.db.query.assetCategories.findMany({
            where: (0, drizzle_orm_1.eq)(schema_1.assetCategories.managedById, managerId),
        });
        const categoryNames = managedCategories.map((c) => c.name);
        if (categoryNames.length === 0) {
            return [];
        }
        const results = await this.db.select({
            id: schema_1.assetReports.id,
            assetId: schema_1.assetReports.assetId,
            userId: schema_1.assetReports.userId,
            comment: schema_1.assetReports.comment,
            status: schema_1.assetReports.status,
            createdAt: schema_1.assetReports.createdAt,
            assetName: schema_1.assets.name,
            assetCategory: schema_1.assets.category,
            userName: this.db.raw("concat(\"HRIS_EMPLOYEE\".\"firstName\", ' ', \"HRIS_EMPLOYEE\".\"surname\")"),
        })
            .from(schema_1.assetReports)
            .innerJoin(schema_1.assets, (0, drizzle_orm_1.eq)(schema_1.assetReports.assetId, schema_1.assets.id))
            .innerJoin(this.db.query.users, (0, drizzle_orm_1.eq)(schema_1.assetReports.userId, this.db.query.users.id))
            .innerJoin(this.db.query.employees, (0, drizzle_orm_1.eq)(this.db.query.users.id, this.db.query.employees.userId))
            .where((0, drizzle_orm_1.inArray)(schema_1.assets.category, categoryNames))
            .execute();
        return results;
    }
    // Let's refine the getReportsForManager to use the simplest reliable query
    async fetchManagedReports(managerId) {
        // Step 1: find categories managed by this user
        const managedCategories = await this.db
            .select({ name: schema_1.assetCategories.name })
            .from(schema_1.assetCategories)
            .where((0, drizzle_orm_1.eq)(schema_1.assetCategories.managedById, managerId));
        const categoryNames = managedCategories.map((c) => c.name);
        if (categoryNames.length === 0) {
            return [];
        }
        // Step 2: fetch reports for assets in those categories, joining employee for user name
        const results = await this.db
            .select({
            id: schema_1.assetReports.id,
            assetId: schema_1.assetReports.assetId,
            userId: schema_1.assetReports.userId,
            comment: schema_1.assetReports.comment,
            status: schema_1.assetReports.status,
            createdAt: schema_1.assetReports.createdAt,
            updatedAt: schema_1.assetReports.updatedAt,
            assetName: schema_1.assets.name,
            assetCategory: schema_1.assets.category,
            assetSerialNumber: schema_1.assets.serialNumber,
            userName: (0, drizzle_orm_1.sql) `COALESCE(${schema_1.employees.firstName} || ' ' || ${schema_1.employees.surname}, 'Unknown User')`,
        })
            .from(schema_1.assetReports)
            .leftJoin(schema_1.assets, (0, drizzle_orm_1.eq)(schema_1.assetReports.assetId, schema_1.assets.id))
            .leftJoin(schema_1.employees, (0, drizzle_orm_1.eq)(schema_1.assetReports.userId, schema_1.employees.userId))
            .where((0, drizzle_orm_1.inArray)(schema_1.assets.category, categoryNames))
            .orderBy((0, drizzle_orm_1.sql) `${schema_1.assetReports.createdAt} DESC`);
        return results;
    }
    async getReportsForUser(userId) {
        const results = await this.db
            .select({
            id: schema_1.assetReports.id,
            assetId: schema_1.assetReports.assetId,
            userId: schema_1.assetReports.userId,
            comment: schema_1.assetReports.comment,
            status: schema_1.assetReports.status,
            createdAt: schema_1.assetReports.createdAt,
            updatedAt: schema_1.assetReports.updatedAt,
            assetName: schema_1.assets.name,
            assetCategory: schema_1.assets.category,
            assetSerialNumber: schema_1.assets.serialNumber,
        })
            .from(schema_1.assetReports)
            .leftJoin(schema_1.assets, (0, drizzle_orm_1.eq)(schema_1.assetReports.assetId, schema_1.assets.id))
            .where((0, drizzle_orm_1.eq)(schema_1.assetReports.userId, userId))
            .orderBy((0, drizzle_orm_1.sql) `${schema_1.assetReports.createdAt} DESC`);
        return results;
    }
    async updateReportStatus(reportId, status) {
        const [updatedReport] = await this.db.update(schema_1.assetReports)
            .set({
            status: status,
            updatedAt: new Date()
        })
            .where((0, drizzle_orm_1.eq)(schema_1.assetReports.id, reportId))
            .returning();
        // --- Real-time: notify the report submitter ---
        try {
            if (updatedReport?.userId) {
                wsManager_1.wsManager.sendToUser(updatedReport.userId, {
                    type: 'report:status_updated',
                    payload: {
                        id: updatedReport.id,
                        assetId: updatedReport.assetId,
                        status: updatedReport.status,
                        updatedAt: updatedReport.updatedAt,
                    },
                });
            }
        }
        catch (wsErr) {
            console.error('WS broadcast error (report:status_updated):', wsErr);
        }
        return updatedReport;
    }
}
exports.ReportsService = ReportsService;
