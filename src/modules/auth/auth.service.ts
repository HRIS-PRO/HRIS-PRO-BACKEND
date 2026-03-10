import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { users } from '../../db/schema';
import { sendEmail } from '../shared/zepto';
import crypto from 'crypto';
import { db } from '../../db';
import bcrypt from 'bcryptjs';

type DrizzleClient = typeof db;

export class AuthService {
    constructor(private db: DrizzleClient) { }

    async requestLoginOtp(email: string, password: string) {
        // Find user by email
        const user = await this.db.query.users.findFirst({
            where: eq(users.email, email),
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

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            console.warn(`Invalid password for user: ${email}`);
            throw new Error('Invalid email or password');
        }

        // Generate 6-digit OTP
        const otp = crypto.randomInt(100000, 999999).toString();

        // Debug: Log OTP to console
        console.log(`🔑 OTP for ${email}: ${otp}`);

        // Hash OTP before storing
        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Update user with OTP
        await this.db.update(users)
            .set({
                otpHash,
                otpExpiresAt,
            })
            .where(eq(users.id, user.id));

        // Send Email
        await sendEmail(
            email,
            'Your HRIS Login OTP',
            `<p style="text-align: center;">Your login verification code is:</p>
             <div class="otp-code">${otp}</div>
             <p style="text-align: center;">This code expires in 10 minutes. If you did not request this, please ignore this email.</p>`
        );
    }

    async verifyLoginOtp(email: string, otp: string) {
        // Find user with roles
        const user = await this.db.query.users.findFirst({
            where: eq(users.email, email),
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

        const inputHash = crypto.createHash('sha256').update(otp).digest('hex');
        if (inputHash !== user.otpHash) {
            throw new Error('Invalid OTP');
        }

        // Clear OTP
        await this.db.update(users)
            .set({
                otpHash: null,
                otpExpiresAt: null,
            })
            .where(eq(users.id, user.id));

        return user;
    }

    async verifyDirectLogin(email: string, password: string) {
        // Find user by email
        const user = await this.db.query.users.findFirst({
            where: eq(users.email, email),
            with: {
                roles: true,
                employee: true,
            },
        });

        if (!user || !user.passwordHash) {
            throw new Error('Invalid email or password');
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
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
