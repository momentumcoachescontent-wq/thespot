# THE SPOT — Contexto de Desarrollo para Continuidad

> Archivo de referencia para retomar el proyecto en un chat nuevo sin perder contexto.
> Última actualización: 2026-03-15. Commit actual: `5291110` en rama `main`.

---

## 1. Arquitectura Actual

### Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Estilos | Tailwind CSS + Shadcn/ui (Radix primitives) |
| Animaciones | Framer Motion |
| Backend | Supabase (Auth, PostgreSQL, Storage, Edge Functions) |
| Pagos | Stripe (Checkout + Billing Portal + Webhooks) |
| Deploy frontend | Lovable (auto-deploy desde GitHub push) |
| Deploy edge functions | Supabase CLI (`npx supabase functions deploy`) |
| Repo | `https://github.com/momentumcoachescontent-wq/thespot.git` |
| Supabase project ref | `inchlsvnvdotbxqnsxmd` |

### Estructura de Archivos Clave

```
src/
├── App.tsx                          # Rutas (BrowserRouter + ProtectedLayout)
├── contexts/
│   ├── AuthContext.tsx              # user, profile, isAdmin, isPremium, refreshProfile
│   └── FilterContext.tsx            # resolvedDomain (filtro por campus activo)
├── pages/
│   ├── LandingPage.tsx              # Login OTP + bypass password para cuentas admin
│   ├── FeedPage.tsx                 # Feed de drops + grabación + filtro campus
│   ├── PodcastPage.tsx              # Spotcasts — solo premium puede crear
│   ├── MapPage.tsx                  # Mapa de actividad universitaria
│   ├── EventsPage.tsx               # Eventos por campus
│   ├── MessagesPage.tsx             # Lista de conversaciones DM
│   ├── ChatPage.tsx                 # Chat 1:1 (texto + voz)
│   ├── ProfilePage.tsx              # Perfil + contactos SOS + toggle notificaciones
│   ├── PremiumPage.tsx              # Suscripción Spot+ (Stripe Checkout + Portal)
│   ├── AdminPage.tsx                # Panel admin (estadísticas, moderación, config)
│   └── DashboardHome.tsx            # Ranking y métricas
├── components/
│   ├── BottomNav.tsx                # Nav móvil: Canal/Mapa/Podcast/Mensajes/Perfil
│   ├── SideNav.tsx                  # Nav desktop con todos los items + admin
│   ├── DropCard.tsx                 # Tarjeta de audio drop con player
│   ├── VoiceRecorder.tsx            # Grabadora principal (Feed)
│   ├── VoiceReactionRecorder.tsx    # Grabadora de reacciones de voz (3s)
│   ├── PushNotificationToggle.tsx   # Toggle VAPID subscribe/unsubscribe
│   ├── DashboardLayout.tsx          # Layout con SOS button integrado
│   └── dm/
│       ├── ConversationItem.tsx     # Item de lista DM con badge unread
│       ├── MessageBubble.tsx        # Burbuja texto/audio con mini player
│       └── DmVoiceRecorder.tsx      # Grabadora inline para DMs
├── hooks/
│   ├── useConversations.ts          # Conversations + unread count + realtime
│   ├── useMessages.ts               # Messages de una conv + realtime + mark read
│   └── usePushNotifications.ts      # SW register, VAPID subscribe, DB upsert
└── integrations/supabase/
    └── client.ts                    # Supabase client (types vacíos, usar `as any`)

supabase/
├── functions/
│   ├── create-checkout/             # Stripe Checkout Session (Spot+ subscription)
│   ├── customer-portal/             # Stripe Billing Portal (gestionar/cancelar)
│   ├── send-push/                   # Web Push VAPID (campus drop, DM, SOS)
│   ├── stripe-webhook/              # Procesa eventos Stripe → activa premium en DB
│   └── moderate-drop/               # IA moderation (Whisper → GPT-4o / Gemini)
└── migrations/
    ├── 0036_stripe_premium_integration.sql
    ├── 0037_stripe_price_settings.sql
    ├── 0038_recording_limits.sql
    ├── 0039_push_notifications.sql
    └── 0040_direct_messages.sql

public/
└── sw.js                            # Service Worker para Web Push notifications
```

### Base de datos — Tablas Principales

