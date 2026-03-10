import { eq, sql, and, inArray, or } from 'drizzle-orm';
import { db } from '../../db';
import { equipmentRequests, users, employees, departments, assetCategories } from '../../db/schema';
import { CreateEquipmentRequestInput } from './equipment-requests.schema';
import { wsManager } from '../../websocket/wsManager';

type DrizzleClient = typeof db;

export class EquipmentRequestsService {
    constructor(private db: DrizzleClient) { }

    async createRequest(userId: string, data: CreateEquipmentRequestInput) {
        // 1. Get requester basic info
        const emp = await this.db.query.employees.findFirst({
            where: eq(employees.userId, userId),
        });

        const { isHOO } = await this.checkUserRoles(userId, emp);

        let initialStatus: any = 'PENDING_HOD';

        if (emp) {
            const dept = await this.db.query.departments.findFirst({
                where: eq(departments.id, emp.departmentId),
            });
            const isHOD = dept?.headId === emp.id;
            if (isHOD) initialStatus = 'PENDING_HOO';
        }

        // HOO skip logic (overrides HOD skip if applicable)
        if (isHOO) {
            initialStatus = 'PENDING_CATEGORY_ADMIN';
        }

        // 3. Create Request
        const [newRequest] = await this.db.insert(equipmentRequests).values({
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
            wsManager.broadcast('request:created', populated);
        } catch (wsErr) {
            console.error('WS broadcast error (request:created):', wsErr);
        }

        return populated;
    }

    private async checkUserRoles(userId: string, emp?: any) {
        // Resolve employee ID for this user if not provided
        if (!emp) {
            emp = await this.db.query.employees.findFirst({
                where: eq(employees.userId, userId),
            });
        }

        // B. Is user head of "Head of operations" department?
        const hooDept = await this.db.query.departments.findFirst({
            where: or(
                sql`lower(${departments.name}) = 'head of operations'`,
                sql`lower(${departments.name}) = 'head of operation'`,
                sql`lower(${departments.name}) = 'head of hoo'`
            ),
        });
        const isHOO = (emp && hooDept && hooDept.headId === emp.id) || (hooDept && (hooDept.headId === userId || hooDept.headId === emp?.id));

        // C. Is user a Category Manager?
        const managedCategories = await this.db.query.assetCategories.findMany({
            where: eq(assetCategories.managedById, userId),
        });
        const managedCatIds = managedCategories.map((c: any) => c.id);

        // D. Is user a Department Head?
        const deptsUserHeads = await this.db.query.departments.findMany({
            where: or(
                emp ? eq(departments.headId, emp.id) : undefined,
                eq(departments.headId, userId)
            )
        });
        const deptIdsUserHeads = deptsUserHeads.map((d: any) => d.id);

        return { isHOO, managedCatIds, deptIdsUserHeads };
    }

    async updateRequestStatus(id: string, approverUserId: string, status: any) {
        // This method will handle both approval movement and rejection
        // Logic for "next stage" happens here

        const currentRequest = await this.db.query.equipmentRequests.findFirst({
            where: eq(equipmentRequests.id, id),
        });

        if (!currentRequest) throw new Error('Request not found');

        let nextStatus = status;

        if (status !== 'REJECTED') {
            // If approved, calculate next move
            if (currentRequest.status === 'PENDING_HOD') {
                nextStatus = 'PENDING_HOO';
            } else if (currentRequest.status === 'PENDING_HOO') {
                nextStatus = 'PENDING_CATEGORY_ADMIN';
            } else if (currentRequest.status === 'PENDING_CATEGORY_ADMIN') {
                nextStatus = 'APPROVED';
            }
        }

        const [updated] = await this.db.update(equipmentRequests)
            .set({
                status: nextStatus,
                updatedAt: new Date()
            })
            .where(eq(equipmentRequests.id, id))
            .returning();

        const populated = await this.getFullRequest(updated.id);

        try {
            wsManager.broadcast('request:status_updated', populated);
        } catch (wsErr) {
            console.error('WS broadcast error (request:status_updated):', wsErr);
        }

        return populated;
    }

    async fetchManagedRequests(userId: string) {
        const { isHOO, managedCatIds, deptIdsUserHeads } = await this.checkUserRoles(userId);

        // 2. Build Query based on roles
        const conditions = [];

        // If HOD, show PENDING_HOD for their department
        if (deptIdsUserHeads.length > 0) {
            conditions.push(
                and(
                    eq(equipmentRequests.status, 'PENDING_HOD'),
                    inArray(sql`${employees.departmentId}`, deptIdsUserHeads)
                ) as any
            );
        }

        // If HOO, show PENDING_HOO
        if (isHOO) {
            conditions.push(eq(equipmentRequests.status, 'PENDING_HOO') as any);
        }

        // If Category Admin, show PENDING_CATEGORY_ADMIN for their categories
        if (managedCatIds.length > 0) {
            conditions.push(
                and(
                    eq(equipmentRequests.status, 'PENDING_CATEGORY_ADMIN'),
                    inArray(equipmentRequests.categoryId, managedCatIds)
                ) as any
            );
        }

        if (conditions.length === 0) return [];

        // 3. Execute Join Query
        const results = await this.db
            .select({
                id: equipmentRequests.id,
                userId: equipmentRequests.userId,
                categoryId: equipmentRequests.categoryId,
                priority: equipmentRequests.priority,
                justification: equipmentRequests.justification,
                status: equipmentRequests.status,
                createdAt: equipmentRequests.createdAt,
                updatedAt: equipmentRequests.updatedAt,
                userName: sql<string>`coalesce(${employees.firstName} || ' ' || ${employees.surname}, ${users.email})`,
                categoryName: assetCategories.name,
            })
            .from(equipmentRequests)
            .leftJoin(users, eq(equipmentRequests.userId, users.id))
            .leftJoin(employees, eq(users.id, employees.userId))
            .leftJoin(assetCategories, eq(equipmentRequests.categoryId, assetCategories.id))
            .where(or(...conditions))
            .orderBy(sql`${equipmentRequests.createdAt} DESC`);

        return results;
    }

    async getRequestsForUser(userId: string) {
        return await this.db
            .select({
                id: equipmentRequests.id,
                userId: equipmentRequests.userId,
                categoryId: equipmentRequests.categoryId,
                priority: equipmentRequests.priority,
                justification: equipmentRequests.justification,
                status: equipmentRequests.status,
                createdAt: equipmentRequests.createdAt,
                updatedAt: equipmentRequests.updatedAt,
                categoryName: assetCategories.name,
            })
            .from(equipmentRequests)
            .innerJoin(assetCategories, eq(equipmentRequests.categoryId, assetCategories.id))
            .where(eq(equipmentRequests.userId, userId))
            .orderBy(sql`${equipmentRequests.createdAt} DESC`);
    }

    private async getFullRequest(id: string) {
        const [result] = await this.db
            .select({
                id: equipmentRequests.id,
                userId: equipmentRequests.userId,
                categoryId: equipmentRequests.categoryId,
                priority: equipmentRequests.priority,
                justification: equipmentRequests.justification,
                status: equipmentRequests.status,
                createdAt: equipmentRequests.createdAt,
                updatedAt: equipmentRequests.updatedAt,
                userName: sql<string>`coalesce(${employees.firstName} || ' ' || ${employees.surname}, ${users.email})`,
                categoryName: assetCategories.name,
            })
            .from(equipmentRequests)
            .leftJoin(users, eq(equipmentRequests.userId, users.id))
            .leftJoin(employees, eq(users.id, employees.userId))
            .leftJoin(assetCategories, eq(equipmentRequests.categoryId, assetCategories.id))
            .where(eq(equipmentRequests.id, id))
            .limit(1);

        return result;
    }
}
