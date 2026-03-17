import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";

const LAST_UPDATED = "17 de marzo de 2026";
const CONTACT_EMAIL = "privacidad@thespot.app";
const APP_NAME = "The Spot";

const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section id={id} className="mb-10">
    <h2 className="font-bebas text-2xl tracking-widest text-spot-lime mb-3 uppercase">{title}</h2>
    <div className="space-y-3 text-sm text-white/80 leading-relaxed font-mono">{children}</div>
  </section>
);

const Sub = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mt-4">
    <h3 className="font-bebas text-lg tracking-wider text-white/90 mb-1 uppercase">{title}</h3>
    <div className="space-y-2 text-white/70">{children}</div>
  </div>
);

const PrivacyPolicyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-background/90 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-spot-lime" />
            <span className="font-bebas text-xl tracking-widest uppercase">Política de Privacidad</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10">
        {/* Hero */}
        <div className="mb-10 rounded-2xl border border-spot-lime/20 bg-spot-lime/5 p-6">
          <h1 className="font-bebas text-4xl tracking-widest text-spot-lime uppercase mb-2">
            {APP_NAME} — Aviso de Privacidad
          </h1>
          <p className="font-mono text-xs text-white/50 uppercase tracking-widest">
            Última actualización: {LAST_UPDATED}
          </p>
          <p className="mt-3 text-sm text-white/70 font-mono">
            En The Spot nos tomamos tu privacidad muy en serio. Esta política explica qué datos recopilamos,
            cómo los usamos y tus derechos sobre ellos, en cumplimiento con la{" "}
            <strong className="text-white">Ley Federal de Protección de Datos Personales en Posesión de Particulares (LFPDPPP)</strong>,
            la <strong className="text-white">Ley Olympia</strong>, el <strong className="text-white">RGPD/GDPR</strong>,
            las políticas de <strong className="text-white">Google Play</strong> y los requisitos de{" "}
            <strong className="text-white">Meta Business (WhatsApp Cloud API)</strong>.
          </p>
        </div>

        {/* TOC */}
        <nav className="mb-10 rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Contenido</p>
          <ol className="space-y-1 font-mono text-xs text-white/60">
            {[
              ["1", "responsable", "Responsable del tratamiento"],
              ["2", "datos", "Datos que recopilamos"],
              ["3", "finalidades", "Finalidades del tratamiento"],
              ["4", "terceros", "Transferencia a terceros"],
              ["5", "retencion", "Retención y eliminación"],
              ["6", "seguridad", "Seguridad"],
              ["7", "menores", "Menores de edad"],
              ["8", "arco", "Derechos ARCO"],
              ["9", "whatsapp", "WhatsApp y Meta Business"],
              ["10", "google", "Cumplimiento Google Play"],
              ["11", "cookies", "Almacenamiento local"],
              ["12", "cambios", "Cambios a esta política"],
              ["13", "contacto", "Contacto"],
            ].map(([num, id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="hover:text-spot-lime transition-colors">
                  {num}. {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* 1 */}
        <Section id="responsable" title="1. Responsable del Tratamiento">
          <p>
            <strong className="text-white">The Spot</strong> (en adelante "la Plataforma", "nosotros") es responsable
            del tratamiento de tus datos personales. Para cualquier consulta relacionada con privacidad, puedes
            contactarnos en: <a href={`mailto:${CONTACT_EMAIL}`} className="text-spot-lime underline">{CONTACT_EMAIL}</a>.
          </p>
        </Section>

        {/* 2 */}
        <Section id="datos" title="2. Datos que Recopilamos">
          <Sub title="2.1 Datos de cuenta">
            <p>
              <strong className="text-white">Correo electrónico institucional (.edu / .edu.mx):</strong> utilizado
              exclusivamente para autenticación vía OTP. No usamos contraseñas. Verificamos que pertenezca a una
              institución educativa reconocida.
            </p>
          </Sub>
          <Sub title="2.2 Datos de perfil">
            <ul className="list-disc pl-5 space-y-1">
              <li>Nombre de usuario (seudónimo, no nombre real obligatorio)</li>
              <li>Nombre completo (opcional, para onboarding)</li>
              <li>Número de teléfono (requerido para recibir alertas SOS vía WhatsApp)</li>
              <li>Institución educativa (detectada automáticamente por dominio de correo)</li>
              <li>Avatar emoji (seleccionado por el usuario)</li>
            </ul>
          </Sub>
          <Sub title="2.3 Grabaciones de audio (Drops y Reacciones de Voz)">
            <p>
              Grabamos y almacenamos temporalmente archivos de audio que tú creas ("Drops" de hasta 60 segundos
              y "Reacciones de Voz" de hasta 3 segundos). Estos audios:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Se almacenan cifrados en Supabase Storage (AES-256)</li>
              <li>Son efímeros: se eliminan automáticamente al expirar su TTL (5 minutos para usuarios gratuitos)</li>
            </ul>
          </Sub>
          <Sub title="2.4 Ubicación geográfica (GPS)">
            <p>
              Solicitamos acceso a tu ubicación en dos contextos:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                <strong className="text-white">Al publicar un Drop:</strong> asocia tu audio al Spot
                (comunidad) más cercano de tu campus. Las coordenadas exactas no son visibles para otros usuarios.
              </li>
              <li>
                <strong className="text-white">Al activar Spot Alert (SOS):</strong> tu ubicación GPS se
                comparte únicamente con tus contactos de confianza pre-configurados y se registra en el incidente.
                Se procesa al confirmar la alerta en el modal de confirmación.
              </li>
            </ul>
            <p className="mt-2 text-white/50 text-xs">
              La ubicación NUNCA se comparte con terceros ni se vende. Puedes denegar el permiso de ubicación;
              en ese caso el Drop se asociará al campus general y el SOS no incluirá coordenadas.
            </p>
          </Sub>
          <Sub title="2.5 Contactos de confianza (SOS)">
            <p>
              Puedes registrar hasta 5 contactos de confianza (nombre, número de teléfono, categoría: Spot o emergencia) para el
              sistema de alertas SOS. Estos datos:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Se almacenan en nuestra base de datos con acceso restringido solo a tu cuenta</li>
              <li>Se usan exclusivamente para enviar mensajes WhatsApp de emergencia cuando activas el SOS</li>
              <li>No se comparten con ningún otro fin</li>
              <li>Puedes eliminarlos en cualquier momento desde tu perfil</li>
            </ul>
          </Sub>
          <Sub title="2.6 Datos de uso y analítica">
            <ul className="list-disc pl-5 space-y-1">
              <li>Número de Drops creados y escuchados (para rankings anonimizados)</li>
              <li>Reacciones emoji registradas</li>
              <li>Asistencia a eventos del campus</li>
              <li>Estado de ánimo del check-in diario (Mood, agrupado por Spot)</li>
            </ul>
            <p className="mt-2 text-white/50 text-xs">
              Estos datos se usan para generar estadísticas de bienestar estudiantil a nivel de campus
              (Spot Pulse). Los reportes institucionales son siempre anonimizados y agregados.
            </p>
          </Sub>
          <Sub title="2.7 Datos técnicos">
            <ul className="list-disc pl-5 space-y-1">
              <li>Dirección IP (gestionada por Supabase Auth; no la almacenamos directamente)</li>
              <li>User-Agent del navegador (estándar de autenticación)</li>
              <li>PIN de cancelación SOS (almacenado localmente en tu dispositivo, no en nuestros servidores)</li>
            </ul>
          </Sub>
        </Section>

        {/* 3 */}
        <Section id="finalidades" title="3. Finalidades del Tratamiento">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="py-2 pr-4 text-left text-spot-lime font-bebas tracking-wider text-sm">Dato</th>
                  <th className="py-2 pr-4 text-left text-spot-lime font-bebas tracking-wider text-sm">Finalidad</th>
                  <th className="py-2 text-left text-spot-lime font-bebas tracking-wider text-sm">Base legal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {[
                  ["Correo electrónico", "Autenticación y verificación de pertenencia a institución educativa", "Ejecución del contrato"],
                  ["Número de teléfono", "Recibir alertas SOS vía WhatsApp; identificación en perfil", "Consentimiento explícito"],
                  ["Grabaciones de audio", "Publicación efímera en feed del Spot", "Ejecución del contrato"],
                  ["Ubicación GPS", "Asociar Drops al campus; enviar ubicación en emergencias SOS", "Consentimiento explícito"],
                  ["Contactos de confianza", "Notificaciones WhatsApp en caso de alerta SOS confirmada", "Consentimiento explícito"],
                  ["Check-in emocional", "Generación de índices de bienestar estudiantil anonimizados", "Consentimiento (opt-in)"],
                ].map(([dato, finalidad, base]) => (
                  <tr key={dato}>
                    <td className="py-2 pr-4 text-white/80 align-top">{dato}</td>
                    <td className="py-2 pr-4 text-white/60 align-top">{finalidad}</td>
                    <td className="py-2 text-white/50 align-top">{base}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* 4 */}
        <Section id="terceros" title="4. Transferencia a Terceros">
          <p>No vendemos tus datos personales. Compartimos datos únicamente con los siguientes proveedores de servicios bajo contratos de confidencialidad:</p>
          <div className="mt-4 space-y-3">
            {[
              {
                name: "Supabase Inc.",
                role: "Base de datos, autenticación, almacenamiento de audio",
                country: "EUA",
                policy: "https://supabase.com/privacy",
              },
              {
                name: "Meta Platforms Inc. (WhatsApp Cloud API)",
                role: "Envío de mensajes WhatsApp de emergencia a contactos de confianza cuando se activa Spot Alert SOS",
                country: "EUA / Irlanda (UE)",
                policy: "https://www.whatsapp.com/legal/privacy-policy",
              },
              {
                name: "n8n GmbH (instancia self-hosted)",
                role: "Automatización de flujos internos (limpieza de contenido expirado). Self-hosted en infraestructura propia. No procesa datos personales de usuarios finales.",
                country: "México (servidor propio)",
                policy: null,
              },
            ].map((p) => (
              <div key={p.name} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="flex items-start justify-between gap-2">
                  <strong className="text-white text-xs">{p.name}</strong>
                  <span className="shrink-0 font-mono text-[9px] text-muted-foreground border border-white/10 rounded px-1.5 py-0.5">{p.country}</span>
                </div>
                <p className="mt-1 text-[11px] text-white/60">{p.role}</p>
                {p.policy && (
                  <a href={p.policy} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block font-mono text-[9px] text-spot-lime/70 hover:text-spot-lime transition-colors">
                    Ver política de privacidad →
                  </a>
                )}
              </div>
            ))}
          </div>
          <p className="mt-4 text-white/50 text-xs">
            Cuando se transfieren datos a EUA, nos aseguramos de que los proveedores cumplan con mecanismos
            adecuados de transferencia internacional (Cláusulas Contractuales Estándar o marcos equivalentes).
          </p>
        </Section>

        {/* 5 */}
        <Section id="retencion" title="5. Retención y Eliminación de Datos">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="py-2 pr-4 text-left text-spot-lime font-bebas tracking-wider text-sm">Tipo de dato</th>
                  <th className="py-2 text-left text-spot-lime font-bebas tracking-wider text-sm">Período de retención</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {[
                  ["Drops de audio (usuarios gratuitos)", "15 minutos (TTL automático)"],
                  ["Drops de audio (usuarios Spot+)", "Hasta 24 horas (TTL configurable)"],
                  ["Reacciones de voz", "Mismo TTL que el Drop padre"],
                  ["Perfil de usuario", "Hasta que elimines tu cuenta"],
                  ["Contactos de confianza SOS", "Hasta que los elimines manualmente o elimines la cuenta"],
                  ["Incidentes SOS (metadatos)", "30 días desde la creación del incidente"],
                  ["Historial de Drops (para rankings)", "Permanente (solo metadatos: autor, duración, fecha — sin audio)"],
                  ["Check-ins emocionales agregados", "90 días (datos anonimizados)"],
                ].map(([tipo, periodo]) => (
                  <tr key={tipo}>
                    <td className="py-2 pr-4 text-white/80 align-top">{tipo}</td>
                    <td className="py-2 text-white/60 align-top">{periodo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-white/50 text-xs">
            Puedes solicitar la eliminación anticipada de cualquier dato enviando un correo a{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-spot-lime">{CONTACT_EMAIL}</a>.
            Atendemos solicitudes en un plazo máximo de 20 días hábiles.
          </p>
        </Section>

        {/* 6 */}
        <Section id="seguridad" title="6. Seguridad">
          <ul className="list-disc pl-5 space-y-2">
            <li>Almacenamiento de audio cifrado con <strong className="text-white">AES-256</strong> en Supabase Storage</li>
            <li>Comunicaciones protegidas con <strong className="text-white">TLS/HTTPS</strong> en tránsito</li>
            <li>Políticas de <strong className="text-white">Row Level Security (RLS)</strong> en base de datos: cada usuario solo accede a sus propios datos y a los Drops de los Spots a los que pertenece</li>
            <li>Ubicación GPS solo se transmite en eventos SOS confirmados mediante modal de confirmación</li>
            <li>Acceso administrativo restringido con roles diferenciados</li>
          </ul>
          <p className="mt-3 text-white/50 text-xs">
            Si detectas una vulnerabilidad de seguridad, repórtala de forma responsable a{" "}
            <a href="mailto:seguridad@thespot.app" className="text-spot-lime">seguridad@thespot.app</a>.
          </p>
        </Section>

        {/* 7 */}
        <Section id="menores" title="7. Menores de Edad">
          <p>
            The Spot está diseñado para estudiantes universitarios. Al requerir un correo institucional
            (.edu / .edu.mx), asumimos que los usuarios tienen 18 años o más.{" "}
            <strong className="text-white">No recopilamos intencionalmente datos de menores de 18 años.</strong>
          </p>
          <p>
            Si eres padre, madre o tutor y crees que un menor ha creado una cuenta, contáctanos en{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-spot-lime">{CONTACT_EMAIL}</a> y
            eliminaremos la cuenta de inmediato.
          </p>
        </Section>

        {/* 8 */}
        <Section id="arco" title="8. Derechos ARCO (Acceso, Rectificación, Cancelación, Oposición)">
          <p>
            Conforme a la <strong className="text-white">LFPDPPP</strong> y al <strong className="text-white">RGPD</strong>,
            tienes derecho a:
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li><strong className="text-white">Acceso:</strong> conocer qué datos personales tenemos sobre ti</li>
            <li><strong className="text-white">Rectificación:</strong> corregir datos inexactos o incompletos</li>
            <li><strong className="text-white">Cancelación / Supresión:</strong> eliminar tus datos ("derecho al olvido")</li>
            <li><strong className="text-white">Oposición:</strong> oponerte al tratamiento para finalidades específicas</li>
            <li><strong className="text-white">Portabilidad:</strong> recibir tus datos en formato estructurado (CSV/JSON)</li>
            <li><strong className="text-white">Revocación del consentimiento:</strong> puedes revocar en cualquier momento sin efecto retroactivo</li>
          </ul>
          <div className="mt-4 rounded-lg border border-spot-lime/20 bg-spot-lime/5 p-4">
            <p className="font-mono text-xs text-white/70">
              Para ejercer tus derechos envía un correo a{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-spot-lime font-bold">{CONTACT_EMAIL}</a>{" "}
              con asunto "Solicitud ARCO" e incluye: nombre de usuario, correo registrado y descripción de la
              solicitud. Respondemos en un máximo de <strong className="text-white">20 días hábiles</strong>.
            </p>
          </div>
          <p className="mt-3 text-white/50 text-xs">
            También puedes eliminar tu cuenta y todos tus datos directamente desde la sección de Perfil de la aplicación.
          </p>
        </Section>

        {/* 9 */}
        <Section id="whatsapp" title="9. WhatsApp y Meta Business API">
          <p>
            Utilizamos la <strong className="text-white">WhatsApp Cloud API de Meta</strong> exclusivamente
            para enviar mensajes de emergencia cuando activas Spot Alert (SOS). Al configurar el Spot Alert aceptas:
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>
              Los mensajes de alerta se enviarán a los números telefónicos que registres como contactos de confianza,
              que deben ser personas que han dado su consentimiento para recibirlos.
            </li>
            <li>
              Eres responsable de obtener el consentimiento de tus contactos para recibir mensajes de alerta de emergencia.
            </li>
            <li>
              Los mensajes incluyen: tu nombre de usuario, hora del incidente y enlace de ubicación en Google Maps
              (si el GPS está disponible).
            </li>
            <li>
              Meta puede retener los metadatos de mensajes según su propia política de privacidad, disponible en{" "}
              <a href="https://www.whatsapp.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer"
                className="text-spot-lime">whatsapp.com/legal/privacy-policy</a>.
            </li>
            <li>
              <strong className="text-white">No enviamos mensajes de marketing ni publicidad por WhatsApp.</strong>{" "}
              El único caso de uso es la alerta SOS de emergencia.
            </li>
          </ul>
          <div className="mt-4 rounded-lg border border-spot-red/20 bg-spot-red/5 p-4">
            <p className="font-mono text-xs text-white/70">
              <strong className="text-spot-red">Uso indebido del SOS:</strong> El uso deliberado del botón SOS
              para enviar falsas alarmas constituye una violación de estos términos y puede resultar en la
              suspensión permanente de la cuenta y notificación a la institución educativa correspondiente.
            </p>
          </div>
        </Section>

        {/* 10 */}
        <Section id="google" title="10. Cumplimiento Google Play">
          <p>
            En cumplimiento con las políticas del programa para desarrolladores de Google Play:
          </p>
          <Sub title="Permisos solicitados">
            <ul className="list-disc pl-5 space-y-1 text-white/70">
              <li>
                <strong className="text-white">RECORD_AUDIO / Micrófono:</strong> requerido para grabar
                Drops de audio y Reacciones de Voz. Solo se activa cuando el usuario inicia explícitamente
                una grabación.
              </li>
              <li>
                <strong className="text-white">ACCESS_FINE_LOCATION / Ubicación precisa:</strong> requerido
                para asociar Drops al campus y para compartir ubicación en emergencias SOS. Se solicita
                solo cuando el usuario crea un Drop o activa el SOS.
              </li>
            </ul>
          </Sub>
          <Sub title="Datos sensibles">
            <p>
              The Spot recopila datos de audio (grabaciones de voz) que se clasifican como datos sensibles
              bajo las políticas de Google Play. Estos datos:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2 text-white/70">
              <li>Se usan exclusivamente para las funciones descritas en esta política</li>
              <li>No se venden a terceros</li>
              <li>No se usan para publicidad personalizada</li>
              <li>Se eliminan automáticamente conforme a los TTL definidos</li>
            </ul>
          </Sub>
          <Sub title="Sección de seguridad de datos (Google Play Data Safety)">
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="py-2 pr-4 text-left text-white/80 font-mono">Tipo de dato</th>
                    <th className="py-2 pr-2 text-left text-white/80 font-mono">¿Se recopila?</th>
                    <th className="py-2 pr-2 text-left text-white/80 font-mono">¿Se comparte?</th>
                    <th className="py-2 text-left text-white/80 font-mono">Propósito</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-white/60">
                  {[
                    ["Correo electrónico", "Sí", "No", "Autenticación"],
                    ["Número de teléfono", "Sí", "Meta (solo SOS)", "Alertas emergencia"],
                    ["Grabaciones de voz", "Sí (temporal)", "OpenAI (moderación)", "Funcionalidad principal"],
                    ["Ubicación precisa", "Sí (bajo demanda)", "Contactos SOS únicamente", "Campus + emergencias"],
                    ["Fotos/videos", "No", "—", "—"],
                    ["Contactos del dispositivo", "No", "—", "—"],
                    ["Datos financieros", "No", "—", "—"],
                  ].map(([tipo, recopila, comparte, prop]) => (
                    <tr key={tipo}>
                      <td className="py-1.5 pr-4">{tipo}</td>
                      <td className={`py-1.5 pr-2 font-mono ${recopila === "No" ? "text-white/30" : "text-spot-lime"}`}>{recopila}</td>
                      <td className="py-1.5 pr-2">{comparte}</td>
                      <td className="py-1.5">{prop}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Sub>
        </Section>

        {/* 11 */}
        <Section id="cookies" title="11. Almacenamiento Local (Cookies / LocalStorage)">
          <p>No utilizamos cookies de seguimiento ni publicidad. Usamos almacenamiento local del navegador únicamente para:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>
              <strong className="text-white">Sesión de autenticación</strong>: token JWT de Supabase para mantener tu sesión activa. Se elimina al cerrar sesión.
            </li>
            <li>
              <strong className="text-white">Preferencias de la app</strong>: configuración local de UI. No contiene datos personales.
            </li>
          </ul>
        </Section>

        {/* 12 */}
        <Section id="cambios" title="12. Cambios a Esta Política">
          <p>
            Podemos actualizar esta política periódicamente. Cuando realicemos cambios sustanciales,
            te notificaremos dentro de la aplicación y actualizaremos la fecha de "Última actualización"
            al inicio de este documento. El uso continuado de The Spot tras los cambios constituye
            aceptación de la política actualizada.
          </p>
        </Section>

        {/* 13 */}
        <Section id="contacto" title="13. Contacto">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
            <p className="font-mono text-xs text-white/80">
              <strong className="text-white">Correo de privacidad:</strong>{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-spot-lime">{CONTACT_EMAIL}</a>
            </p>
            <p className="font-mono text-xs text-white/80">
              <strong className="text-white">Correo de seguridad:</strong>{" "}
              <a href="mailto:seguridad@thespot.app" className="text-spot-lime">seguridad@thespot.app</a>
            </p>
            <p className="font-mono text-xs text-white/80">
              <strong className="text-white">Tiempo de respuesta:</strong> máximo 20 días hábiles para solicitudes ARCO
            </p>
            <p className="font-mono text-xs text-white/50 mt-2">
              Si no recibes respuesta en el plazo indicado, tienes derecho a presentar una queja ante el
              Instituto Nacional de Transparencia, Acceso a la Información y Protección de Datos Personales
              (INAI) en México: <span className="text-white/70">www.inai.org.mx</span>
            </p>
          </div>
        </Section>

        {/* Footer */}
        <div className="mt-10 border-t border-white/10 pt-6 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {APP_NAME} — Aviso de Privacidad v2.0 · {LAST_UPDATED}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 flex items-center gap-2 mx-auto font-mono text-xs text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowLeft size={12} /> Volver a la app
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
