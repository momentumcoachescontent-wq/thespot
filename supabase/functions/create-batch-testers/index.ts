import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const appOrigin = (Deno.env.get("APP_URL") ?? "https://thespot.lovable.app").replace(/\/$/, "");
const corsHeaders = {
  "Access-Control-Allow-Origin": appOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin
    const userSupabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userSupabase.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { data: callerProfile } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (callerProfile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const { emails, password } = await req.json();
    if (!Array.isArray(emails) || emails.length === 0) {
      return new Response(JSON.stringify({ error: "emails array required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (!password || password.length < 6) {
      return new Response(JSON.stringify({ error: "password must be at least 6 characters" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const results: { email: string; status: "created" | "exists" | "error"; message?: string }[] = [];

    for (const email of emails) {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail.includes("@")) {
        results.push({ email: normalizedEmail, status: "error", message: "Email inválido" });
        continue;
      }

      try {
        // Create auth user (email_confirm: true bypasses OTP)
        const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
          email: normalizedEmail,
          password,
          email_confirm: true,
        });

        if (createError) {
          if (createError.message?.toLowerCase().includes("already registered") ||
              createError.message?.toLowerCase().includes("already exists")) {
            results.push({ email: normalizedEmail, status: "exists" });
          } else {
            results.push({ email: normalizedEmail, status: "error", message: createError.message });
          }
          continue;
        }

        const userId = newUser.user?.id;
        if (!userId) {
          results.push({ email: normalizedEmail, status: "error", message: "No se obtuvo user ID" });
          continue;
        }

        // Upsert profile as externo tester with onboarding completed
        await adminSupabase.from("profiles").upsert({
          id: userId,
          email: normalizedEmail,
          edu_email: normalizedEmail,
          university_domain: "externo",
          onboarding_completed: true,
          institution_name: "Tester",
          username: `tester_${normalizedEmail.split("@")[0].replace(/[^a-z0-9]/gi, "").toLowerCase()}`,
        }, { onConflict: "id" });

        // Record in test_accounts
        await adminSupabase.from("test_accounts").upsert({
          email: normalizedEmail,
          created_by: caller.id,
          notes: "Google Play tester",
        }, { onConflict: "email" });

        results.push({ email: normalizedEmail, status: "created" });
      } catch (err: any) {
        results.push({ email: normalizedEmail, status: "error", message: err.message });
      }
    }

    const created = results.filter((r) => r.status === "created").length;
    const existing = results.filter((r) => r.status === "exists").length;
    const errors = results.filter((r) => r.status === "error").length;

    return new Response(
      JSON.stringify({ summary: { created, existing, errors }, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
