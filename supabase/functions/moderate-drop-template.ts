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

        // 2. Obtener configuración de Auto-Piloto
        const { data: autoModSetting } = await supabaseAdmin
            .from('site_settings')
            .select('value')
            .eq('key', 'auto_moderation_mode')
            .single()

        const isAutoPilot = autoModSetting?.value === true

        // 3. Lógica de Moderación "Smart" (Simulada)
        console.log(`Analizando drop ${drop_id}... Auto-Piloto: ${isAutoPilot}`)

        const isSafe = true // Simulación de veredicto IA

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
