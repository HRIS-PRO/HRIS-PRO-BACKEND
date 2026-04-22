"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
class AuthController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    async login(request, reply) {
        const { email, password, app } = request.body;
        try {
            await this.authService.requestLoginOtp(email, password, app);
            return reply.send({ message: 'If credentials are correct, OTP sent.' });
        }
        catch (error) {
            return reply.code(401).send({ message: error.message || 'Invalid email or password' });
        }
    }
    async verifyOtp(request, reply) {
        const { email, otp, app } = request.body;
        try {
            const user = await this.authService.verifyLoginOtp(email, otp, app);
            // Generate JWT
            const token = await reply.jwtSign({
                id: user.id,
                email: user.email,
                roles: user.roles, // Embed roles in token
            });
            return reply.send({ token, user });
        }
        catch (error) {
            return reply.code(401).send({ message: error.message || 'Authentication failed' });
        }
    }
    async directLogin(request, reply) {
        const { email, password, app } = request.body;
        try {
            const user = await this.authService.verifyDirectLogin(email, password, app);
            // Generate JWT
            const token = await reply.jwtSign({
                id: user.id,
                email: user.email,
                roles: user.roles, // Embed roles in token
            });
            return reply.send({ token, user });
        }
        catch (error) {
            return reply.code(401).send({ message: error.message || 'Authentication failed' });
        }
    }
}
exports.AuthController = AuthController;
