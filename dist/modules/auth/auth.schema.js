"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyOtpSchema = exports.loginSchema = void 0;
const zod_1 = __importDefault(require("zod"));
exports.loginSchema = zod_1.default.object({
    email: zod_1.default.string().email(),
    password: zod_1.default.string().min(1),
    app: zod_1.default.string().optional(),
});
exports.verifyOtpSchema = zod_1.default.object({
    email: zod_1.default.string().email(),
    otp: zod_1.default.string().length(6),
    app: zod_1.default.string().optional(),
});
