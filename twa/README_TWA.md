# THE SPOT — Guía de Publicación en Google Play (TWA)

> Trusted Web Activity convierte la PWA en un APK nativo que Google Play acepta.
> La app se sirve desde tu dominio web — no hay código nativo, solo un shell Android.

---

## Prerrequisitos

| Herramienta | Versión mínima | Instalar |
|---|---|---|
| Node.js | 18+ | `brew install node` |
| Java JDK | 11+ | `brew install --cask temurin` |
| Android SDK Build Tools | 34 | Via Android Studio o `sdkmanager` |
| Bubblewrap CLI | latest | `npm i -g @bubblewrap/cli` |

```bash
# Verificar que todo esté instalado
node -v && java -version && bubblewrap --version
```

---

## Paso 1 — Confirmar tu dominio de producción

Antes de hacer cualquier otra cosa, necesitas el dominio exacto donde vive la app.

- Si usas Lovable sin dominio personalizado: `https://PROYECTO_ID.lovable.app`
- Si tienes dominio propio (recomendado): `https://thespot.app` o similar

**Reemplaza `YOUR_LOVABLE_DOMAIN` en `twa-manifest.json` y en `assetlinks.json` con ese dominio exacto.**

---

## Paso 2 — Generar los íconos PNG

El repositorio incluye `/public/icons/icon.svg`. Necesitas 3 archivos PNG:

1. Ve a [realfavicongenerator.net](https://realfavicongenerator.net) o usa Inkscape/Figma
2. Exporta desde `public/icons/icon.svg`:
   - `icon-192.png` → 192×192 px
   - `icon-512.png` → 512×512 px
   - `icon-maskable-512.png` → 512×512 px, con safe zone (ícono centrado en 70% del área)
3. Coloca los 3 archivos en `public/icons/`
4. Commit + push → Lovable redeploya

---

## Paso 3 — Generar el keystore (firma del APK)

```bash
cd twa/

keytool -genkeypair \
  -keystore android.keystore \
  -alias thespot-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "CN=The Spot, OU=Campus, O=Momentum Coaches, L=Mexico, ST=CDMX, C=MX"
# → Pedirá contraseña: guárdala en un lugar seguro (sin ella no puedes actualizar la app)
```

> ⚠️ El archivo `android.keystore` NUNCA debe subirse a GitHub.
> Ya está en `.gitignore` — verificar que así sea antes de hacer commit.

---

## Paso 4 — Obtener el SHA-256 del keystore

```bash
keytool -list -v -keystore android.keystore -alias thespot-key
# Busca la línea: SHA256: XX:XX:XX:...
# Copia ese fingerprint SIN los ':' separadores — solo los hex unidos por ':'
```

Ejemplo del formato correcto:
```
AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78
```

---

## Paso 5 — Actualizar assetlinks.json

Edita `public/.well-known/assetlinks.json`:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "app.thespot.campus",
      "sha256_cert_fingerprints": [
        "TU_SHA256_AQUI_CON_DOS_PUNTOS_SEPARANDO_CADA_BYTE"
      ]
    }
  }
]
```

Luego: commit + push → Lovable redeploya.

Verifica que el archivo sea accesible:
```bash
curl https://TU_DOMINIO/.well-known/assetlinks.json
```

---

## Paso 6 — Inicializar el proyecto TWA con Bubblewrap

```bash
cd twa/
bubblewrap init --manifest https://TU_DOMINIO/manifest.json
# Bubblewrap leerá el manifest.json y preguntará confirmaciones
# Responde con los valores del twa-manifest.json de este directorio
```

O con el manifest local preconfigurado:
```bash
bubblewrap init --manifest https://TU_DOMINIO/manifest.json \
  --directory ./android-project
```

---

## Paso 7 — Build del Android App Bundle (.aab)

```bash
cd twa/
bubblewrap build
# Genera: app-release-bundle.aab (para Google Play)
# También genera: app-release-signed.apk (para pruebas directas)
```

Si falla porque no encuentra el SDK de Android:
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
bubblewrap build
```

---

## Paso 8 — Verificar el TWA localmente

