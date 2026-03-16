import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const appOrigin = Deno.env.get("APP_URL") ?? "*";
const corsHeaders = {
    'Access-Control-Allow-Origin': appOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    // Require admin authentication — this function accesses sensitive API key secrets
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401,
        });
    }
    const jwtPayload = decodeJwt(authHeader.replace("Bearer ", ""));
    const callerId = jwtPayload?.sub;
    if (!callerId || (jwtPayload?.exp && jwtPayload.exp < Math.floor(Date.now() / 1000))) {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401,
        });
    }

    // Admin-only: verify caller has admin role
    const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") || "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );
    const { data: callerProfile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", callerId)
        .single();
    if (callerProfile?.role !== "admin") {
        return new Response(JSON.stringify({ success: false, error: "Forbidden: admin role required" }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403,
        });
    }

    try {
        const { provider } = await req.json()

        if (provider.includes('openai') || provider.includes('gpt')) {
            const apiKey = Deno.env.get('OPENAI_API_KEY');
            if (!apiKey) throw new Error("API Key de OpenAI no configurada en Supabase.");

            const res = await fetch('https://api.openai.com/v1/models', {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });

            if (!res.ok) throw new Error(`Fallo autenticación OpenAI: ${res.statusText}`);

            return new Response(JSON.stringify({ success: true, message: "Conexión con OpenAI exitosa. Modelos accesibles." }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })

        } else if (provider.includes('google') || provider.includes('gemini')) {
            const apiKey = Deno.env.get('GOOGLE_API_KEY');
            if (!apiKey) throw new Error("API Key de Google (Gemini) no configurada en Supabase.");

            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

            if (!res.ok) throw new Error(`Fallo autenticación Gemini: ${res.statusText}`);

            return new Response(JSON.stringify({ success: true, message: "Conexión con Gemini exitosa. Modelos accesibles." }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        } else {
            throw new Error("Proveedor de IA desconocido.");
        }

    } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
