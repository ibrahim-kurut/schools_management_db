const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || (process.env.NODE_ENV === 'test' ? 'http://mock.url' : null);
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || (process.env.NODE_ENV === 'test' ? 'mock-key' : null);

if (!supabaseUrl || !supabaseServiceRoleKey) {
    if (process.env.NODE_ENV !== 'test') {
        throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables');
    }
}

// Create client with Service Role Key to bypass RLS in the backend
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

module.exports = supabase;

