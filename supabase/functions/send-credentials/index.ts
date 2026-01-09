import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getCorsHeaders } from '../_shared/cors.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface SendCredentialsRequest {
  email: string;
  full_name: string;
  password: string;
  phone?: string;
  method: 'email' | 'whatsapp';
  company_name?: string;
  login_url?: string;
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, full_name, password, phone, method, company_name, login_url }: SendCredentialsRequest = await req.json();

    if (!email || !full_name || !password) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, full_name, or password" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (method === 'email') {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #18181b; font-size: 24px; margin: 0;">Welcome to ${company_name || 'HRMS'}!</h1>
              </div>
              
              <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                Hello <strong>${full_name}</strong>,
              </p>
              
              <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                Your account has been created. Here are your login credentials:
              </p>
              
              <div style="background-color: #f4f4f5; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                <table style="width: 100%;">
                  <tr>
                    <td style="color: #71717a; font-size: 14px; padding: 8px 0;">Email (User ID):</td>
                    <td style="color: #18181b; font-size: 14px; font-weight: 600; padding: 8px 0;">${email}</td>
                  </tr>
                  <tr>
                    <td style="color: #71717a; font-size: 14px; padding: 8px 0;">Password:</td>
                    <td style="color: #18181b; font-size: 14px; font-weight: 600; padding: 8px 0;">${password}</td>
                  </tr>
                </table>
              </div>
              
              ${login_url ? `
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${login_url}" style="display: inline-block; background-color: #18181b; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">Login to Your Account</a>
              </div>
              ` : ''}
              
              <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                <strong>Important:</strong> Please change your password after your first login for security.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;">
              
              <p style="color: #a1a1aa; font-size: 12px; text-align: center;">
                This is an automated message from ${company_name || 'HRMS'}. Please do not reply to this email.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "HRMS <onboarding@resend.dev>",
          to: [email],
          subject: "Your HRMS Account Credentials",
          html: emailHtml,
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Failed to send email: ${error}`);
      }

      const data = await res.json();
      console.log("Email sent successfully:", data);

      return new Response(
        JSON.stringify({ success: true, message: "Credentials sent via email" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } 
    
    if (method === 'whatsapp') {
      if (!phone) {
        return new Response(
          JSON.stringify({ error: "Phone number is required for WhatsApp" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const message = `Hello ${full_name},

Welcome to ${company_name || 'HRMS'}!

Your login credentials are:
📧 Email: ${email}
🔐 Password: ${password}

${login_url ? `Login here: ${login_url}` : ''}

Please change your password after your first login.`;

      const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

      return new Response(
        JSON.stringify({ success: true, whatsappUrl, message: "WhatsApp link generated" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid method. Use 'email' or 'whatsapp'" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-credentials function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
