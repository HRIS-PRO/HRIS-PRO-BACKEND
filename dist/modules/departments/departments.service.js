"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepartmentsService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../../db/schema");
class DepartmentsService {
    db;
    constructor(db) {
        this.db = db;
    }
    async getAllDepartments() {
        return await this.db.query.departments.findMany({
            with: {
                parent: true,
            },
        });
    }
    async getEligibleHeads() {
        // 1. Get IDs of all current department heads
        const allDepts = await this.db.query.departments.findMany({
            columns: { headId: true },
        });
        const headIds = allDepts
            .map(d => d.headId)
            .filter((id) => id !== null && id !== '');
        // 2. Find employees who are NOT in the headIds list
        let eligibleQuery = this.db.select().from(schema_1.employees);
        if (headIds.length > 0) {
            eligibleQuery = eligibleQuery.where((0, drizzle_orm_1.notInArray)(schema_1.employees.id, headIds));
        }
        const eligibleEmployees = await eligibleQuery;
        // 3. If no eligible employees, fetch the OWNER user as a fallback
        if (eligibleEmployees.length === 0) {
            const owners = await this.db.query.userRoles.findMany({
                where: (0, drizzle_orm_1.eq)(schema_1.userRoles.role, 'OWNER'),
                with: { user: true }
            });
            if (owners.length > 0) {
                // Format it similarly to an employee for the frontend dropdown
                // Note: In a real robust system, the OWNER might also have an Employee record. 
                // For this implementation, we return a shape the UI can use.
                return [{
                        id: owners[0].userId, // Using userId as a fallback ID
                        name: owners[0].user?.email || 'System Owner',
                        role: 'OWNER',
                        department: 'Administration',
                        avatar: `https://ui-avatars.com/api/?name=${owners[0].user?.email || 'Owner'}&background=random`
                    }];
            }
        }
        // Format employees for the UI
        return eligibleEmployees.map(emp => ({
            id: emp.id,
            name: `${emp.firstName} ${emp.surname}`,
            role: emp.roleId,
            department: emp.departmentId,
            avatar: `https://ui-avatars.com/api/?name=${emp.firstName}+${emp.surname}&background=random`
        }));
    }
    async createDepartment(data, rootUserId) {
        let finalHeadId = data.headId;
        let finalHeadName = null;
        // Resolve headName based on headId
        if (finalHeadId) {
            // First check if headId corresponds to an employee
            const emp = await this.db.query.employees.findFirst({
                where: (0, drizzle_orm_1.eq)(schema_1.employees.id, finalHeadId)
            });
            if (emp) {
                finalHeadName = `${emp.firstName} ${emp.surname}`;
            }
            else {
                // It might be the fallback OWNER userId
                const user = await this.db.query.users.findFirst({
                    where: (0, drizzle_orm_1.eq)(schema_1.users.id, finalHeadId)
                });
                if (user) {
                    finalHeadName = user.email; // Fallback to email for owner
                }
            }
        }
        else if (rootUserId) {
            // If no headId was provided from the frontend, but we have a logged in user (rootUserId)
            finalHeadId = rootUserId;
            const user = await this.db.query.users.findFirst({
                where: (0, drizzle_orm_1.eq)(schema_1.users.id, rootUserId)
            });
            finalHeadName = user?.email || 'System Owner';
        }
        const [newDept] = await this.db.insert(schema_1.departments).values({
            name: data.name,
            description: data.description,
            parentId: data.parentId || null,
            headId: finalHeadId,
            headName: finalHeadName || 'Unassigned',
            icon: data.icon,
            color: data.color,
            status: data.status,
        }).returning();
        return newDept;
    }
    async updateDepartment(id, data, rootUserId) {
        let finalHeadId = data.headId;
        let finalHeadName = undefined;
        // Resolve headName based on headId if it's being updated
        if (finalHeadId !== undefined) {
            if (finalHeadId) {
                const emp = await this.db.query.employees.findFirst({
                    where: (0, drizzle_orm_1.eq)(schema_1.employees.id, finalHeadId)
                });
                if (emp) {
                    finalHeadName = `${emp.firstName} ${emp.surname}`;
                }
                else {
                    const user = await this.db.query.users.findFirst({
                        where: (0, drizzle_orm_1.eq)(schema_1.users.id, finalHeadId)
                    });
                    if (user) {
                        finalHeadName = user.email;
                    }
                }
            }
            else if (finalHeadId === null) {
                // If they explicitly nullify it
                finalHeadName = 'Unassigned';
            }
        }
        const updateData = {
            ...data,
            updatedAt: new Date(),
        };
        if (finalHeadName !== undefined) {
            updateData.headName = finalHeadName;
        }
        const [updatedDept] = await this.db.update(schema_1.departments)
            .set(updateData)
            .where((0, drizzle_orm_1.eq)(schema_1.departments.id, id))
            .returning();
        return updatedDept;
    }
}
exports.DepartmentsService = DepartmentsService;
