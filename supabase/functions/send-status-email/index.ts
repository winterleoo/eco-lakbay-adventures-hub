import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// Get the API key from the environment secrets
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
// Your CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const { destinationId, status } = await req.json();
    if (!destinationId || !status) {
      throw new Error("Destination ID and new status are required.");
    }
    // Use an admin client to fetch data securely, bypassing RLS
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    // Fetch the destination details and the owner's email
    const { data: destination, error: destError } = await supabaseAdmin.from('destinations').select(`
        business_name,
        owner_id,
        profiles ( email, full_name )
      `).eq('id', destinationId).single();
    if (destError || !destination) {
      throw new Error(`Could not find destination or owner info: ${destError?.message}`);
    }
    const ownerEmail = destination.profiles?.email;
    const ownerName = destination.profiles?.full_name || 'Partner';
    const destinationName = destination.business_name;
    if (!ownerEmail) {
      throw new Error("Destination owner does not have an email address.");
    }
    let subject = '';
    let htmlBody = '';
    // --- Customize Email Content Based on Status ---
    switch(status){
      case 'approved':
        subject = `Congratulations! Your destination "${destinationName}" is now live on EcoLakbay!`;
        htmlBody = `<p>Hi ${ownerName},</p>
                        <p>Great news! Your destination, <strong>${destinationName}</strong>, has been reviewed and approved. It is now visible to all travelers on the EcoLakbay platform.</p>
                        <p>Thank you for joining our community of sustainable tourism partners!</p>
                        <p>Best regards,<br>The EcoLakbay Team</p>`;
        break;
      case 'rejected':
        subject = `Update on your EcoLakbay destination submission: "${destinationName}"`;
        htmlBody = `<p>Hi ${ownerName},</p>
                        <p>Thank you for your submission. After careful review, your destination, <strong>${destinationName}</strong>, did not meet our current sustainability criteria. Our team will contact you shortly with feedback on how you can improve your application for future consideration.</p>
                        <p>We appreciate your interest in promoting sustainable tourism.</p>
                        <p>Sincerely,<br>The EcoLakbay Team</p>`;
        break;
      default:
        // We don't send emails for 'pending' or 'archived', but you could add them here.
        return new Response(JSON.stringify({
          message: "No email sent for this status."
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
    }
    // --- Call the Resend API to send the email ---
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'EcoLakbay <no-reply@yourverifieddomain.com>',
        to: [
          ownerEmail
        ],
        subject: subject,
        html: htmlBody
      })
    });
    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      throw new Error(`Resend API Error: ${JSON.stringify(errorData)}`);
    }
    return new Response(JSON.stringify({
      message: `Email sent successfully to ${ownerEmail}`
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error("Error in send-status-email function:", error.message);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
