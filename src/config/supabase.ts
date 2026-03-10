import { createClient } from '@supabase/supabase-js';
import { env } from './env';

if (!env.SUPABASE_URL || !env.SUPABASE_KEY) {
    throw new Error('Missing Supabase URL or Key');
}

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
