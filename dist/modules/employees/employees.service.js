"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeesService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../../db/schema");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zepto_1 = require("../shared/zepto");
class EmployeesService {
    db;
    constructor(db) {
        this.db = db;
    }
    generatePassword(length = 12) {
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
        let password = "";
        for (let i = 0, n = charset.length; i < length; ++i) {
            password += charset.charAt(Math.floor(Math.random() * n));
        }
        return password;
    }
    async getAllEmployees() {
        const allEmployees = await this.db.query.employees.findMany();
        const formatted = allEmployees.map(emp => {
            // Map DB enum status to Frontend status
            let mappedStatus = 'Active';
            if (emp.status === 'ACTIVE')
                mappedStatus = 'Active';
            else if (emp.status === 'REMOTE')
                mappedStatus = 'Remote';
            else if (emp.status === 'ON_LEAVE')
                mappedStatus = 'On Leave';
            else if (emp.status === 'TERMINATED')
                mappedStatus = 'Terminated';
            return {
                id: emp.id,
                userId: emp.userId,
                name: `${emp.firstName} ${emp.surname}`,
                role: emp.roleId,
                department: emp.departmentId,
                location: emp.location,
                status: mappedStatus,
                avatar: `https://ui-avatars.com/api/?name=${emp.firstName}+${emp.surname}&background=random`
            };
        });
        const owners = await this.db.query.userRoles.findMany({
            where: (0, drizzle_orm_1.eq)(schema_1.userRoles.role, 'OWNER'),
            with: { user: true }
        });
        const ownerFormatted = owners.map(owner => ({
            id: owner.userId,
            userId: owner.userId,
            name: owner.user?.email || 'System Owner',
            role: 'OWNER',
            department: 'Administration',
            location: 'System',
            status: 'Active',
            avatar: `https://ui-avatars.com/api/?name=${owner.user?.email || 'Owner'}&background=random`
        }));
        // Use a Set or Map to Ensure uniqueness by ID (in case owner created an employee profile)
        const allCombined = [...ownerFormatted, ...formatted];
        const unique = Array.from(new Map(allCombined.map(item => [item.id, item])).values());
        return unique;
    }
    async createEmployee(data) {
        // 1. Generate random password
        const plainTextPassword = this.generatePassword();
        // 2. Hash Password
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(plainTextPassword, salt);
        // 3. Database Transaction
        const newEmployee = await this.db.transaction(async (tx) => {
            // Check if email is already taken
            const existingUser = await tx.query.users.findFirst({
                where: (0, drizzle_orm_1.eq)(schema_1.users.email, data.workEmail),
            });
            if (existingUser) {
                throw new Error("User with this email already exists");
            }
            // Create User Account
            const [newUser] = await tx.insert(schema_1.users).values({
                email: data.workEmail,
                passwordHash: passwordHash
            }).returning();
            // Assign Default Role
            await tx.insert(schema_1.userRoles).values({
                userId: newUser.id,
                app: 'HRIS',
                role: 'EMPLOYEE' // Default role, could be derived from requestedRole eventually
            });
            // Create Employee Record
            const [createdEmployee] = await tx.insert(schema_1.employees).values({
                userId: newUser.id,
                firstName: data.firstName,
                surname: data.surname,
                middleName: data.middleName || null,
                workEmail: data.workEmail,
                personalEmail: data.personalEmail || null,
                phoneNumber: data.phoneNumber || null,
                departmentId: data.departmentId,
                roleId: data.roleId,
                location: data.location,
                hiringManagerId: data.hiringManagerId ? data.hiringManagerId : 'UNASSIGNED',
                status: data.status,
            }).returning();
            // Increment department staffCount
            if (data.departmentId) {
                await tx.update(schema_1.departments)
                    .set({ staffCount: (0, drizzle_orm_1.sql) `${schema_1.departments.staffCount} + 1` })
                    .where((0, drizzle_orm_1.eq)(schema_1.departments.id, data.departmentId));
            }
            return createdEmployee;
        });
        // 4. Send Welcome Email with Password
        const loginUrl = "http://localhost:3002"; // Adjust as needed per environment
        const emailHtml = `
            <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
                <div style="background-color: #0d121f; padding: 30px; text-align: center; color: white;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Welcome to HRIS Pro</h1>
                </div>
                <div style="padding: 40px 30px;">
                    <h2 style="margin-top: 0; font-size: 20px; font-weight: 700; color: #111;">Hi ${data.firstName},</h2>
                    <p style="color: #666; font-size: 16px;">Your employee account has been successfully created. You can now access your dashboard and manage your profile using the credentials below.</p>
                    
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 25px; border-radius: 10px; margin: 30px 0;">
                        <p style="margin-top: 0; font-size: 14px; color: #64748b; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Access Details</p>
                        <p style="margin: 10px 0; font-size: 15px;"><strong>Email:</strong> ${data.workEmail}</p>
                        <p style="margin: 10px 0; font-size: 15px;"><strong>Temp Password:</strong> <code style="background: #fff; border: 1px solid #e2e8f0; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-weight: bold; color: #0f172a;">${plainTextPassword}</code></p>
                    </div>

                    <div style="text-align: center; margin: 40px 0;">
                        <a href="${loginUrl}" style="background-color: #2563eb; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Portal Login</a>
                    </div>
                    
                    <p style="font-size: 13px; color: #94a3b8; text-align: center; margin-top: 40px;">
                        If the button above doesn't work, copy and paste this link into your browser:<br>
                        <a href="${loginUrl}" style="color: #2563eb;">${loginUrl}</a>
                    </p>
                </div>
                <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                    &copy; ${new Date().getFullYear()} Nolt Finance HRIS. All rights reserved.
                </div>
            </div>
        `;
        try {
            await (0, zepto_1.sendEmail)(data.workEmail, "Welcome to HRIS Pro - Login Credentials", emailHtml);
            console.log(`Welcome email sent successfully to ${data.workEmail}`);
        }
        catch (err) {
            console.error(`Failed to send welcome email to ${data.workEmail}:`, err);
            // Non-blocking error. Ideally, we flag this in the DB to retry later.
        }
        return newEmployee;
    }
    async getEmployeeRoles(employeeId) {
        const employee = await this.db.query.employees.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.employees.id, employeeId),
            columns: { userId: true }
        });
        if (!employee || !employee.userId) {
            throw new Error('User not found for this employee');
        }
        const roles = await this.db.query.userRoles.findMany({
            where: (0, drizzle_orm_1.eq)(schema_1.userRoles.userId, employee.userId)
        });
        return roles;
    }
    async assignEmployeeRole(employeeId, appName, roleName) {
        const employee = await this.db.query.employees.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.employees.id, employeeId),
            columns: { userId: true }
        });
        if (!employee || !employee.userId) {
            throw new Error('User not found for this employee');
        }
        // Check if role for this app already exists for user
        const existingRoles = await this.db.query.userRoles.findMany({
            where: (0, drizzle_orm_1.eq)(schema_1.userRoles.userId, employee.userId)
        });
        const existingRole = existingRoles.find(r => r.app === appName);
        if (existingRole) {
            // Update existing
            const [updated] = await this.db.update(schema_1.userRoles)
                .set({ role: roleName })
                .where((0, drizzle_orm_1.eq)(schema_1.userRoles.id, existingRole.id))
                .returning();
            return updated;
        }
        else {
            // Insert new
            const [inserted] = await this.db.insert(schema_1.userRoles).values({
                userId: employee.userId,
                app: appName, // Type cast or ensure schema enum matches
                role: roleName
            }).returning();
            return inserted;
        }
    }
}
exports.EmployeesService = EmployeesService;
