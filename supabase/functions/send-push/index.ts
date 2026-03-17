// Edge Function: send-push
// Sends Web Push notifications (VAPID) to one or more users.
// Secrets required: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
//
// Payload options:
//   { user_id, title, body, url, tag }           → notify a single user
//   { university_domain, title, body, url, tag } → notify all users in a campus

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const appOrigin = Deno.env.get("APP_URL") ?? "https://thespot.lovable.app";
const corsHeaders = {
  "Access-Control-Allow-Origin": appOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Minimal VAPID / Web Push implementation using fetch (avoids npm:web-push ESM issues in Deno)
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth_key: string },
  payload: string,
  vapidPublic: string,
  vapidPrivate: string,
  vapidSubject: string
): Promise<{ ok: boolean; status: number }> {
  // Build VAPID JWT
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const expiry = Math.floor(Date.now() / 1000) + 12 * 3600;

  const header = btoa(JSON.stringify({ typ: "JWT", alg: "ES256" }))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const claims = btoa(JSON.stringify({ aud: audience, exp: expiry, sub: vapidSubject }))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const signingInput = `${header}.${claims}`;

  // Import the private key (pkcs8 DER from raw base64url)
  const rawPrivate = Uint8Array.from(
    atob(vapidPrivate.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0)
  );

  let privateKey: CryptoKey;
  try {
    privateKey = await crypto.subtle.importKey(
      "pkcs8",
      rawPrivate,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"]
    );
  } catch {
    // Fallback: try raw format (32 bytes)
    privateKey = await crypto.subtle.importKey(
      "raw",
      rawPrivate,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"]
    );
  }

  const sigBytes = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBytes)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const jwt = `${signingInput}.${sig}`;

  const vapidAuth = `vapid t=${jwt}, k=${vapidPublic}`;

  // Encrypt the payload using Web Push encryption (RFC 8291)
  // For simplicity, send as plain text with content-encoding: aes128gcm
  // Full RFC 8291 encryption requires the client's p256dh + auth_key.
  // We use the Web Crypto API to do ECDH + HKDF + AES-GCM.

  // Derive shared secret via ECDH
  const clientPublicKey = await crypto.subtle.importKey(
    "raw",
    Uint8Array.from(atob(subscription.p256dh.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  const serverKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );

  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: clientPublicKey },
    serverKeyPair.privateKey,
    256
  );

  const serverPublicKeyRaw = await crypto.subtle.exportKey("raw", serverKeyPair.publicKey);

  const authBuffer = Uint8Array.from(
    atob(subscription.auth_key.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0)
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF to derive content encryption key and nonce
  const ikm = await crypto.subtle.importKey("raw", sharedSecret, "HKDF", false, ["deriveKey", "deriveBits"]);

  const prk = await crypto.subtle.importKey(
    "raw",
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: authBuffer, info: new TextEncoder().encode("Content-Encoding: auth\0") },
      ikm,
      256
    ),
    "HKDF",
    false,
    ["deriveKey", "deriveBits"]
  );

  // keyinfo and nonceinfo per RFC 8291
  const serverPublic = new Uint8Array(serverPublicKeyRaw);
  const clientPublicRaw = Uint8Array.from(
    atob(subscription.p256dh.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0)
  );

  const buildContext = (label: string) => {
    const enc = new TextEncoder();
    const labelBytes = enc.encode(label + "\0");
    const buf = new Uint8Array(labelBytes.length + 2 + clientPublicRaw.length + 2 + serverPublic.length);
    buf.set(labelBytes);
    const view = new DataView(buf.buffer);
    view.setUint16(labelBytes.length, clientPublicRaw.length);
    buf.set(clientPublicRaw, labelBytes.length + 2);
    view.setUint16(labelBytes.length + 2 + clientPublicRaw.length, serverPublic.length);
    buf.set(serverPublic, labelBytes.length + 2 + clientPublicRaw.length + 2);
    return buf;
  };

  const keyContext = buildContext("P-256");
  const keyInfo = new Uint8Array([...new TextEncoder().encode("Content-Encoding: aesgcm\0"), ...keyContext]);
  const nonceInfo = new Uint8Array([...new TextEncoder().encode("Content-Encoding: nonce\0"), ...keyContext]);

  const contentKey = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: keyInfo },
    prk,
    128
  );

  const nonceBytes = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: nonceInfo },
    prk,
    96
  );

  const aesKey = await crypto.subtle.importKey("raw", contentKey, "AES-GCM", false, ["encrypt"]);

  const plaintextBytes = new TextEncoder().encode(payload);
  // Padding: 2 bytes of zero padding length + content
  const padded = new Uint8Array(2 + plaintextBytes.length);
  padded.set(plaintextBytes, 2);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonceBytes },
    aesKey,
    padded
  );

  // Build the encrypted body: salt (16) + rs (4, = 4096) + idlen (1) + server public (65) + ciphertext
  const rs = 4096;
  const body = new Uint8Array(16 + 4 + 1 + serverPublic.length + ciphertext.byteLength);
  body.set(salt);
  new DataView(body.buffer).setUint32(16, rs);
  body[20] = serverPublic.length;
  body.set(serverPublic, 21);
  body.set(new Uint8Array(ciphertext), 21 + serverPublic.length);

  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Authorization": vapidAuth,
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aesgcm",
      "Encryption": `salt=${btoa(String.fromCharCode(...salt)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")}`,
      "Crypto-Key": `dh=${btoa(String.fromCharCode(...serverPublic)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")}; keyid=p256dh`,
      "TTL": "86400",
    },
    body,
  });

  return { ok: response.ok, status: response.status };
}

