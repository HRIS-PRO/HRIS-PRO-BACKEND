"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = __importDefault(require("zod"));
const dotenv_1 = __importDefault(require("dotenv"));
const dotenv_expand_1 = require("dotenv-expand");
const myEnv = dotenv_1.default.config();
(0, dotenv_expand_1.expand)(myEnv);
const schema = zod_1.default.object({
    NODE_ENV: zod_1.default.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.default.string().default('3000').transform(Number),
    DATABASE_URL: zod_1.default.string().url(),
    // Auth
    JWT_SECRET: zod_1.default.string().min(32), // enforce strong secret
    // ZeptoMail
    ZEPTO_FROM_EMAIL: zod_1.default.string().email(),
    ZEPTO_TOKEN: zod_1.default.string().min(1),
    ZEPTO_BULK_TOKEN: zod_1.default.string().min(1),
    // Supabase
    SUPABASE_URL: zod_1.default.string().url(),
    SUPABASE_KEY: zod_1.default.string().min(1),
    // Termii SMS
    TERMII_API_KEY: zod_1.default.string().min(1),
    TERMII_SECRET_KEY: zod_1.default.string().min(1).optional(),
    // Redis / BullMQ
    REDIS_URL: zod_1.default.string().url(),
});
const _env = schema.safeParse(process.env);
if (!_env.success) {
    console.error('❌ Invalid environment variables:', JSON.stringify(_env.error.format(), null, 4));
    process.exit(1);
}
exports.env = _env.data;
