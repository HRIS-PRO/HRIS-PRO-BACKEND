import { FastifyInstance } from 'fastify';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { loginSchema, verifyOtpSchema } from './auth.schema';

export default async function authRoutes(app: FastifyInstance) {
    const authService = new AuthService(app.db);
    const authController = new AuthController(authService);

    app.post(
        '/login',
        {
            schema: {
                body: loginSchema,
            },
        },
        authController.login.bind(authController)
    );

    app.post(
        '/verify',
        {
            schema: {
                body: verifyOtpSchema,
            },
        },
        authController.verifyOtp.bind(authController)
    );
}
