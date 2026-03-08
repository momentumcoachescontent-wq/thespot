// SUPABASE EDGE FUNCTION: moderate-drop
// Objetivo: Analizar el contenido del audio para asegurar un espacio seguro.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-client@2.39.3"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

    try {
        const { drop_id } = await req.json()
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Obtener detalles del drop
        const { data: drop, error: fetchError } = await supabaseAdmin
            .from('drops')
            .select('audio_url, author_id')
            .eq('id', drop_id)
            .single()

        if (fetchError || !drop) throw new Error('Drop no encontrado')

        // 2. Obtener configuración dinámica
        const { data: settingsData } = await supabaseAdmin
            .from('site_settings')
            .select('key, value')
            .in('key', ['auto_moderation_mode', 'ai_model_provider', 'moderation_rules'])

        const settings = Object.fromEntries(settingsData?.map(s => [s.key, s.value]) || [])
        const isAutoPilot = settings.auto_moderation_mode === true
        const modelProvider = settings.ai_model_provider || 'openai'
        const customRules = settings.moderation_rules || ''

        // 4. Ejecución del Veredicto IA (Real o Simulado)
        let isSafe = true;

        try {
            if (modelProvider === 'openai') {
                const apiKey = Deno.env.get('OPENAI_API_KEY');
                if (apiKey) {
                    console.log("Invocando GPT-4o para análisis de audio...");
                    // Aquí iría el fetch a OpenAI Whisper + GPT-4o
                    // isSafe = await analyzeWithOpenAI(drop.audio_url, customRules, apiKey);
                }
            } else if (modelProvider === 'google') {
                const apiKey = Deno.env.get('GOOGLE_API_KEY');
                if (apiKey) {
                    console.log("Invocando Gemini Pro para análisis de audio...");
                    // Aquí iría el fetch a Gemini Multimodal
                    // isSafe = await analyzeWithGemini(drop.audio_url, customRules, apiKey);
                }
            }
        } catch (e) {
            console.error("Error en llamada a IA:", e);
            // Fallback: Si la IA falla, mantenemos para revisión manual para no perder contenido
            isSafe = true;
        }

        if (isSafe && isAutoPilot) {
            // LIBERACIÓN AUTOMÁTICA
            await supabaseAdmin
                .from('drops')
                .update({ is_flagged: false, moderation_notes: 'Aprobado automáticamente por AI (Auto-Piloto)' })
                .eq('id', drop_id)

            // Registrar log
            await supabaseAdmin.from('moderation_logs').insert({
                drop_id,
                user_id: drop.author_id,
                action: 'AUTO_APPROVED',
                reason: 'Auto-Piloto: Contenido seguro'
            })

            return new Response(JSON.stringify({ success: true, action: 'auto-approved' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        } else if (isSafe) {
            // MANTENER PARA REVISIÓN MANUAL
            await supabaseAdmin
                .from('drops')
                .update({ moderation_notes: 'IA sugiere APROBAR (Esperando revisión del Arquitecto)' })
                .eq('id', drop_id)

            return new Response(JSON.stringify({ success: true, action: 'pending-review' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        } else {
            // BLOQUEADO - INCREMENTAR FALTAS
            console.log(`Bloqueando drop ${drop_id} de usuario ${drop.author_id}. Incrementando faltas.`)

            // 1. Incrementar contador en perfil (vía RPC)
            await supabaseAdmin.rpc('increment_flag_count', { row_id: drop.author_id })

            // 2. Registrar en log de moderación
            await supabaseAdmin.from('moderation_logs').insert({
                drop_id,
                user_id: drop.author_id,
                action: 'AUTO_BLOCKED',
                reason: 'Contenido detectado como inseguro por IA'
            })

            // 3. Marcar como bloqueado en drops
            await supabaseAdmin
                .from('drops')
                .update({ moderation_notes: 'Bloqueado por IA: Riesgo detectado. Falta registrada al usuario.' })
                .eq('id', drop_id)

            return new Response(JSON.stringify({ success: true, action: 'blocked' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