| Tabla | Propósito |
|---|---|
| `profiles` | Extiende `auth.users`: username, role, is_premium, stripe_customer_id, university_domain |
| `spots` | Nodos de campus con geolocalización (`POINT` PostGIS) |
| `drops` | Audios temporales con expiración configurable |
| `reactions` | Reacciones emoji + voz a drops |
| `drop_history` | Historial persistente de drops (los drops en sí expiran) |
| `podcasts` | Spotcasts (episodios de podcast, solo premium puede crear) |
| `incidents` | Alertas SOS con foto, ubicación, descripción |
| `sos_contacts` | Contactos de emergencia por usuario |
| `events` | Eventos por campus |
| `site_settings` | KV store de configuración admin (key TEXT, value JSONB) |
| `push_subscriptions` | Endpoints VAPID por usuario/dispositivo |
| `conversations` | Conversaciones DM 1:1 (participant_a < participant_b invariante) |
| `messages` | Mensajes texto/audio con read_at para badge unread |

### Edge Functions Activas (todas ACTIVE en producción)

- `create-checkout` — crea Stripe Checkout Session
- `customer-portal` — crea Stripe Billing Portal session
- `stripe-webhook` — procesa `customer.subscription.*` → actualiza `profiles`
- `send-push` — envía Web Push VAPID a usuario individual o todo un campus
- `moderate-drop` — modera audio con IA
- `stripe-setup`, `stripe-worker`, `test-ai` — utilidades/legacy

---

## 2. Decisiones de Diseño

### Por qué `(supabase as any).from(...)` en todas partes
El archivo `src/integrations/supabase/types.ts` tiene el schema vacío (Lovable no lo regenera automáticamente desde las migraciones). Usar `as any` es el patrón establecido en todo el proyecto para evitar errores de tipos en tablas custom. **No intentar tiparlo sin regenerar el schema completo.**

### Por qué `decodeJwt()` en las edge functions en lugar de `supabase.auth.getUser()`
`auth.getUser()` hace una llamada de red a `/auth/v1/user` que falla para usuarios creados vía Management API con `raw_app_meta_data: {"providers": []}` vacío (el caso de las cuentas de prueba del admin). La solución: decodificar el JWT payload localmente con `atob()`. El Supabase edge runtime ya valida la firma antes de invocar la función, así que es seguro confiar en el payload.

```typescript
function decodeJwt(token: string): Record<string, any> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(payload));
}
```

### Por qué `refreshSession()` + `fetch()` directo en PremiumPage (no `supabase.functions.invoke`)
`supabase.functions.invoke` con headers manuales enviaba `"Bearer undefined"` si la sesión estaba caducada. Con `refreshSession()` primero y `fetch()` directo con el token fresco se garantiza que el JWT es válido.

### Por qué `site_settings` (tabla KV) para configuración
Todo lo que el admin debe poder cambiar sin redeploy (límites de grabación, duración de drops, price IDs de Stripe, precios de display, config de IA) vive en `site_settings` como `{key TEXT, value JSONB}`. La edge function lee de ahí como fallback si los secrets de env no están configurados.

### Por qué las conversaciones DM tienen `CHECK(participant_a < participant_b)`
Para garantizar unicidad sin importar el orden en que se crea la conversación. `participant_a` es siempre el UUID lexicográficamente menor. El RPC `get_or_create_conversation(other_user_id)` hace el ordenamiento antes del INSERT.

### Por qué reemplazar "Eventos" con "Mensajes" en el BottomNav móvil
5 tabs es el máximo práctico en móvil. Eventos es accesible desde SideNav (desktop) y es de uso menos frecuente que DMs. Los Mensajes necesitan visibilidad por el badge de unread count.

### Por qué el service worker vive en `/public/sw.js`
Para que Vite lo sirva en la raíz del dominio (`/sw.js`). Los service workers solo pueden registrarse desde su propio scope — si estuviera en `/assets/sw.js` solo controlaría `/assets/`.

---

## 3. Aprendizajes Técnicos y Hacks que Funcionaron

### Error: `drops_duration_seconds_check` constraint violation
**Causa:** La duración se estimaba como `Math.floor(blob.size / 15000)` — para grabaciones largas esto excedía el límite original de 60s del constraint.
**Fix:** `VoiceRecorder` pasa el `elapsed` real al callback. Migration `0038` sube el constraint a 3600s.

### Error: Stripe `No such price: 'prod_TqqqmkapCQYj7Z'`
**Causa:** El admin configuró un Product ID (`prod_`) donde Stripe espera un Price ID (`price_`).
**Fix:** `create-checkout` ahora auto-resuelve: si el ID empieza con `prod_`, llama a `stripe.products.retrieve()` y usa `product.default_price`.

### Error: email rate limit para usuario de prueba
**Causa:** El flujo de bypass (password auth) caía al bloque de OTP cuando fallaba la contraseña, acumulando envíos de email rate-limited.
**Fix:** El bloque bypass siempre hace `return` — nunca llega al flujo OTP.

