// Edge Function: create-checkout
// Creates a Stripe Checkout Session for Spot+ subscription.
// Price IDs can be set via Supabase secrets (STRIPE_PRICE_ID / STRIPE_PRICE_ID_YEARLY)
// or configured from the Admin Panel → Stripe tab (stored in site_settings).

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Decode JWT payload without network call.
// Supabase edge runtime already validates the JWT signature before the function runs,
// so we can safely trust the payload content.
function decodeJwt(token: string): Record<string, any> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Auth: extract user from JWT — avoids the auth.getUser() network call
    // that fails for users created via Management API with empty providers.
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing authorization header");

    const token = authHeader.replace("Bearer ", "");
    const jwtPayload = decodeJwt(token);
    const userId = jwtPayload?.sub;
    const userEmail = jwtPayload?.email;

    if (!userId) throw new Error("Unauthorized");

    // Check token expiry
    if (jwtPayload?.exp && jwtPayload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error("Token expired — please sign in again");
    }

    const { plan = "monthly", success_url, cancel_url } = await req.json();

    // Admin client — used for profile read/write and site_settings fallback
    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Determine price ID: env vars take precedence, then site_settings fallback
    let priceId: string | undefined = plan === "yearly"
      ? Deno.env.get("STRIPE_PRICE_ID_YEARLY") || Deno.env.get("STRIPE_PRICE_ID")
      : Deno.env.get("STRIPE_PRICE_ID");

    if (!priceId) {
      const settingKey = plan === "yearly" ? "stripe_price_id_yearly" : "stripe_price_id_monthly";
      const { data: settingRow } = await adminSupabase
        .from("site_settings")
        .select("value")
        .eq("key", settingKey)
        .single();
      const val = settingRow?.value;
      if (typeof val === "string" && val.startsWith("price_")) priceId = val;
    }

    if (!priceId) {
      throw new Error(
        "STRIPE_PRICE_ID not configured. Add it in Supabase secrets or in Admin Panel → Stripe → Configuración de Precios."
      );
    }

    // Auto-resolve Product ID → Price ID if admin accidentally saved a prod_ ID
    if (priceId.startsWith("prod_")) {
      const product = await stripe.products.retrieve(priceId);
      const defaultPrice = (product as any).default_price;
      if (!defaultPrice) {
        throw new Error(
          `El producto de Stripe (${priceId}) no tiene un precio predeterminado. Configura un precio predeterminado en Stripe Dashboard o usa directamente el Price ID (price_...) en Admin Panel → Stripe.`
        );
      }
      priceId = typeof defaultPrice === "string" ? defaultPrice : (defaultPrice as any).id;
    }

    // Fetch or create Stripe customer
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("stripe_customer_id, full_name")
      .eq("id", userId)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail || "",
        name: profile?.full_name || userEmail || userId,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;

      await adminSupabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);
    }

    const appUrl = Deno.env.get("APP_URL") || "https://thespot.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: success_url || `${appUrl}/premium?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${appUrl}/premium?canceled=true`,
      subscription_data: {
        metadata: { supabase_user_id: userId },
      },
      metadata: { supabase_user_id: userId },
      allow_promotion_codes: true,
    });

    return new Response(
      JSON.stringify({ url: session.url, session_id: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: any) {
    console.error("create-checkout error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
