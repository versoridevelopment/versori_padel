// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// El '!' al final le dice a TypeScript que estamos seguros de que estas variables existen.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);