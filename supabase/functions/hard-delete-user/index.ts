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
    const { user_id_to_delete } = await req.json();
    if (!user_id_to_delete) {
      throw new Error("User ID to delete is required.");
    }
    
    // Create the admin client - this is now safe
    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Now, simply delete the user from the auth schema.
    // The TRIGGER we created will handle deleting from all other tables automatically.
    const { data, error } = await adminSupabase.auth.admin.deleteUser(user_id_to_delete);
    
    if (error) {
      throw error;
    }
    
    return new Response(JSON.stringify({ message: "User deleted successfully." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in hard-delete-user function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});