### Error: `create-checkout` retorna 400 — Unauthorized
**Causa:** `supabase.auth.getUser()` falla para usuarios creados via Management API con providers vacíos.
**Fix:** Decodificar JWT localmente (ver sección 2).

### Deploy de migraciones cuando el historial local no coincide con remoto
**Problema:** `supabase db push --linked` falla si hay archivos de migración duplicados localmente (los `0002_*`, `0003_*` que se crearon durante el desarrollo).
**Solución:** Usar la Management API directamente:
```bash
SQL=$(cat supabase/migrations/xxxx_nombre.sql)
curl -X POST "https://api.supabase.com/v1/projects/inchlsvnvdotbxqnsxmd/database/query" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL" | jq -Rs .)}"
# Respuesta [] = éxito
```
El token está en macOS Keychain: `security find-generic-password -a "supabase" -w` (resultado base64, decodificar).

### Deploy de edge functions — workdir incorrecto en background
Al hacer `npx supabase functions deploy ... &` en background desde un shell, el CLI pierde el CWD del proyecto y busca el código en `~`. Siempre deployar en foreground o con `cd && npx` explícito.

### Web Push sin librería `web-push`
La función `send-push` implementa Web Push ECDH + HKDF + AES-GCM desde cero usando Web Crypto API de Deno porque `npm:web-push` tiene problemas en el runtime de Supabase edge. La implementación sigue RFC 8291 (aesgcm content encoding).

### TypeScript errors en VS Code para edge functions Deno
Los errores de "Cannot find module deno.land/..." en el IDE son **esperados y no afectan el deploy**. El runtime de Supabase es Deno, pero VS Code usa TypeScript estándar. Ignorar estos diagnósticos en archivos bajo `supabase/functions/`.

---

## 4. Estado del Progreso

### 100% Operativo en Producción

- **Autenticación:** OTP email + bypass password para cuentas admin/test
- **Feed de Drops:** grabación, publicación, expiración, reacciones emoji, reacciones de voz, moderación IA
- **Filtro por campus:** `FilterContext.resolvedDomain` filtra drops y se usa al grabar
- **Spotcasts (Podcasts):** grabación, publicación, escucha — solo premium puede crear
- **Mapa:** actividad universitaria por geolocalización
- **Botón SOS:** alerta con foto, GPS, descripción, contactos de emergencia
- **Eventos:** creación y listado por campus
- **Ranking / Dashboard:** métricas y top usuarios
- **Premium Spot+:** Stripe Checkout funcional (mensual + anual), webhook activa premium en DB, badge en perfil, admins tienen premium permanente
- **Portal de suscripción:** botón "Gestionar" en PremiumPage → Stripe Billing Portal
- **Panel Admin:** estadísticas, moderación manual, configuración de site_settings, Price IDs de Stripe
- **DMs 1:1:** texto + voz, real-time, badge de no leídos en nav, push notification al destinatario
- **Push Notifications (infra):** edge function `send-push` activa, SW deployado, hook frontend listo

### Pendiente / Requiere Acción Manual

| Item | Estado | Qué falta |
|---|---|---|
| Push Notifications activadas | Código listo, **inactivo** | Generar VAPID keys (`npx web-push generate-vapid-keys`) y agregar `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` en Supabase Secrets + `VITE_VAPID_PUBLIC_KEY` en Lovable env vars |
| Stripe Customer Portal | **100% operativo** | URL directa: `https://billing.stripe.com/p/login/bJe5kDbgQ7O17RnfuM5Ne00` — no requiere edge function |
| Frontend DMs en producción | Commiteado, **pendiente de Lovable deploy** | Lovable debe detectar el push a main y hacer rebuild. Verificar en preview |
| Notificaciones SOS push | Trigger en SOS no implementado | Agregar `supabase.functions.invoke('send-push', ...)` en `DashboardLayout.tsx` en `handleSosTrigger` (mismo patrón que FeedPage) |

### Posible Backlog Futuro

- Portal de suscripción "mis pagos" más detallado (Stripe Customer Portal ya resuelve esto)
- Búsqueda global de usuarios/drops
- Onboarding guiado para nuevos usuarios (primer login)
- Sistema de referidos / invitaciones
- Notificaciones in-app (no solo push)
- Analytics por creador (ahora solo admin ve métricas globales)
- DMs grupales

---

## 5. Convenciones de Código

### Nombres y Estructura

- **Páginas:** `PascalCase` + sufijo `Page` → `MessagesPage.tsx`, `ChatPage.tsx`
- **Componentes:** `PascalCase` → `DropCard.tsx`, `ConversationItem.tsx`
- **Hooks:** `camelCase` + prefijo `use` → `useConversations.ts`, `useMessages.ts`
- **Migraciones:** `NNNN_descripcion_snake_case.sql` secuencial → `0040_direct_messages.sql`
- **Edge functions:** directorio = slug de función → `supabase/functions/customer-portal/index.ts`

