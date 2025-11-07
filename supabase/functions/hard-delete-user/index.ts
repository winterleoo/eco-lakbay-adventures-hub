import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2/dist/module/index.js";

serve(async (req) => {
  // CORS logic for preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
    } });
  }

  try {
    const { user_id_to_delete } = await req.json();
    if (!user_id_to_delete) {
      throw new Error("User ID to delete is required.");
    }
    
    // Create a Supabase client with the SERVICE_ROLE_KEY to bypass RLS
    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Perform the deletion
    const { data, error } = await adminSupabase.auth.admin.deleteUser(user_id_to_delete);
    
    if (error) {
      throw error;
    }
    
    return new Response(JSON.stringify({ message: "User deleted successfully." }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})