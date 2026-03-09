import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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

        // 3. Obtener el archivo de audio para transcripción (Whisper)
        const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
        if (!openAIApiKey) throw new Error("Falta OPENAI_API_KEY para transcripción Whisper");

        console.log(`Descargando audio para transcribir: ${drop.audio_url}`);
        const audioRes = await fetch(drop.audio_url);
        if (!audioRes.ok) throw new Error(`Error descargando audio: ${audioRes.status}`);
        const audioBlob = await audioRes.blob();

        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');
        formData.append('model', 'whisper-1');

        console.log("Llamando a OpenAI Whisper...");
        const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${openAIApiKey}` },
            body: formData
        });

        const whisperData = await whisperRes.json();
        if (!whisperRes.ok) {
            console.error("OpenAI Whisper Error:", whisperData);
            throw new Error(`Fallo transcripción: ${whisperData.error?.message || "Error desconocido"}`);
        }

        const transcriptText = whisperData.text || "";
        console.log(`Transcripción obtenida: "${transcriptText}"`);

        // 4. Ejecución del Veredicto IA
        let isSafe = true;

        if (transcriptText.trim().length > 0) {
            try {
                console.log(`Analizando con ${modelProvider}. Reglas: ${customRules.substring(0, 50)}...`);

                const systemPrompt = `Eres un moderador estricto para una comunidad universitaria de voz. 
Evalúa el siguiente texto extraído de un audio.
Reglas de la comunidad: ${customRules || "No permitir violencia, odio o acoso."}
Si el texto viola las reglas o es altamente inapropiado/peligroso, responde ÚNICAMENTE con la palabra: BLOCKED.
De lo contrario, responde ÚNICAMENTE con la palabra: SAFE.
Texto a evaluar: "${transcriptText}"`;

                if (modelProvider.includes('openai') || modelProvider.includes('gpt')) {
                    const res = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${openAIApiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: modelProvider === 'openai' ? 'gpt-4o' : modelProvider,
                            messages: [{ role: 'system', content: systemPrompt }],
                            temperature: 0.1,
                            max_tokens: 5
                        })
                    });
                    const data = await res.json();
                    const verdict = data.choices?.[0]?.message?.content?.trim().toUpperCase() || 'SAFE';
                    if (verdict.includes('BLOCKED')) isSafe = false;

                } else if (modelProvider.includes('google') || modelProvider.includes('gemini')) {
                    const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
                    if (googleApiKey) {
                        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelProvider === 'google' ? 'gemini-1.5-pro' : modelProvider}:generateContent?key=${googleApiKey}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{ parts: [{ text: systemPrompt }] }]
                            })
                        });
                        const data = await res.json();
                        const verdict = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase() || 'SAFE';
                        if (verdict.includes('BLOCKED')) isSafe = false;
                    }
                }
            } catch (e) {
                console.error("Error en llamada a IA para veredicto:", e);
                isSafe = true; // Fallback a seguro para no bloquear injustamente si falla la IA
            }
        } else {
            console.log("Audio sin voz o inaudible, marcando como SAFE por defecto.");
            isSafe = true;
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
