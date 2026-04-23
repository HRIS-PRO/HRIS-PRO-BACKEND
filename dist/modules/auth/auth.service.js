"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../../db/schema");
const zepto_1 = require("../shared/zepto");
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
class AuthService {
    db;
    constructor(db) {
        this.db = db;
    }
    async requestLoginOtp(email, password, app) {
        // Find user by email
        const user = await this.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)((0, drizzle_orm_1.sql) `lower(${schema_1.users.email})`, email.toLowerCase()),
            with: {
                roles: true
            }
        });
        if (!user) {
            // Security: Use same error message as password failure to prevent enumeration in UI message,
            // though we console.warn for internal logs.
            console.warn(`Login attempt for non-existent user: ${email}`);
            throw new Error('Invalid email or password');
        }
        // Check app access if provided
        if (app) {
            const hasRole = user.roles.some(r => r.app === app);
            if (!hasRole) {
                console.warn(`User ${email} attempted unauthorized login to ${app}`);
                throw new Error(`You do not have permission to access ${app}. Please contact an administrator.`);
            }
        }
        // Verify Password
        if (!user.passwordHash) {
            console.warn(`User ${email} has no password set.`);
            throw new Error('Invalid email or password');
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            console.warn(`Invalid password for user: ${email}`);
            throw new Error('Invalid email or password');
        }
        // Generate 6-digit OTP
        const otp = crypto_1.default.randomInt(100000, 999999).toString();
        // Debug: Log OTP to console
        console.log(`🔑 OTP for ${email}: ${otp}`);
        // Hash OTP before storing
        const otpHash = crypto_1.default.createHash('sha256').update(otp).digest('hex');
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        // Update user with OTP
        await this.db.update(schema_1.users)
            .set({
            otpHash,
            otpExpiresAt,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, user.id));
        // Send Email
        await (0, zepto_1.sendEmail)(email, 'Your Login Verification Code', `
            <div style="font-family: 'Inter', Arial, sans-serif; max-width: 450px; margin: 0 auto; color: #333; line-height: 1.6; border: 1px solid #eee; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <div style="background-color: #0f172a; padding: 25px; text-align: center; color: white;">
                    <h2 style="margin: 0; font-size: 18px; font-weight: 700;">Security Verification</h2>
                </div>
                <div style="padding: 35px 30px; text-align: center;">
                    <p style="color: #64748b; font-size: 14px; margin-top: 0;">Use the code below to complete your login. It will expire in 10 minutes.</p>
                    
                    <div style="background-color: #f8fafc; border: 2px dashed #e2e8f0; padding: 20px; border-radius: 12px; margin: 25px 0;">
                        <span style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #0f172a; font-family: monospace;">${otp}</span>
                    </div>

                    <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">If you did not request this code, please ignore this email or contact support.</p>
                </div>
                <div style="background-color: #f8fafc; padding: 15px; text-align: center; font-size: 10px; color: #cbd5e1; border-top: 1px solid #f1f5f9;">
                    &copy; ${new Date().getFullYear()} Nolt Finance. Secure Authentication.
                </div>
            </div>
            `);
    }
    async verifyLoginOtp(email, otp, app) {
        // Find user with roles
        const user = await this.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)((0, drizzle_orm_1.sql) `lower(${schema_1.users.email})`, email.toLowerCase()),
            with: {
                roles: true,
                employee: true,
            },
        });
        if (!user || !user.otpHash || !user.otpExpiresAt) {
            throw new Error('Invalid OTP request');
        }
        if (user.otpExpiresAt < new Date()) {
            throw new Error('OTP expired');
        }
        const inputHash = crypto_1.default.createHash('sha256').update(otp).digest('hex');
        if (inputHash !== user.otpHash) {
            throw new Error('Invalid OTP');
        }
        // If an app is specified, check if the user has a role for it
        if (app) {
            const hasRole = user.roles.some(r => r.app === app);
            if (!hasRole) {
                throw new Error(`You do not have permission to access ${app}. Please contact an administrator.`);
            }
        }
        // Clear OTP
        await this.db.update(schema_1.users)
            .set({
            otpHash: null,
            otpExpiresAt: null,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, user.id));
        return user;
    }
    async verifyDirectLogin(email, password, app) {
        // Find user by email
        const user = await this.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)((0, drizzle_orm_1.sql) `lower(${schema_1.users.email})`, email.toLowerCase()),
            with: {
                roles: true,
                employee: true,
            },
        });
        if (!user || !user.passwordHash) {
            throw new Error('Invalid email or password');
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new Error('Invalid email or password');
        }
        // Enforce role check if app is specified
        if (app) {
            const hasRole = user.roles.some(r => r.app === app);
            if (!hasRole) {
                throw new Error(`You do not have permission to access ${app}. Please contact an administrator.`);
            }
        }
        return user;
    }
}
exports.AuthService = AuthService;