function decodeJwt(token: string): Record<string, any> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch { return null; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // HIGH-3: require authenticated caller
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
    });
  }
  const jwt = decodeJwt(authHeader.replace("Bearer ", ""));
  const callerId = jwt?.sub;
  if (!callerId || (jwt?.exp && jwt.exp < Math.floor(Date.now() / 1000))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
    });
  }

  try {
    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:soporte@thespot.app";

    if (!vapidPublic || !vapidPrivate) {
      throw new Error("VAPID keys not configured. Generate with: npx web-push generate-vapid-keys");
    }

    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { user_id, university_domain, title, bodyText, url, tag } = {
      bodyText: body.body,
      ...body,
    };

    // Determine which users to notify
    let userIds: string[] = [];

    if (user_id) {
      // HIGH-3: only allow sending to self; admins can target any user
      if (user_id !== callerId) {
        const { data: callerProfile } = await adminSupabase
          .from("profiles").select("role").eq("id", callerId).single();
        if (callerProfile?.role !== "admin") {
          return new Response(JSON.stringify({ error: "Forbidden: cannot send push to another user" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403,
          });
        }
      }
      userIds = [user_id];
    } else if (university_domain) {
      // Campus-wide push: require admin role
      const { data: callerProfile } = await adminSupabase
        .from("profiles").select("role").eq("id", callerId).single();
      if (callerProfile?.role !== "admin") {
        return new Response(JSON.stringify({ error: "Forbidden: campus-wide push requires admin" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403,
        });
      }
      const { data: profiles } = await adminSupabase
        .from("profiles").select("id").eq("university_domain", university_domain);
      userIds = (profiles || []).map((p: any) => p.id);
    }

    if (userIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch subscriptions for these users
    const { data: subs } = await adminSupabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth_key")
      .in("user_id", userIds);

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({ title, body: bodyText, url, tag });
    const expiredEndpoints: string[] = [];

    let sent = 0;
    await Promise.allSettled(
      subs.map(async (sub: any) => {
        const result = await sendWebPush(sub, payload, vapidPublic, vapidPrivate, vapidSubject);
        if (result.status === 410 || result.status === 404) {
          expiredEndpoints.push(sub.endpoint);
        } else if (result.ok) {
          sent++;
        }
      })
    );

    // Clean up expired subscriptions
    if (expiredEndpoints.length > 0) {
      await adminSupabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("send-push error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
