import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// CORS: strip trailing slash from APP_URL to avoid origin mismatch.
// Never fall back to "*" — use the known production origin instead.
const appOrigin = (Deno.env.get("APP_URL") ?? "https://thespot.lovable.app").replace(/\/$/, "");
const corsHeaders = {
  "Access-Control-Allow-Origin": appOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  try {
    const { email, password: testerPassword } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "Email required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // CRIT-1 fix: Admin credentials live in Supabase Secrets (never in VITE_ env vars / JS bundle)
    const adminEmailsRaw = Deno.env.get("ADMIN_EMAILS") ?? "";
    const adminEmails = adminEmailsRaw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const adminPassword = Deno.env.get("ADMIN_PASSWORD") ?? "";

    const normalizedEmail = email.toLowerCase().trim();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_ANON_KEY") || ""
    );

    if (!adminEmails.includes(normalizedEmail)) {
      // Not an admin — check if it's a registered tester (password required)
      if (!testerPassword) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        });
      }
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL") || "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
      );
      const { data: tester } = await adminClient
        .from("test_accounts")
        .select("email")
        .eq("email", normalizedEmail)
        .maybeSingle();
      if (!tester) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        });
      }
      // Authenticate tester with their password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: testerPassword,
      });
      if (error || !data.session) {
        return new Response(JSON.stringify({ error: "Authentication failed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        });
      }
      return new Response(
        JSON.stringify({
          session: {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Admin login flow
    if (!adminPassword) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Authenticate via Supabase Auth server-side using stored secret password
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: adminPassword,
    });

    if (error || !data.session) {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    return new Response(
      JSON.stringify({
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
