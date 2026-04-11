import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { invite_code, user_id } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate invite code
    const { data: codeData, error: codeError } = await supabaseAdmin
      .from("invite_codes")
      .select("*")
      .eq("code", invite_code)
      .eq("is_used", false)
      .single();

    if (codeError || !codeData) {
      return new Response(
        JSON.stringify({ error: "Código inválido ou já usado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update role to admin
    await supabaseAdmin
      .from("user_roles")
      .update({ role: "admin" })
      .eq("user_id", user_id);

    // Mark code as used
    await supabaseAdmin
      .from("invite_codes")
      .update({ is_used: true, used_by: user_id, used_at: new Date().toISOString() })
      .eq("id", codeData.id);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
