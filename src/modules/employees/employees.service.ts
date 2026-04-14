import { eq, and, sql } from 'drizzle-orm';
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

        return formatted;
    }

    async createEmployee(data: CreateEmployeeInput) {
        // 1. Create User first
        const password = this.generatePassword();
        const passwordHash = await bcrypt.hash(password, 10);

        const [user] = await this.db.insert(users).values({
            email: data.workEmail,
            passwordHash,
        }).returning();

        // 2. Create Employee
        const [employee] = await this.db.insert(employees).values({
            userId: user.id,
            firstName: data.firstName,
            surname: data.surname,
            personalEmail: data.personalEmail || null,
            workEmail: data.workEmail,
            phoneNumber: data.phoneNumber || null,
            departmentId: data.departmentId,
            roleId: data.roleId,
            location: data.location,
            status: data.status as any,
            hiringManagerId: data.hiringManagerId || '',
        }).returning();

        // 3. Update Department Staff Count
        await this.db.update(departments)
            .set({ 
                staffCount: sql`${departments.staffCount} + 1` 
            })
            .where(eq(departments.id, data.departmentId));

        // 4. Send Welcom Email
        await sendEmail(
            data.workEmail,
            'Welcome to HRIS.Pro - Your Account Credentials',
            `
            <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
                <div style="background-color: #0f172a; padding: 40px 20px; text-align: center; color: white;">
                    <div style="display: inline-block; padding: 12px; background: rgba(255,255,255,0.1); border-radius: 12px; margin-bottom: 20px;">
                         <span style="font-size: 24px;">🏢</span>
                    </div>
                    <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Welcome to the Team!</h1>
                    <p style="margin: 10px 0 0; opacity: 0.7; font-size: 14px;">Your professional workspace is ready.</p>
                </div>
                
                <div style="padding: 40px 30px;">
                    <p style="font-size: 16px; font-weight: 500;">Hi ${data.firstName},</p>
                    <p style="color: #64748b; font-size: 15px;">Your official HRIS profile has been created. You can now access all integrated company tools (HRIS, AssetTrack, and MsgScale) using the credentials below.</p>
                    
                    <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; padding: 25px; margin: 30px 0;">
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; font-size: 11px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Workspace URL</label>
                            <a href="http://localhost:5173" style="font-size: 15px; color: #2563eb; font-weight: 700; text-decoration: none;">http://localhost:5173</a>
                        </div>
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; font-size: 11px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Work Email</label>
                            <span style="font-size: 15px; color: #0f172a; font-weight: 700;">${data.workEmail}</span>
                        </div>
                        <div>
                            <label style="display: block; font-size: 11px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Temporary Password</label>
                            <code style="display: inline-block; background: #0f172a; color: #fbbf24; padding: 6px 12px; border-radius: 6px; font-family: monospace; font-size: 16px; font-weight: 700;">${password}</code>
                        </div>
                    </div>

                    <div style="background-color: #fefce8; border: 1px solid #fef9c3; border-radius: 8px; padding: 15px; margin-bottom: 30px;">
                        <p style="margin: 0; font-size: 13px; color: #854d0e; font-weight: 500;">⚠️ <strong>Security Notice:</strong> You will be prompted to change this temporary password upon your first successful login.</p>
                    </div>

                    <a href="http://localhost:5173" style="display: block; background-color: #2563eb; color: white; text-align: center; padding: 16px; border-radius: 12px; font-weight: 800; text-decoration: none; font-size: 14px; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);">LOGIN TO DASHBOARD</a>
                </div>

                <div style="background-color: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #f1f5f9;">
                    <p style="margin: 0; font-size: 12px; color: #94a3b8;">&copy; ${new Date().getFullYear()} Nolt Finance HR Operations. All rights reserved.</p>
                </div>
            </div>
            `
        );

        return employee;
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

        // Check if role already exists
        const existing = await this.db.query.userRoles.findFirst({
            where: and( 
                eq(userRoles.userId, employee.userId),
                eq(userRoles.app, appName as any)
            )
        });

        if (existing) {
            // Update
            const [updated] = await this.db.update(userRoles).set({
                role: roleName
            }).where(eq(userRoles.id, existing.id)).returning();
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

    async revokeEmployeeRole(employeeId: string, appName: string) {
        const employee = await this.db.query.employees.findFirst({
            where: eq(employees.id, employeeId),
            columns: { userId: true }
        });

        if (!employee || !employee.userId) {
            throw new Error('User not found for this employee');
        }

        await this.db.delete(userRoles)
            .where(
                and(
                    eq(userRoles.userId, employee.userId),
                    eq(userRoles.app, appName as any)
                )
            );
            
        return { success: true, message: `Access revoked for ${appName}` };
    }
}