```bash
# Instalar el APK en un dispositivo/emulador conectado
adb install app-release-signed.apk

# La app se abre y debe mostrar The Spot SIN la barra de URL del navegador.
# Si muestra barra URL → el assetlinks.json tiene error o aún no propagó (esperar ~15 min)
```

Herramienta de diagnóstico digital asset links:
```
https://developers.google.com/digital-asset-links/tools/generator
```

---

## Paso 9 — Crear cuenta de desarrollador y publicar

1. **Google Play Console**: https://play.google.com/console
   - Costo único: $25 USD
   - Crear nueva app → seleccionar "App" (no juego)

2. **Configurar la ficha de Play Store**:

| Campo | Valor sugerido |
|---|---|
| Nombre | THE SPOT |
| Descripción corta | La red de voz de tu campus |
| Descripción larga | (ver abajo) |
| Categoría | Social |
| Clasificación de contenido | E (Everyone) |
| País/región | México (y expandir después) |

**Descripción larga sugerida:**
```
THE SPOT es la red social de voz diseñada para universitarios.

🎙️ Graba y comparte Drops de audio de lo que pasa en tu campus
🎧 Escucha Spotcasts — los podcasts hechos por estudiantes
🗺️ Descubre actividad universitaria en tiempo real en el mapa
💬 Mensajes de voz privados con compañeros de campus
📅 Eventos del campus — crea, asiste y comparte
🚨 Botón SOS con alerta a contactos de emergencia

Tu voz. Tu momento. Tu gente.
```

3. **Subir el .aab**:
   - Play Console → Production → Create new release
   - Subir `app-release-bundle.aab`
   - Versión: 1.0.0 (código: 1)

4. **Capturas de pantalla** (obligatorio antes de publicar):
   - Mínimo 2 capturas de teléfono (1080×1920 o 1440×2560)
   - Recomendado: Feed, Mapa, Perfil, DMs

---

## Paso 10 — Digital Asset Links en producción

Antes de enviar a revisión, Google verifica que:
1. `https://TU_DOMINIO/.well-known/assetlinks.json` sea accesible
2. El `package_name` coincida con el APK
3. El `sha256_cert_fingerprints` coincida con el keystore usado para firmar

Si la verificación falla, la app se abrirá como Custom Tab (con barra de URL) en lugar de TWA puro.

---

## Checklist Final Antes de Enviar a Revisión

- [ ] `public/manifest.json` desplegado y accesible en producción
- [ ] `public/.well-known/assetlinks.json` con SHA-256 correcto
- [ ] Íconos PNG (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`) en `/public/icons/`
- [ ] APK probado en dispositivo real: NO muestra barra de URL
- [ ] Capturas de pantalla listas (mínimo 2)
- [ ] Ficha de Play Store completa (descripción, categoría, clasificación de contenido)
- [ ] Política de privacidad en URL accesible: `https://TU_DOMINIO/privacy`
- [ ] Cuenta de Google Play Console activa ($25 USD)

---

## Comandos Rápidos de Referencia

```bash
# Instalar Bubblewrap
npm i -g @bubblewrap/cli

# Inicializar TWA desde manifest
bubblewrap init --manifest https://TU_DOMINIO/manifest.json

# Build APK + AAB
bubblewrap build

# Ver SHA-256 del keystore
keytool -list -v -keystore android.keystore -alias thespot-key | grep SHA256

# Instalar en dispositivo
adb install app-release-signed.apk

# Verificar asset links en vivo
curl https://TU_DOMINIO/.well-known/assetlinks.json
```

---

## Notas Importantes

- **El keystore es la llave maestra de la app.** Sin él no puedes publicar actualizaciones.
  Guardar backup en: Google Drive, Supabase Storage, o gestor de contraseñas.
- **El `package_name` (`app.thespot.campus`) no se puede cambiar** después de publicar la primera versión.
- **Actualizaciones futuras** solo requieren `bubblewrap build` + subir el nuevo `.aab` a Play Console.
- **No es necesario resubir a Play** cuando cambias el frontend (la app carga desde la URL en tiempo real).
  Solo debes subir nuevo APK si cambias: ícono, nombre, package, permisos Android, o targetSdkVersion.
