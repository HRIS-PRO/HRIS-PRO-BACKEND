import { eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { users, employees, userRoles, departments } from '../../db/schema';
import { CreateEmployeeInput, AssignRoleInput } from './employees.schema';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { sendEmail } from '../shared/zepto';

type DrizzleClient = typeof db;

export class EmployeesService {
    constructor(private db: DrizzleClient) { }

    private generatePassword(length = 12): string {
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
            if (emp.status === 'ACTIVE') mappedStatus = 'Active';
            else if (emp.status === 'REMOTE') mappedStatus = 'Remote';
            else if (emp.status === 'ON_LEAVE') mappedStatus = 'On Leave';
            else if (emp.status === 'TERMINATED') mappedStatus = 'Terminated';

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
            where: eq(userRoles.role, 'OWNER'),
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

    async createEmployee(data: CreateEmployeeInput) {
        // 1. Generate random password
        const plainTextPassword = this.generatePassword();

        // 2. Hash Password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(plainTextPassword, salt);

        // 3. Database Transaction
        const newEmployee = await this.db.transaction(async (tx) => {
            // Check if email is already taken
            const existingUser = await tx.query.users.findFirst({
                where: eq(users.email, data.workEmail),
            });

            if (existingUser) {
                throw new Error("User with this email already exists");
            }

            // Create User Account
            const [newUser] = await tx.insert(users).values({
                email: data.workEmail,
                passwordHash: passwordHash
            }).returning();

            // Assign Default Role
            await tx.insert(userRoles).values({
                userId: newUser.id,
                app: 'HRIS',
                role: 'EMPLOYEE' // Default role, could be derived from requestedRole eventually
            });

            // Create Employee Record
            const [createdEmployee] = await tx.insert(employees).values({
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
                await tx.update(departments)
                    .set({ staffCount: sql`${departments.staffCount} + 1` })
                    .where(eq(departments.id, data.departmentId));
            }

            return createdEmployee;
        });

        // 4. Send Welcome Email with Password
        const loginUrl = "http://localhost:3002"; // Adjust as needed per environment
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2>Welcome to HRIS Pro, ${data.firstName}!</h2>
                <p>Your employee account has been successfully created.</p>
                <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
                    <p><strong>Email:</strong> ${data.workEmail}</p>
                    <p><strong>Temporary Password:</strong> <code style="background: #e0e0e0; padding: 2px 5px;">${plainTextPassword}</code></p>
                </div>
                <p>Please log in using these credentials to access the portal.</p>
            </div>
        `;

        try {
            await sendEmail(data.workEmail, "Welcome to HRIS Pro - Login Credentials", emailHtml);
            console.log(`Welcome email sent successfully to ${data.workEmail}`);
        } catch (err) {
            console.error(`Failed to send welcome email to ${data.workEmail}:`, err);
            // Non-blocking error. Ideally, we flag this in the DB to retry later.
        }

        return newEmployee;
    }

    async getEmployeeRoles(employeeId: string) {
        const employee = await this.db.query.employees.findFirst({
            where: eq(employees.id, employeeId),
            columns: { userId: true }
        });

        if (!employee || !employee.userId) {
            throw new Error('User not found for this employee');
        }

        const roles = await this.db.query.userRoles.findMany({
            where: eq(userRoles.userId, employee.userId)
        });

        return roles;
    }

    async assignEmployeeRole(employeeId: string, appName: string, roleName: string) {
        const employee = await this.db.query.employees.findFirst({
            where: eq(employees.id, employeeId),
            columns: { userId: true }
        });

        if (!employee || !employee.userId) {
            throw new Error('User not found for this employee');
        }

        // Check if role for this app already exists for user
        const existingRoles = await this.db.query.userRoles.findMany({
            where: eq(userRoles.userId, employee.userId)
        });

        const existingRole = existingRoles.find(r => r.app === appName);

        if (existingRole) {
            // Update existing
            const [updated] = await this.db.update(userRoles)
                .set({ role: roleName })
                .where(eq(userRoles.id, existingRole.id))
                .returning();
            return updated;
        } else {
            // Insert new
            const [inserted] = await this.db.insert(userRoles).values({
                userId: employee.userId,
                app: appName as any, // Type cast or ensure schema enum matches
                role: roleName
            }).returning();
            return inserted;
        }
    }
}
