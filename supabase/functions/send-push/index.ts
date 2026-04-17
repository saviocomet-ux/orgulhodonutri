import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userId, title, body, data } = await req.json();

    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", userId);

    if (subError) throw subError;

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: "No subscriptions found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vapidDetails = {
      publicKey: Deno.env.get("VAPID_PUBLIC_KEY") ?? "",
      privateKey: Deno.env.get("VAPID_PRIVATE_KEY") ?? "",
      subject: "mailto:admin@nutritrack.com",
    };

    const payload = JSON.stringify({
      notification: {
        title: title || "NutriTrack",
        body: body || "Você tem uma nova mensagem",
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        data: data || {},
      },
    });

    const results = await Promise.all(
      subscriptions.map(async (sub: any) => {
        try {
          return await webpush.sendNotification(sub.subscription, payload, vapidDetails);
        } catch (err) {
          console.error("Error sending push to subscription:", err);
          // If 410 (Gone) or 404 (Not Found), delete the subscription
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .match({ subscription: sub.subscription });
          }
          return null;
        }
      })
    );

    return new Response(JSON.stringify({ success: true, count: results.filter(Boolean).length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
