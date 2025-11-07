import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Your CORS handling and secrets reading are correct.
const allowedOrigins = [
  'https://www.eco-lakbay.com',
  'https://eco-lakbay.com',
  'http://localhost:3000',
  'http://localhost:5173'
];

serve(async (req) => {
  const origin = req.headers.get('Origin') || '';
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- STEP 1: Read secrets directly ---
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY secrets.");
    }
    
    const { user_id_to_delete } = await req.json();
    if (!user_id_to_delete) {
      throw new Error("User ID to delete is required.");
    }

    // --- STEP 2: Manually call the Supabase Auth Admin API using fetch ---
    // This bypasses the createClient library entirely.
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user_id_to_delete}`, {
        method: 'DELETE',
        headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
        },
    });

    // --- STEP 3: Check the response from the API ---
    if (!response.ok) {
        const errorData = await response.json();
        // The error message from the API will be much more specific now.
        throw new Error(`Failed to delete user: ${errorData.msg || response.statusText}`);
    }

    return new Response(JSON.stringify({ message: "User deleted successfully." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error in hard-delete-user function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});