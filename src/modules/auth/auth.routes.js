"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = authRoutes;
const auth_service_1 = require("./auth.service");
const auth_controller_1 = require("./auth.controller");
const auth_schema_1 = require("./auth.schema");
async function authRoutes(app) {
    const authService = new auth_service_1.AuthService(app.db);
    const authController = new auth_controller_1.AuthController(authService);
    app.post('/login', {
        schema: {
            body: auth_schema_1.loginSchema,
        },
    }, authController.login.bind(authController));
    app.post('/verify', {
        schema: {
            body: auth_schema_1.verifyOtpSchema,
        },
    }, authController.verifyOtp.bind(authController));
    app.post('/direct-login', {
        schema: {
            body: auth_schema_1.loginSchema,
        },
    }, authController.directLogin.bind(authController));
}
