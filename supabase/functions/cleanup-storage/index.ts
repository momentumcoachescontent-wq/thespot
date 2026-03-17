// Edge Function: cleanup-storage
// Deletes audio files in Storage for expired drops and podcast episodes,
// then marks expired podcast_episodes as 'archived'.
//
// Called nightly by pg_cron via pg_net (see migration 0053).
// No CORS headers needed — internal server-to-server only.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Verify the caller is sending the service role key as Bearer token.
// This prevents accidental public exposure of the cleanup endpoint.
function isAuthorized(req: Request): boolean {
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${SERVICE_KEY}`;
}

// Extracts the storage path from a Supabase public URL.
// e.g. https://xxx.supabase.co/storage/v1/object/public/drops/user-123.webm
//   → "user-123.webm"
function extractStoragePath(url: string, bucket: string): string | null {
  if (!url) return null;
  const marker = `/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (!isAuthorized(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const now = new Date().toISOString();
  const results = { drops_files: 0, episodes_files: 0, episodes_archived: 0, errors: [] as string[] };

  try {
    // ── 1. Expired drops ─────────────────────────────────────────────────────
    // Give a 1-hour grace period so in-flight listeners aren't interrupted.
    const { data: expiredDrops, error: dropsErr } = await admin
      .from("drops")
      .select("id, audio_url")
      .lt("expires_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

    if (dropsErr) {
      results.errors.push(`drops query: ${dropsErr.message}`);
    } else if (expiredDrops?.length) {
      const paths = expiredDrops
        .map((d) => extractStoragePath(d.audio_url, "drops"))
        .filter(Boolean) as string[];

      if (paths.length) {
        const { error: storErr } = await admin.storage.from("drops").remove(paths);
        if (storErr) results.errors.push(`drops storage: ${storErr.message}`);
        else results.drops_files = paths.length;
      }
    }

    // ── 2. Expired podcast episodes ──────────────────────────────────────────
    const { data: expiredEps, error: epsErr } = await admin
      .from("podcast_episodes")
      .select("id, audio_url")
      .not("expires_at", "is", null)
      .lt("expires_at", now)
      .neq("status", "archived");

    if (epsErr) {
      results.errors.push(`episodes query: ${epsErr.message}`);
    } else if (expiredEps?.length) {
      const paths = expiredEps
        .map((e) => extractStoragePath(e.audio_url, "podcasts"))
        .filter(Boolean) as string[];

      if (paths.length) {
        const { error: storErr } = await admin.storage.from("podcasts").remove(paths);
        if (storErr) results.errors.push(`podcasts storage: ${storErr.message}`);
        else results.episodes_files = paths.length;
      }

      // Mark archived regardless of whether storage delete succeeded
      // (avoids retrying the same file on the next run)
      const ids = expiredEps.map((e) => e.id);
      const { error: archErr } = await admin
        .from("podcast_episodes")
        .update({ status: "archived" })
        .in("id", ids);

      if (archErr) results.errors.push(`archive update: ${archErr.message}`);
      else results.episodes_archived = ids.length;
    }
  } catch (err) {
    results.errors.push(String(err));
  }

  const status = results.errors.length > 0 ? 207 : 200;
  return new Response(JSON.stringify(results), {
    status,
    headers: { "Content-Type": "application/json" },
  });
});
