const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    console.error("Warning: Supabase credentials are not fully configured in your .env file.");
}

// Admin client — uses service role key, bypasses RLS
// Use this for ALL backend database operations (select, insert, update, delete)
const supabaseAdmin = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseServiceRoleKey || 'placeholder',
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

// Public client — uses anon key, respects RLS
// Use this ONLY for verifying user tokens (supabase.auth.getUser)
const supabasePublic = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder'
);

module.exports = { supabaseAdmin, supabasePublic };
