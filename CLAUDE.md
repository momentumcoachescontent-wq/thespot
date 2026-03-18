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
- **Package ID**: `app.thespot.campus` — no cambiar después de primera publicación.
- **Keystore**: `twa/android.keystore`, alias `thespot-key`. Nunca subir a git (en `.gitignore`).
- **SHA-256 keystore**: `DD:0B:16:5B:70:1B:6A:A0:2C:BF:9E:8A:D3:FC:03:36:D0:DB:54:C7:6D:4D:D6:F5:CC:63:7D:74:20:78:BF:AF`
- **`public/.well-known/assetlinks.json`**: ya actualizado con el SHA-256 correcto.
- **Íconos PNG** generados y en `public/icons/` (192, 512, maskable-512). Regenerar con `@resvg/resvg-js` desde `icon.svg` si se cambia el ícono.
- **Android SDK + JDK 17**: instalados por bubblewrap en `~/.bubblewrap/` — no reinstalar.
- **Build commands** (desde `twa/`):
  ```bash
  export JAVA_HOME=~/.bubblewrap/jdk/jdk-17.0.11+9/Contents/Home
  export PATH=$JAVA_HOME/bin:$PATH
  export ANDROID_HOME=~/.bubblewrap/android_sdk
  export BUBBLEWRAP_KEYSTORE_PASSWORD=thespot2026
  export BUBBLEWRAP_KEY_PASSWORD=thespot2026
  ./gradlew assembleRelease   # → app/build/outputs/apk/release/app-release.apk (935 KB)
  ./gradlew bundleRelease     # → app/build/outputs/bundle/release/app-release.aab (1.0 MB)
  ```
- **Subir a Play Store**: usar el `.aab` (no el `.apk`) para nuevas releases.
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
| 0056 | `delete_my_account()` SECURITY DEFINER RPC — elimina perfil + auth.users |
