# THE SPOT — Instrucciones para Claude Code

## Proyecto
Voice social network para estudiantes mexicanos (unis + prepas).
Stack: React + TypeScript + Vite, Tailwind + Shadcn/ui, Framer Motion, Supabase, Stripe, React Query.
Deploy: Lovable → `thespot.lovable.app`

---

## Reglas de código y UX

- **UI siempre en español**. Copy, toasts, labels, errores — todo en español.
- **Una pantalla, no flujos multi-paso**. Inline patterns (dropdowns, toggles) sobre navegación.
- **Listas planas con búsqueda**, no tabs por categoría.
- **No hacer cambios masivos en lotes** a datos de usuarios existentes. Siempre opt-in por usuario.
- Respetar los patrones de Shadcn/ui + Tailwind ya en uso. No introducir librerías de UI nuevas.
- Animaciones con Framer Motion donde ya exista; no añadir en componentes nuevos sin pedirlo.

---

## Arquitectura Supabase

- **Auth**: OTP-only (magic link / 8-dígitos). Bypass list: `momentumcoaches.content@gmail.com`, `ealvareze1@gmail.com` con password `SpotAdmin2026!`.
- **Service role** solo en Edge Functions (nunca en cliente).
- **`(supabase as any)`** para queries cuyo schema no está en los tipos generados — no ampliar el tipo global.
- **RLS habilitado** en todas las tablas públicas. Políticas nuevas sin `is_flagged` (columna eliminada en 0051).
- **Migraciones**: pegar en SQL Editor del dashboard de Supabase (CLI no está sincronizado con remote history 0036-0049+).
- Tras DDL que afecte joins o columnas: `NOTIFY pgrst, 'reload schema';`.
- **Joins PostgREST**: preferir queries separadas + `.in("id", ids)` batch en lugar de embedded joins con FK constraint hints (`!fkey_name`) — más resiliente a FK faltantes.

---

## Seguridad — estándares establecidos (auditoría 2026-03-17)

### Edge Functions
- **CORS**: nunca fallback a `"*"`. Usar `APP_URL ?? "https://thespot.lovable.app"` como mínimo.
- **Auth**: todas las funciones deben verificar JWT (`Authorization: Bearer`). Rechazar sin token.
- **Envío de push individual** (`send-push`): solo permitido si `callerId === user_id` o el caller es admin. Los envíos masivos (campus) requieren rol admin.
- **URLs de retorno Stripe** (`create-checkout`): construir server-side con `APP_URL`. Nunca aceptar `success_url` / `cancel_url` del cliente.
- **Portal Stripe** (`customer-portal`): siempre URL generada server-side. Sin fallback a URL hardcodeada en frontend.

### Secretos
- **`.env` nunca en git**. Está en `.gitignore`; si se detecta trackeado, hacer `git rm --cached .env` inmediatamente.
- **Variables públicas** (VITE_*): solo datos no sensibles (ej. Supabase anon key). Nunca webhooks, tokens operativos ni service role keys.
- Mantener `.env.example` con placeholders — la única referencia de qué variables se necesitan.
- Endpoints operativos (webhooks n8n, etc.) rotar si fueron expuestos.

### Frontend
- **No hardcodear URLs de servicios externos** (Stripe, billing portals). Si la API falla, mostrar toast de error claro — no fallback a URL fija.
- **`window.open` a terceros** (WhatsApp, Stripe): documentado y esperado, no eliminar.

---

## Móvil / TWA (Google Play)

- **Dominio**: `thespot.lovable.app` — único dominio verificado para Digital Asset Links.
- **`twa/twa-manifest.json`**: no dejar `YOUR_LOVABLE_DOMAIN` — siempre `thespot.lovable.app`.
- Antes de build TWA: verificar que todos los placeholder estén sustituidos.
- `window.open` a WhatsApp (SOS, check-in) y Stripe (portal/checkout) son comportamientos explícitos y esperados — documentar en política de privacidad.

---

## Funcionalidades clave

### SOS
- Flujo: GPS (best-effort 8s) → log `sos_incidents` → abrir WhatsApp con mensaje de emergencia.
- **Sin PIN, sin countdown, sin webhook n8n**. Solo confirmación modal → WhatsApp.
- `sos_contacts`: columnas `is_spot_contact` (bool) e `is_emergency_contact` (bool). Sin `relationship`.

### Drops
- Duración grabación: freemium configurable en `site_settings.recording_limit_freemium`, premium en `recording_limit_premium`.
- Sin `is_flagged` ni moderación automática (eliminados en migración 0051).

### Premium (Spot+)
- Via Stripe: mensual + anual. Precios en `site_settings` (`price_display_monthly`, `price_display_yearly`).
- Admins reciben premium automáticamente (`trg_enforce_admin_premium`).
- `bypass_edu_validation` es independiente de `is_premium`.

### Podcasts (Fase 1 completa)
- `access_tier ('free'|'premium')`, `status ('draft'|'published'|'archived')`, `expires_at` nullable.
- Play count server-side via RPC `increment_podcast_play_count` (solo si ≥ 15s).

---

## Migraciones aplicadas en producción

| # | Descripción |
|---|---|
| 0042-0043 | Security hardening (RLS, search_path) |
| 0044 | Fix admin edu validation |
| 0045 | Missing tables + schema cache reload |
| 0046-0048 | Freemium test user + edu bypass |
| 0049 | Podcast v2 (access_tier, status, expires_at) |
| 0051 | Remove moderation (drops.is_flagged, moderation_logs, profiles.flag_count) |
| 0052 | Fix reactions RLS policy + spatial_ref_sys RLS |
| 0053 | pg_cron storage cleanup job (requiere editar placeholders antes de aplicar) |
| 0054 | sos_contacts categories (is_spot_contact, is_emergency_contact) |
| 0055 | conversations FK constraints + schema reload |