### Patrones React

- Estado local con `useState`, no Redux ni Zustand
- Real-time siempre via `supabase.channel().on('postgres_changes', ...)` inline en el componente o hook, no en contexto global
- Todas las queries a tablas custom: `(supabase as any).from("tabla")` — nunca `supabase.from("tabla")` porque los tipos están vacíos
- Animaciones: siempre `motion.div` de Framer Motion, nunca CSS transitions puras para elementos de UI importantes
- Toast notifications: `useToast()` de `@/hooks/use-toast` para errores/confirmaciones

### Patrones de Edge Functions (Deno)

Todas las edge functions siguen este template:
```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Siempre usar decodeJwt() en lugar de supabase.auth.getUser()
function decodeJwt(token: string): Record<string, any> | null { ... }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    // lógica aquí
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
  }
});
```

### UX / Diseño

- Idioma de la UI: **español** en todo el copy visible al usuario
- Tipografía display: `font-bebas` (Bebas Neue) para headings y labels prominentes
- Tipografía datos/mono: `font-mono text-[9px]` a `text-[11px]` para metadata y labels pequeños
- Color primario: `text-spot-lime` / `bg-spot-lime` (`#C8FF00`) — verde neón
- Colores de soporte: `text-spot-cyan`, `text-spot-red`, `text-spot-safe`
- Fondo: siempre dark (`bg-background`, `bg-card`, `bg-black/40`)
- Bordes: `border-border` o `border-white/10` para glassmorphism
- Botones primarios: `bg-spot-lime text-black` con `shadow-[0_0_20px_rgba(200,255,0,0.3)]`
- No usar emojis en código a menos que el usuario los pida explícitamente en UI copy
- Preferir soluciones de 1 pantalla sobre flujos multi-paso (el usuario rechazó onboarding de 3 pasos)
- Listas de selección: planas con búsqueda, sin tabs por categoría

### site_settings — Keys Conocidas

| Key | Tipo | Propósito |
|---|---|---|
| `recording_limit_freemium` | número (segundos) | Límite de grabación freemium (default: 30) |
| `recording_limit_premium` | número (segundos) | Límite de grabación premium (default: 60) |
| `drop_duration_freemium` | número (minutos) | Expiración de drops freemium (default: 5) |
| `drop_duration_premium` | número (minutos) | Expiración de drops premium (default: 15) |
| `stripe_price_id_monthly` | string | Price ID de Stripe para plan mensual |
| `stripe_price_id_yearly` | string | Price ID de Stripe para plan anual |
| `price_display_monthly` | número (MXN) | Precio que se muestra al usuario (default: 99) |
| `price_display_yearly` | número (MXN) | Precio anual que se muestra (default: 999) |
| `ai_moderation_enabled` | boolean | Activa/desactiva moderación automática con IA |
| `ai_model_provider` | string | `"openai"` o `"gemini"` |

---

## 6. Cuentas y Accesos

| Cuenta | Email | Password | Rol |
|---|---|---|---|
| Admin / test principal | `momentumcoaches.content@gmail.com` | `SpotAdmin2026!` | admin |
| Freemium / test usuario | `ealvareze1@gmail.com` | `SpotAdmin2026!` | user |

> Estas cuentas fueron creadas vía Management API con `providers: []` vacío. Por eso `auth.getUser()` falla para ellas — se autentican correctamente vía `signInWithPassword` pero el token que generan no pasa la validación de red de Supabase Auth. Siempre usar `decodeJwt()` en edge functions.

---

## 7. Comandos Útiles

```bash
# Deploy de una edge function
cd /ruta/al/proyecto
npx supabase functions deploy <nombre-funcion> --project-ref inchlsvnvdotbxqnsxmd

# Aplicar SQL directamente en producción (sin migration history)
SQL=$(cat supabase/migrations/xxxx_nombre.sql)
curl -X POST "https://api.supabase.com/v1/projects/inchlsvnvdotbxqnsxmd/database/query" \
  -H "Authorization: Bearer $(security find-generic-password -a 'supabase' -w | base64 -d)" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL" | jq -Rs .)}"

# Listar edge functions activas
curl "https://api.supabase.com/v1/projects/inchlsvnvdotbxqnsxmd/functions" \
  -H "Authorization: Bearer $(security find-generic-password -a 'supabase' -w | base64 -d)" | jq '[.[] | {name: .slug, status: .status}]'

# Generar VAPID keys para push notifications
npx web-push generate-vapid-keys
```
