"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EquipmentRequestsService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../../db/schema");
const wsManager_1 = require("../../websocket/wsManager");
class EquipmentRequestsService {
    db;
    constructor(db) {
        this.db = db;
    }
    async createRequest(userId, data) {
        // 1. Get requester basic info
        const emp = await this.db.query.employees.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.employees.userId, userId),
        });
        const { isHOO } = await this.checkUserRoles(userId, emp);
        let initialStatus = 'PENDING_HOD';
        if (emp) {
            const dept = await this.db.query.departments.findFirst({
                where: (0, drizzle_orm_1.eq)(schema_1.departments.id, emp.departmentId),
            });
            const isHOD = dept?.headId === emp.id;
            if (isHOD)
                initialStatus = 'PENDING_HOO';
        }
        // HOO skip logic (overrides HOD skip if applicable)
        if (isHOO) {
            initialStatus = 'PENDING_CATEGORY_ADMIN';
        }
        // 3. Create Request
        const [newRequest] = await this.db.insert(schema_1.equipmentRequests).values({
            userId,
            categoryId: data.categoryId,
            priority: data.priority,
            justification: data.justification,
            status: initialStatus,
        }).returning();
        // 4. Fetch populated request for broadcast
        const populated = await this.getFullRequest(newRequest.id);
        // 5. Broadcast via WebSocket
        try {
            wsManager_1.wsManager.broadcast('request:created', populated);
        }
        catch (wsErr) {
            console.error('WS broadcast error (request:created):', wsErr);
        }
        return populated;
    }
    async checkUserRoles(userId, emp) {
        // Resolve employee ID for this user if not provided
        if (!emp) {
            emp = await this.db.query.employees.findFirst({
                where: (0, drizzle_orm_1.eq)(schema_1.employees.userId, userId),
            });
        }
        // B. Is user head of "Head of operations" department?
        const hooDept = await this.db.query.departments.findFirst({
            where: (0, drizzle_orm_1.or)((0, drizzle_orm_1.sql) `lower(${schema_1.departments.name}) = 'head of operations'`, (0, drizzle_orm_1.sql) `lower(${schema_1.departments.name}) = 'head of operation'`, (0, drizzle_orm_1.sql) `lower(${schema_1.departments.name}) = 'head of hoo'`),
        });
        const isHOO = (emp && hooDept && hooDept.headId === emp.id) || (hooDept && (hooDept.headId === userId || hooDept.headId === emp?.id));
        // C. Is user a Category Manager?
        const managedCategories = await this.db.query.assetCategories.findMany({
            where: (0, drizzle_orm_1.eq)(schema_1.assetCategories.managedById, userId),
        });
        const managedCatIds = managedCategories.map((c) => c.id);
        // D. Is user a Department Head?
        const deptsUserHeads = await this.db.query.departments.findMany({
            where: (0, drizzle_orm_1.or)(emp ? (0, drizzle_orm_1.eq)(schema_1.departments.headId, emp.id) : undefined, (0, drizzle_orm_1.eq)(schema_1.departments.headId, userId))
        });
        const deptIdsUserHeads = deptsUserHeads.map((d) => d.id);
        return { isHOO, managedCatIds, deptIdsUserHeads };
    }
    async updateRequestStatus(id, approverUserId, status) {
        // This method will handle both approval movement and rejection
        // Logic for "next stage" happens here
        const currentRequest = await this.db.query.equipmentRequests.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.equipmentRequests.id, id),
        });
        if (!currentRequest)
            throw new Error('Request not found');
        let nextStatus = status;
        if (status !== 'REJECTED') {
            // If approved, calculate next move
            if (currentRequest.status === 'PENDING_HOD') {
                nextStatus = 'PENDING_HOO';
            }
            else if (currentRequest.status === 'PENDING_HOO') {
                nextStatus = 'PENDING_CATEGORY_ADMIN';
            }
            else if (currentRequest.status === 'PENDING_CATEGORY_ADMIN') {
                nextStatus = 'APPROVED';
            }
        }
        const [updated] = await this.db.update(schema_1.equipmentRequests)
            .set({
            status: nextStatus,
            updatedAt: new Date()
        })
            .where((0, drizzle_orm_1.eq)(schema_1.equipmentRequests.id, id))
            .returning();
        const populated = await this.getFullRequest(updated.id);
        try {
            wsManager_1.wsManager.broadcast('request:status_updated', populated);
        }
        catch (wsErr) {
            console.error('WS broadcast error (request:status_updated):', wsErr);
        }
        return populated;
    }
    async fetchManagedRequests(userId) {
        const { isHOO, managedCatIds, deptIdsUserHeads } = await this.checkUserRoles(userId);
        // 2. Build Query based on roles
        const conditions = [];
        // If HOD, show PENDING_HOD for their department
        if (deptIdsUserHeads.length > 0) {
            conditions.push((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.equipmentRequests.status, 'PENDING_HOD'), (0, drizzle_orm_1.inArray)((0, drizzle_orm_1.sql) `${schema_1.employees.departmentId}`, deptIdsUserHeads)));
        }
        // If HOO, show PENDING_HOO
        if (isHOO) {
            conditions.push((0, drizzle_orm_1.eq)(schema_1.equipmentRequests.status, 'PENDING_HOO'));
        }
        // If Category Admin, show PENDING_CATEGORY_ADMIN for their categories
        if (managedCatIds.length > 0) {
            conditions.push((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.equipmentRequests.status, 'PENDING_CATEGORY_ADMIN'), (0, drizzle_orm_1.inArray)(schema_1.equipmentRequests.categoryId, managedCatIds)));
        }
        if (conditions.length === 0)
            return [];
        // 3. Execute Join Query
        const results = await this.db
            .select({
            id: schema_1.equipmentRequests.id,
            userId: schema_1.equipmentRequests.userId,
            categoryId: schema_1.equipmentRequests.categoryId,
            priority: schema_1.equipmentRequests.priority,
            justification: schema_1.equipmentRequests.justification,
            status: schema_1.equipmentRequests.status,
            createdAt: schema_1.equipmentRequests.createdAt,
            updatedAt: schema_1.equipmentRequests.updatedAt,
            userName: (0, drizzle_orm_1.sql) `coalesce(${schema_1.employees.firstName} || ' ' || ${schema_1.employees.surname}, ${schema_1.users.email})`,
            categoryName: schema_1.assetCategories.name,
        })
            .from(schema_1.equipmentRequests)
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.equipmentRequests.userId, schema_1.users.id))
            .leftJoin(schema_1.employees, (0, drizzle_orm_1.eq)(schema_1.users.id, schema_1.employees.userId))
            .leftJoin(schema_1.assetCategories, (0, drizzle_orm_1.eq)(schema_1.equipmentRequests.categoryId, schema_1.assetCategories.id))
            .where((0, drizzle_orm_1.or)(...conditions))
            .orderBy((0, drizzle_orm_1.sql) `${schema_1.equipmentRequests.createdAt} DESC`);
        return results;
    }
    async getRequestsForUser(userId) {
        return await this.db
            .select({
            id: schema_1.equipmentRequests.id,
            userId: schema_1.equipmentRequests.userId,
            categoryId: schema_1.equipmentRequests.categoryId,
            priority: schema_1.equipmentRequests.priority,
            justification: schema_1.equipmentRequests.justification,
            status: schema_1.equipmentRequests.status,
            createdAt: schema_1.equipmentRequests.createdAt,
            updatedAt: schema_1.equipmentRequests.updatedAt,
            categoryName: schema_1.assetCategories.name,
        })
            .from(schema_1.equipmentRequests)
            .innerJoin(schema_1.assetCategories, (0, drizzle_orm_1.eq)(schema_1.equipmentRequests.categoryId, schema_1.assetCategories.id))
            .where((0, drizzle_orm_1.eq)(schema_1.equipmentRequests.userId, userId))
            .orderBy((0, drizzle_orm_1.sql) `${schema_1.equipmentRequests.createdAt} DESC`);
    }
    async getFullRequest(id) {
        const [result] = await this.db
            .select({
            id: schema_1.equipmentRequests.id,
            userId: schema_1.equipmentRequests.userId,
            categoryId: schema_1.equipmentRequests.categoryId,
            priority: schema_1.equipmentRequests.priority,
            justification: schema_1.equipmentRequests.justification,
            status: schema_1.equipmentRequests.status,
            createdAt: schema_1.equipmentRequests.createdAt,
            updatedAt: schema_1.equipmentRequests.updatedAt,
            userName: (0, drizzle_orm_1.sql) `coalesce(${schema_1.employees.firstName} || ' ' || ${schema_1.employees.surname}, ${schema_1.users.email})`,
            categoryName: schema_1.assetCategories.name,
        })
            .from(schema_1.equipmentRequests)
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.equipmentRequests.userId, schema_1.users.id))
            .leftJoin(schema_1.employees, (0, drizzle_orm_1.eq)(schema_1.users.id, schema_1.employees.userId))
            .leftJoin(schema_1.assetCategories, (0, drizzle_orm_1.eq)(schema_1.equipmentRequests.categoryId, schema_1.assetCategories.id))
            .where((0, drizzle_orm_1.eq)(schema_1.equipmentRequests.id, id))
            .limit(1);
        return result;
    }
}
exports.EquipmentRequestsService = EquipmentRequestsService;
