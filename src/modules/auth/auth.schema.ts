import z from 'zod';

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

export const verifyOtpSchema = z.object({
    email: z.string().email(),
    otp: z.string().length(6), // Assuming 6-digit OTP
});

export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
