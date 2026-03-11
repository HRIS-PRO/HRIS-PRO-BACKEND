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
    async requestLoginOtp(email, password) {
        // Find user by email
        const user = await this.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.users.email, email),
        });
        if (!user) {
            // Security: Use same error message as password failure to prevent enumeration in UI message,
            // though we console.warn for internal logs.
            console.warn(`Login attempt for non-existent user: ${email}`);
            throw new Error('Invalid email or password');
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
        await (0, zepto_1.sendEmail)(email, 'Your HRIS Login OTP', `<p style="text-align: center;">Your login verification code is:</p>
             <div class="otp-code">${otp}</div>
             <p style="text-align: center;">This code expires in 10 minutes. If you did not request this, please ignore this email.</p>`);
    }
    async verifyLoginOtp(email, otp) {
        // Find user with roles
        const user = await this.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.users.email, email),
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
        // Clear OTP
        await this.db.update(schema_1.users)
            .set({
            otpHash: null,
            otpExpiresAt: null,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, user.id));
        return user;
    }
    async verifyDirectLogin(email, password) {
        // Find user by email
        const user = await this.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.users.email, email),
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
        // Enforce MsgScale role check
        const msgScaleRole = user.roles.find(r => r.app === 'MSGSCALE_BULK');
        if (!msgScaleRole) {
            throw new Error('You do not have permission to access MsgScale Bulk Messaging. Please contact an administrator.');
        }
        return user;
    }
}
exports.AuthService = AuthService;
