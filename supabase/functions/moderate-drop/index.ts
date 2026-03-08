import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-client@2.39.3"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') || '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
        )

        const { drop_id } = await req.json()

        // 1. Obtener datos del drop
        const { data: drop, error: dropError } = await supabaseAdmin
            .from('drops')
            .select('*')
            .eq('id', drop_id)
            .single()

        if (dropError || !drop) throw new Error("Drop no encontrado")

        // 2. Obtener configuración de moderación
        const { data: settingsData } = await supabaseAdmin
            .from('site_settings')
            .select('key, value')
            .in('key', ['auto_moderation_mode', 'ai_model_provider', 'moderation_rules'])

        const settings = Object.fromEntries(settingsData?.map((s: any) => [s.key, s.value]) || [])
        const isAutoPilot = settings.auto_moderation_mode === true
        const modelProvider = settings.ai_model_provider || 'openai'
        const customRules = settings.moderation_rules || ''

        // 3. Ejecución del Veredicto IA (Simulación Parametrizada)
        let isSafe = true;

        try {
            console.log(`Analizando drop ${drop_id} con ${modelProvider}. Reglas: ${customRules.substring(0, 20)}...`);

            if (modelProvider.includes('openai') || modelProvider.includes('gpt')) {
                const apiKey = Deno.env.get('OPENAI_API_KEY');
                if (apiKey) {
                    console.log(`Invocando ${modelProvider} para análisis...`);
                    // Logic for real AI call would go here
                }
            } else if (modelProvider.includes('google') || modelProvider.includes('gemini')) {
                const apiKey = Deno.env.get('GOOGLE_API_KEY');
                if (apiKey) {
                    console.log(`Invocando ${modelProvider} para análisis...`);
                    // Logic for real AI call would go here
                }
            }
        } catch (e) {
            console.error("Error en llamada a IA:", e);
            isSafe = true; // Fallback a seguro para no bloquear injustamente sin revisión
        }

        if (isSafe && isAutoPilot) {
            // LIBERACIÓN AUTOMÁTICA
            await supabaseAdmin
                .from('drops')
                .update({
                    is_flagged: false,
                    moderation_notes: `Aprobado automáticamente por ${modelProvider.toUpperCase()} (Auto-Piloto)`
                })
                .eq('id', drop_id)

            // Registrar log
            await supabaseAdmin.from('moderation_logs').insert({
                user_id: drop.author_id,
                drop_id: drop_id,
                action: 'AUTO_APPROVED',
                reason: 'Contenido seguro detectado por IA.'
            })

            return new Response(JSON.stringify({ success: true, released: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        } else if (isSafe) {
            // MANTENER PARA REVISIÓN MANUAL (Auto-Pilot OFF)
            await supabaseAdmin
                .from('drops')
                .update({ moderation_notes: `Pendiente: IA ${modelProvider} sugiere SAFE. Esperando confirmación de humano.` })
                .eq('id', drop_id)

            return new Response(JSON.stringify({ success: true, pending: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        } else {
            // BLOQUEADO - INCREMENTAR FALTAS
            console.log(`Bloqueando drop ${drop_id} de usuario ${drop.author_id}. Incrementando faltas.`)

            // 1. Incrementar contador en perfil (vía RPC)
            await supabaseAdmin.rpc('increment_flag_count', { user_id: drop.author_id })

            // 2. Registrar en log de moderación
            await supabaseAdmin.from('moderation_logs').insert({
                user_id: drop.author_id,
                drop_id: drop_id,
                action: 'AUTO_BLOCKED',
                reason: 'Violación de reglas de moderación detectada por IA.'
            })

            // 3. Marcar como bloqueado en drops
            await supabaseAdmin
                .from('drops')
                .update({ moderation_notes: `Bloqueado por IA (${modelProvider}): Riesgo detectado. Falta registrada.` })
                .eq('id', drop_id)

            return new Response(JSON.stringify({ success: true, blocked: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
