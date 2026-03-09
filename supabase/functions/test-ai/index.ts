import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
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
