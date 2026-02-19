import z from 'zod';
import dotenv from 'dotenv';
import { expand } from 'dotenv-expand';

const myEnv = dotenv.config();
expand(myEnv);

const schema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('3000').transform(Number),
    DATABASE_URL: z.string().url(),

    // Auth
    JWT_SECRET: z.string().min(32), // enforce strong secret

    // ZeptoMail
    ZEPTO_FROM_EMAIL: z.string().email(),
    ZEPTO_TOKEN: z.string().min(1)
});

const _env = schema.safeParse(process.env);

if (!_env.success) {
    console.error('❌ Invalid environment variables:', JSON.stringify(_env.error.format(), null, 4));
    process.exit(1);
}

export const env = _env.data;
