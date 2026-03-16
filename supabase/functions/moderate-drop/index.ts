import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// CORS: restrict to APP_URL in production; wildcard only if env not set (dev fallback)
const appOrigin = Deno.env.get("APP_URL") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": appOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // CRIT-3: Require authenticated caller for ALL actions
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    });
  }
  const jwtPayload = decodeJwt(authHeader.replace("Bearer ", ""));
  const callerId = jwtPayload?.sub;
  if (!callerId || (jwtPayload?.exp && jwtPayload.exp < Math.floor(Date.now() / 1000))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const { drop_id, action } = await req.json();

    // Admin actions require admin role — verified server-side, not client-side
    if (action === "ADMIN_APPROVE" || action === "ADMIN_REJECT") {
      const { data: callerProfile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", callerId)
        .single();

      if (callerProfile?.role !== "admin") {
        return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        });
      }

      if (action === "ADMIN_APPROVE") {
        const { error: updateError } = await supabaseAdmin.from("drops").update({ is_flagged: false }).eq("id", drop_id);
        if (updateError) throw updateError;
        return new Response(JSON.stringify({ success: true, released: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
        });
      }

      if (action === "ADMIN_REJECT") {
        const { error: deleteError } = await supabaseAdmin.from("drops").delete().eq("id", drop_id);
        if (deleteError) throw deleteError;
        return new Response(JSON.stringify({ success: true, deleted: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
        });
      }
    }

    // Auto-moderation flow — any authenticated user can trigger (called by system after upload)
    const { data: drop, error: dropError } = await supabaseAdmin
      .from("drops")
      .select("*")
      .eq("id", drop_id)
      .single();

    if (dropError || !drop) throw new Error("Drop no encontrado");

    // Verify caller owns the drop OR is admin
    const { data: callerProfile } = await supabaseAdmin.from("profiles").select("role").eq("id", callerId).single();
    if (drop.author_id !== callerId && callerProfile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403,
      });
    }

    const { data: settingsData } = await supabaseAdmin
      .from("site_settings")
      .select("key, value")
      .in("key", ["auto_moderation_mode", "ai_model_provider", "moderation_rules"]);

    const settings = Object.fromEntries(settingsData?.map((s: any) => [s.key, s.value]) || []);
    const isAutoPilot = settings.auto_moderation_mode === true;
    const modelProvider = settings.ai_model_provider || "openai";
    const customRules = settings.moderation_rules || "";

    const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAIApiKey) throw new Error("Falta OPENAI_API_KEY para transcripción Whisper");

    const audioRes = await fetch(drop.audio_url);
    if (!audioRes.ok) throw new Error(`Error descargando audio: ${audioRes.status}`);
    const audioBlob = await audioRes.blob();

    const formData = new FormData();
    formData.append("file", audioBlob, "audio.webm");
    formData.append("model", "whisper-1");

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAIApiKey}` },
      body: formData,
    });

    const whisperData = await whisperRes.json();
    if (!whisperRes.ok) throw new Error(`Fallo transcripción Whisper: ${whisperData.error?.message || "Error"}`);

    const transcriptText = whisperData.text || "";
    let isSafe = true;

    if (transcriptText.trim().length > 0) {
      try {
        const systemPrompt = `Eres un moderador estricto para una comunidad universitaria de voz. Evalúa el siguiente texto extraído de un audio. Reglas: ${customRules}. Si el texto viola las reglas, responde ÚNICAMENTE con la palabra: BLOCKED. De lo contrario, responde ÚNICAMENTE con la palabra: SAFE. Texto: "${transcriptText}"`;

        if (modelProvider.includes("openai") || modelProvider.includes("gpt")) {
          const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${openAIApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: modelProvider === "openai" ? "gpt-4o" : modelProvider,
              messages: [{ role: "system", content: systemPrompt }], max_tokens: 5, temperature: 0.1,
            }),
          });
          const verdict = (await res.json()).choices?.[0]?.message?.content?.trim().toUpperCase() || "SAFE";
          if (verdict.includes("BLOCKED")) isSafe = false;
        } else if (modelProvider.includes("google") || modelProvider.includes("gemini")) {
          const googleApiKey = Deno.env.get("GOOGLE_API_KEY");
          if (googleApiKey) {
            const res = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${modelProvider === "google" ? "gemini-1.5-pro" : modelProvider}:generateContent?key=${googleApiKey}`,
              { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }] }] }) }
            );
            const verdict = (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase() || "SAFE";
            if (verdict.includes("BLOCKED")) isSafe = false;
          }
        }
      } catch {
        isSafe = true;
      }
    }

    if (isSafe && isAutoPilot) {
      await supabaseAdmin.from("drops").update({ is_flagged: false }).eq("id", drop_id);
      await supabaseAdmin.from("moderation_logs").insert({ user_id: drop.author_id, drop_id, action: "AUTO_APPROVED", reason: "Contenido seguro." });
      return new Response(JSON.stringify({ success: true, released: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    } else if (isSafe) {
      return new Response(JSON.stringify({ success: true, pending: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    } else {
      await supabaseAdmin.rpc("increment_flag_count", { user_id: drop.author_id });
      await supabaseAdmin.from("moderation_logs").insert({ user_id: drop.author_id, drop_id, action: "AUTO_BLOCKED", reason: "Contenido tóxico." });
      return new Response(JSON.stringify({ success: true, blocked: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
