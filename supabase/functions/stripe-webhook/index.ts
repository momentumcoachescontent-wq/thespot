// Edge Function: stripe-webhook
// Handles Stripe webhook events to sync subscription state into Supabase.
// Required secret in Supabase: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeKey || !webhookSecret) {
    return new Response(JSON.stringify({ error: "Stripe not configured" }), { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

  const adminSupabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig!, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
  }

  console.log("Stripe event received:", event.type);

  // Helper: resolve supabase user_id from stripe customer
  const getUserIdFromCustomer = async (customerId: string): Promise<string | null> => {
    const { data } = await adminSupabase
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();
    return data?.id ?? null;
  };

  // Helper: log transaction
  const logTransaction = async (params: {
    user_id: string | null;
    stripe_event_id: string;
    event_type: string;
    amount?: number;
    currency?: string;
    status?: string;
    stripe_customer?: string;
    stripe_sub_id?: string;
    metadata?: Record<string, unknown>;
  }) => {
    await adminSupabase.from("stripe_transactions").upsert(
      {
        user_id: params.user_id,
        stripe_event_id: params.stripe_event_id,
        event_type: params.event_type,
        amount: params.amount,
        currency: params.currency,
        status: params.status,
        stripe_customer: params.stripe_customer,
        stripe_sub_id: params.stripe_sub_id,
        metadata: params.metadata,
      },
      { onConflict: "stripe_event_id" }
    );
  };

  try {
    switch (event.type) {
      // ── Subscription created / resumed ────────────────────────────────────
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId =
          (sub.metadata?.supabase_user_id as string) ||
          (await getUserIdFromCustomer(sub.customer as string));

        const isActive = ["active", "trialing"].includes(sub.status);
        const expiresAt = new Date(sub.current_period_end * 1000).toISOString();

        if (userId) {
          await adminSupabase.from("profiles").update({
            is_premium: isActive,
            subscription_status: sub.status as string,
            subscription_expires_at: expiresAt,
            stripe_customer_id: sub.customer as string,
          }).eq("id", userId);
        }

        await logTransaction({
          user_id: userId,
          stripe_event_id: event.id,
          event_type: event.type,
          status: sub.status,
          stripe_customer: sub.customer as string,
          stripe_sub_id: sub.id,
          metadata: { period_end: expiresAt },
        });
        break;
      }

      // ── Subscription deleted / cancelled ──────────────────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId =
          (sub.metadata?.supabase_user_id as string) ||
          (await getUserIdFromCustomer(sub.customer as string));

        if (userId) {
          // Only revoke if not granted by admin
          const { data: profile } = await adminSupabase
            .from("profiles")
            .select("premium_granted_by_admin, role")
            .eq("id", userId)
            .single();

          if (!profile?.premium_granted_by_admin && profile?.role !== "admin") {
            await adminSupabase.from("profiles").update({
              is_premium: false,
              subscription_status: "canceled",
              subscription_expires_at: null,
            }).eq("id", userId);
          }
        }

        await logTransaction({
          user_id: userId,
          stripe_event_id: event.id,
          event_type: event.type,
          status: "canceled",
          stripe_customer: sub.customer as string,
          stripe_sub_id: sub.id,
        });
        break;
      }

      // ── Payment succeeded ─────────────────────────────────────────────────
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const userId = await getUserIdFromCustomer(invoice.customer as string);

        await logTransaction({
          user_id: userId,
          stripe_event_id: event.id,
          event_type: event.type,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: "succeeded",
          stripe_customer: invoice.customer as string,
          stripe_sub_id: (invoice as any).subscription as string,
          metadata: { invoice_id: invoice.id, invoice_url: invoice.hosted_invoice_url },
        });
        break;
      }

      // ── Payment failed ────────────────────────────────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const userId = await getUserIdFromCustomer(invoice.customer as string);

        if (userId) {
          await adminSupabase.from("profiles").update({
            subscription_status: "past_due",
          }).eq("id", userId);
        }

        await logTransaction({
          user_id: userId,
          stripe_event_id: event.id,
          event_type: event.type,
          amount: invoice.amount_due,
          currency: invoice.currency,
          status: "failed",
          stripe_customer: invoice.customer as string,
          stripe_sub_id: (invoice as any).subscription as string,
        });
        break;
      }

      // ── Checkout session completed (one-time confirmation) ─────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.CheckoutSession;
        const userId =
          (session.metadata?.supabase_user_id as string) ||
          (await getUserIdFromCustomer(session.customer as string));

        await logTransaction({
          user_id: userId,
          stripe_event_id: event.id,
          event_type: event.type,
          amount: session.amount_total ?? undefined,
          currency: session.currency ?? undefined,
          status: session.payment_status,
          stripe_customer: session.customer as string,
          stripe_sub_id: session.subscription as string,
          metadata: { session_id: session.id },
        });
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }
  } catch (err: any) {
    console.error("Webhook handler error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
