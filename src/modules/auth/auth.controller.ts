import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { LoginInput, VerifyOtpInput } from './auth.schema';

export class AuthController {
    constructor(private authService: AuthService) { }

    async login(
        request: FastifyRequest<{ Body: LoginInput }>,
        reply: FastifyReply
    ) {
        const { email, password } = request.body;
        try {
            await this.authService.requestLoginOtp(email, password);
            return reply.send({ message: 'If credentials are correct, OTP sent.' });
        } catch (error: any) {
            return reply.code(401).send({ message: error.message || 'Invalid email or password' });
        }
    }

    async verifyOtp(
        request: FastifyRequest<{ Body: VerifyOtpInput }>,
        reply: FastifyReply
    ) {
        const { email, otp } = request.body;
        try {
            const user = await this.authService.verifyLoginOtp(email, otp);

            // Generate JWT
            const token = await reply.jwtSign({
                id: user.id,
                email: user.email,
                roles: user.roles, // Embed roles in token
            });

            return reply.send({ token, user });
        } catch (error: any) {
            return reply.code(401).send({ message: error.message || 'Authentication failed' });
        }
    }

    async directLogin(
        request: FastifyRequest<{ Body: LoginInput }>,
        reply: FastifyReply
    ) {
        const { email, password } = request.body;
        try {
            const user = await this.authService.verifyDirectLogin(email, password);

            // Generate JWT
            const token = await reply.jwtSign({
                id: user.id,
                email: user.email,
                roles: user.roles, // Embed roles in token
            });

            return reply.send({ token, user });
        } catch (error: any) {
            return reply.code(401).send({ message: error.message || 'Authentication failed' });
        }
    }
}
