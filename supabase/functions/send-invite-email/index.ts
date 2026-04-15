import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, type, sender_name } = await req.json();

    let subject = "";
    let html = "";

    if (type === "nutri") {
      subject = "Você foi convidado para o NutriTrack!";
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h1 style="color: #4f46e5; text-align: center;">Bem-vindo ao NutriTrack!</h1>
          <p>Olá,</p>
          <p>O administrador da plataforma liberou o seu acesso como <strong>Nutricionista</strong>.</p>
          <p>Para completar o seu cadastro e começar a atender seus pacientes, acesse o link abaixo:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://orgulhodonutri.vercel.app/auth" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Completar Cadastro</a>
          </div>
          <hr style="border: 0; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #666; text-align: center;">NutriTrack - Acompanhamento Nutricional Profissional</p>
        </div>
      `;
    } else if (type === "patient") {
      subject = `Convite de acompanhamento nutricional - ${sender_name}`;
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h1 style="color: #4f46e5; text-align: center;">Olá!</h1>
          <p>O nutricionista <strong>${sender_name}</strong> convidou você para realizar o acompanhamento nutricional no NutriTrack.</p>
          <p>Acesse a plataforma para aceitar o convite e começar sua jornada saudável:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://orgulhodonutri.vercel.app/auth" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Acessar NutriTrack</a>
          </div>
          <hr style="border: 0; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #666; text-align: center;">NutriTrack - Seu diário de saúde e nutrição</p>
        </div>
      `;
    }

    const { data, error } = await resend.emails.send({
      from: "NutriTrack <onboarding@resend.dev>",
      to: [email],
      subject: subject,
      html: html,
    });

    if (error) {
      console.error("Resend Error:", error);
      return new Response(JSON.stringify({ error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Internal Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
