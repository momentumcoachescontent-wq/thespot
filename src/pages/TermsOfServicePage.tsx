import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";

const LAST_UPDATED = "17 de marzo de 2026";
const CONTACT_EMAIL = "legal@thespot.app";
const APP_NAME = "The Spot";
const APP_URL = "https://thespot.lovable.app";

const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section id={id} className="mb-10">
    <h2 className="font-bebas text-2xl tracking-widest text-spot-lime mb-3 uppercase">{title}</h2>
    <div className="space-y-3 text-sm text-white/80 leading-relaxed font-mono">{children}</div>
  </section>
);

const TermsOfServicePage = () => {
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
            <FileText size={18} className="text-spot-lime" />
            <span className="font-bebas text-xl tracking-widest uppercase">Condiciones del Servicio</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10">
        {/* Hero */}
        <div className="mb-10 rounded-2xl border border-spot-lime/20 bg-spot-lime/5 p-6">
          <h1 className="font-bebas text-4xl tracking-widest text-spot-lime uppercase mb-2">
            {APP_NAME} — Condiciones del Servicio
          </h1>
          <p className="font-mono text-xs text-white/50 uppercase tracking-widest">
            Última actualización: {LAST_UPDATED}
          </p>
          <p className="mt-3 text-sm text-white/70 font-mono">
            Estos Términos y Condiciones ("Términos") rigen el uso de la plataforma {APP_NAME} (la "Plataforma",
            "el Servicio"). Al registrarte o usar {APP_NAME} aceptas estos Términos en su totalidad. Si no estás
            de acuerdo, no uses el Servicio.
          </p>
        </div>

        {/* TOC */}
        <nav className="mb-10 rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Contenido</p>
          <ol className="space-y-1 font-mono text-xs text-white/60 columns-2">
            {[
              ["1", "elegibilidad", "Elegibilidad"],
              ["2", "cuenta", "Tu cuenta"],
              ["3", "servicio", "Descripción del servicio"],
              ["4", "conducta", "Reglas de conducta"],
              ["5", "contenido", "Contenido del usuario"],
              ["6", "sos", "Spot Alert (SOS)"],
              ["7", "premium", "Suscripción Spot+"],
              ["8", "propiedad", "Propiedad intelectual"],
              ["9", "suspension", "Suspensión y terminación"],
              ["10", "limitacion", "Limitación de responsabilidad"],
              ["11", "modificaciones", "Modificaciones"],
              ["12", "ley", "Ley aplicable"],
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
        <Section id="elegibilidad" title="1. Elegibilidad">
          <p>Para usar {APP_NAME} debes:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Tener <strong className="text-white">18 años o más</strong></li>
            <li>Ser estudiante, docente o personal activo de una institución educativa con correo institucional válido (.edu / .edu.mx)</li>
            <li>No haber sido previamente suspendido o baneado de la Plataforma</li>
            <li>Cumplir con las leyes aplicables en tu jurisdicción</li>
          </ul>
          <p className="mt-2 text-white/50 text-xs">
            Al registrarte declaras que cumples con estos requisitos. Nos reservamos el derecho de verificar
            la elegibilidad y suspender cuentas que no la cumplan.
          </p>
        </Section>

        {/* 2 */}
        <Section id="cuenta" title="2. Tu Cuenta">
          <p>
            Eres responsable de mantener la seguridad de tu cuenta y de todas las actividades que ocurran
            bajo ella. Específicamente:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>No compartas tu código OTP o sesión activa con terceros</li>
            <li>Notifícanos de inmediato ante cualquier uso no autorizado de tu cuenta a <a href={`mailto:${CONTACT_EMAIL}`} className="text-spot-lime">{CONTACT_EMAIL}</a></li>
            <li>El nombre de usuario (seudónimo) debe ser apropiado y no suplantar la identidad de otra persona</li>
            <li>Puedes tener únicamente <strong className="text-white">una cuenta activa</strong> por correo institucional</li>
          </ul>
        </Section>

        {/* 3 */}
        <Section id="servicio" title="3. Descripción del Servicio">
          <p>{APP_NAME} es una red social de audio efímero para comunidades universitarias que incluye:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong className="text-white">Drops:</strong> grabaciones de audio de hasta 60 segundos con expiración automática (15 min gratuito / hasta 24h en Spot+)</li>
            <li><strong className="text-white">Spots:</strong> micro-comunidades geolocalizadas por campus, edificio o evento</li>
            <li><strong className="text-white">Reacciones de Voz:</strong> respuestas de audio de hasta 3 segundos a Drops</li>
            <li><strong className="text-white">Spot Alert (SOS):</strong> sistema de alerta de emergencia con notificaciones WhatsApp a contactos de confianza</li>
            <li><strong className="text-white">Eventos:</strong> publicación y RSVP de eventos del campus</li>
            <li><strong className="text-white">Mood Check-in:</strong> registro anónimo de estado de ánimo diario</li>
            <li><strong className="text-white">Spotcasts:</strong> mini-podcasts de contenido premium (Spot+)</li>
          </ul>
          <p className="mt-3 text-white/50 text-xs">
            El Servicio se ofrece "tal cual" (as-is). Podemos modificar, suspender o discontinuar funciones
            con previo aviso de 30 días, excepto en casos de urgencia de seguridad.
          </p>
        </Section>

        {/* 4 */}
        <Section id="conducta" title="4. Reglas de Conducta">
          <p>
            Al usar {APP_NAME} te comprometes a <strong className="text-white">NO</strong> publicar,
            transmitir ni facilitar contenido que:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>Sea violento, amenazante, acosador, difamatorio o que incite al odio</li>
            <li>Contenga lenguaje discriminatorio por raza, género, orientación sexual, religión, origen étnico o discapacidad</li>
            <li>Constituya acoso sexual o violencia de género digital (en cumplimiento con la <strong className="text-white">Ley Olympia</strong>)</li>
            <li>Comparta información privada de terceros sin su consentimiento (doxing)</li>
            <li>Sea spam, publicidad no solicitada o contenido repetitivo masivo</li>
            <li>Infrinja derechos de autor, marcas registradas u otros derechos de propiedad intelectual</li>
            <li>Contenga malware, phishing o enlaces maliciosos</li>
            <li>Represente o facilite actividades ilegales</li>
            <li>Sea generado para manipular el sistema de moderación de IA</li>
          </ul>
          <div className="mt-4 rounded-lg border border-spot-red/20 bg-spot-red/5 p-3">
            <p className="font-mono text-xs text-white/70">
              <strong className="text-spot-red">Tolerancia cero:</strong> El acoso, la violencia de género
              digital y el uso indebido del SOS resultarán en baneo permanente inmediato y notificación a
              las autoridades y/o la institución educativa correspondiente.
            </p>
          </div>
        </Section>

        {/* 5 */}
        <Section id="contenido" title="5. Contenido del Usuario">
          <p>
            <strong className="text-white">Propiedad:</strong> Conservas todos los derechos sobre el
            contenido que publicas (grabaciones de voz, textos, etc.).
          </p>
          <p>
            <strong className="text-white">Licencia que nos otorgas:</strong> Al publicar contenido en
            {APP_NAME} nos otorgas una licencia limitada, no exclusiva, libre de regalías y mundial para
            almacenar, transmitir y mostrar dicho contenido exclusivamente dentro de la Plataforma durante
            su período de vida (TTL). Esta licencia expira automáticamente cuando el contenido es eliminado
            o expira su TTL.
          </p>
          <p>
            <strong className="text-white">Moderación:</strong> Nos reservamos el derecho de silenciar o
            eliminar contenido que viole estas reglas, sin previo aviso y sin responsabilidad.
            Los usuarios pueden reportar contenido inapropiado desde la app.
          </p>
          <p>
            <strong className="text-white">Reportes:</strong> Los usuarios pueden reportar contenido
            inapropiado. Tres reportes válidos activan el silenciamiento automático pendiente de revisión.
          </p>
        </Section>

        {/* 6 */}
        <Section id="sos" title="6. Spot Alert (SOS) — Uso Responsable">
          <p>
            El sistema Spot Alert es una función de seguridad crítica. Su uso está sujeto a las
            siguientes condiciones:
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>
              <strong className="text-white">Uso genuino:</strong> El SOS debe activarse únicamente en
              situaciones de emergencia real donde sientas que tu seguridad o la de otros está en riesgo.
            </li>
            <li>
              <strong className="text-white">Falsas alarmas:</strong> El modal de confirmación existe
              para prevenir activaciones accidentales. El uso deliberado para enviar falsas alarmas
              constituye una violación grave de estos Términos.
            </li>
            <li>
              <strong className="text-white">Consentimiento de contactos:</strong> Eres responsable de
              obtener el consentimiento de las personas que registres como contactos de confianza para
              recibir mensajes de alerta vía WhatsApp.
            </li>
            <li>
              <strong className="text-white">Limitación:</strong> {APP_NAME} no es un servicio de
              emergencias oficial. En situaciones de peligro inmediato llama siempre al{" "}
              <strong className="text-white">911</strong>. El SOS es un complemento, no un sustituto.
            </li>
          </ul>
          <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="font-mono text-xs text-amber-400/80">
              ⚠️ {APP_NAME} no garantiza la entrega de mensajes WhatsApp ni la respuesta de contactos.
              No nos hacemos responsables por fallas en la entrega de alertas SOS causadas por problemas
              de conectividad, servicios de terceros (Meta/WhatsApp) o datos de contacto incorrectos.
            </p>
          </div>
        </Section>

        {/* 7 */}
        <Section id="premium" title="7. Suscripción Spot+">
          <p>
            <strong className="text-white">Spot+</strong> es el nivel de suscripción premium que otorga
            acceso a funciones adicionales como Drops extendidos (hasta 15 min / TTL prolongado),
            Spotcasts, DMs ilimitados y badge VIP en el perfil.
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Los precios se muestran en la app al momento de suscribirse</li>
            <li>Los pagos se procesan a través de Stripe u otras plataformas certificadas PCI-DSS</li>
            <li>Las suscripciones se renuevan automáticamente hasta que las canceles</li>
            <li>Puedes cancelar en cualquier momento; el acceso premium se mantiene hasta el fin del período pagado</li>
            <li>No ofrecemos reembolsos por períodos parciales, salvo requerimiento legal aplicable</li>
          </ul>
        </Section>

        {/* 8 */}
        <Section id="propiedad" title="8. Propiedad Intelectual">
          <p>
            Todos los elementos de {APP_NAME} que no sean contenido de usuarios (diseño, marca, código,
            logotipos, nombre "The Spot", "Drops", "Spot Alert") son propiedad exclusiva de la Plataforma
            y están protegidos por leyes de propiedad intelectual.
          </p>
          <p>
            No puedes copiar, reproducir, distribuir, modificar, crear obras derivadas, mostrar públicamente
            ni explotar comercialmente ningún elemento de la Plataforma sin autorización escrita previa.
          </p>
        </Section>

        {/* 9 */}
        <Section id="suspension" title="9. Suspensión y Terminación">
          <p>Podemos suspender o terminar tu acceso a {APP_NAME} si:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Violas estos Términos o la Política de Privacidad</li>
            <li>Tu cuenta acumula 3 o más reportes validados por moderación</li>
            <li>Usas el SOS de forma deliberadamente falsa</li>
            <li>Realizas actividades que pongan en riesgo la seguridad de otros usuarios</li>
            <li>Tu correo institucional deja de ser válido (graduación, baja académica)</li>
          </ul>
          <p className="mt-2">
            Puedes eliminar tu cuenta en cualquier momento desde la sección de Perfil. La eliminación es
            permanente e irreversible. Consulta nuestra{" "}
            <a href="/data-deletion" className="text-spot-lime underline">
              página de eliminación de datos
            </a>{" "}
            para el proceso completo.
          </p>
        </Section>

        {/* 10 */}
        <Section id="limitacion" title="10. Limitación de Responsabilidad">
          <p>
            En la máxima medida permitida por la ley aplicable, {APP_NAME} y sus operadores no serán
            responsables por:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2 text-white/70">
            <li>Daños indirectos, incidentales, especiales o consecuentes derivados del uso o incapacidad de uso del Servicio</li>
            <li>Contenido publicado por usuarios que viole derechos de terceros</li>
            <li>Pérdida de datos debido a la naturaleza efímera del contenido (TTL expirado)</li>
            <li>Fallos en la entrega de alertas SOS por causas ajenas a nuestro control (conectividad, servicios de Meta)</li>
            <li>Acciones u omisiones de contactos de confianza ante una alerta SOS</li>
          </ul>
          <p className="mt-2 text-white/50 text-xs">
            Nuestros servicios se proporcionan "tal cual" sin garantías expresas ni implícitas de disponibilidad
            continua, ausencia de errores o adecuación a un propósito particular.
          </p>
        </Section>

        {/* 11 */}
        <Section id="modificaciones" title="11. Modificaciones a los Términos">
          <p>
            Podemos modificar estos Términos en cualquier momento. Cuando realicemos cambios sustanciales,
            te notificaremos dentro de la aplicación con al menos{" "}
            <strong className="text-white">15 días de anticipación</strong>. El uso continuado del Servicio
            después de dicho aviso constituye aceptación de los Términos actualizados.
          </p>
        </Section>

        {/* 12 */}
        <Section id="ley" title="12. Ley Aplicable y Jurisdicción">
          <p>
            Estos Términos se rigen por las leyes de los <strong className="text-white">Estados Unidos Mexicanos</strong>.
            Cualquier disputa derivada de estos Términos se resolverá preferentemente mediante negociación
            directa. En caso de no llegar a un acuerdo, las partes se someten a la jurisdicción de los
            tribunales competentes de la Ciudad de México, renunciando a cualquier otro fuero que pudiera
            corresponderles.
          </p>
        </Section>

        {/* 13 */}
        <Section id="contacto" title="13. Contacto">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
            <p className="font-mono text-xs text-white/80">
              <strong className="text-white">Correo legal:</strong>{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-spot-lime">{CONTACT_EMAIL}</a>
            </p>
            <p className="font-mono text-xs text-white/80">
              <strong className="text-white">Privacidad y datos:</strong>{" "}
              <a href="/privacy" className="text-spot-lime">thespot.lovable.app/privacy</a>
            </p>
            <p className="font-mono text-xs text-white/80">
              <strong className="text-white">Eliminación de datos:</strong>{" "}
              <a href="/data-deletion" className="text-spot-lime">thespot.lovable.app/data-deletion</a>
            </p>
          </div>
        </Section>

        {/* Footer */}
        <div className="mt-10 border-t border-white/10 pt-6 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {APP_NAME} — Condiciones del Servicio v1.0 · {LAST_UPDATED}
          </p>
          <div className="mt-4 flex items-center justify-center gap-4 font-mono text-[9px] text-muted-foreground/50">
            <a href="/privacy" className="hover:text-spot-lime transition-colors">Política de Privacidad</a>
            <span>·</span>
            <a href="/data-deletion" className="hover:text-spot-lime transition-colors">Eliminación de Datos</a>
          </div>
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

export default TermsOfServicePage;
