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

        // 2. Lógica de Moderación "Smart" (Token Saving)
        // En un flujo real, aquí llamarías a OpenAI (Whisper + GPT) o Gemini.
        // Para ahorrar tokens, puedes implementar un check local primero o usar bitrates bajos.

        console.log(`Analizando drop ${drop_id} de usuario ${drop.author_id}...`)

        // SIMULACIÓN DE RESULTADO DE IA:
        // Aquí iría el fetch a la API de IA.
        const isSafe = true; // Simulación de éxito

        if (isSafe) {
            // Liberar el drop
            await supabaseAdmin
                .from('drops')
                .update({ is_flagged: false, moderation_notes: 'Aprobado automáticamente por AI' })
                .eq('id', drop_id)

            return new Response(JSON.stringify({ success: true, action: 'approved' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        } else {
            // Mantener flagged o borrar
            await supabaseAdmin
                .from('drops')
                .update({ moderation_notes: 'Bloqueado: Contenido de alto riesgo detectado' })
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
