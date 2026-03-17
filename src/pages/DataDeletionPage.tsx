import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, Mail, User, AlertTriangle, CheckCircle2 } from "lucide-react";

const LAST_UPDATED = "17 de marzo de 2026";
const DELETION_EMAIL = "privacidad@thespot.app";
const APP_NAME = "The Spot";

const Step = ({
  number,
  title,
  children,
  icon: Icon,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
  icon: React.ElementType;
}) => (
  <div className="flex gap-4">
    <div className="flex flex-col items-center">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-spot-lime text-black font-bebas text-lg">
        {number}
      </div>
      <div className="mt-2 w-px flex-1 bg-white/10" />
    </div>
    <div className="pb-8 flex-1">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className="text-spot-lime" />
        <h3 className="font-bebas text-lg tracking-wider text-white uppercase">{title}</h3>
      </div>
      <div className="font-mono text-sm text-white/70 space-y-2">{children}</div>
    </div>
  </div>
);

const DataDeletionPage = () => {
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
            <Trash2 size={18} className="text-spot-red" />
            <span className="font-bebas text-xl tracking-widest uppercase">Eliminación de Datos</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10">
        {/* Hero */}
        <div className="mb-10 rounded-2xl border border-spot-red/20 bg-spot-red/5 p-6">
          <h1 className="font-bebas text-4xl tracking-widest text-white uppercase mb-2">
            Solicitar Eliminación de Datos
          </h1>
          <p className="font-mono text-xs text-white/50 uppercase tracking-widest mb-3">
            Última actualización: {LAST_UPDATED}
          </p>
          <p className="text-sm text-white/70 font-mono">
            En {APP_NAME} respetamos tu derecho al olvido. Puedes eliminar tu cuenta y todos tus datos
            asociados en cualquier momento, ya sea directamente desde la aplicación o enviando una
            solicitud por correo. Este proceso cumple con la{" "}
            <strong className="text-white">LFPDPPP</strong>,{" "}
            <strong className="text-white">GDPR</strong> y los requisitos de{" "}
            <strong className="text-white">Meta Business</strong> y{" "}
            <strong className="text-white">Google Play</strong>.
          </p>
        </div>

        {/* Qué se elimina */}
        <div className="mb-10 rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="font-bebas text-xl tracking-widest text-spot-lime uppercase mb-4">
            ¿Qué datos se eliminan?
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { label: "Perfil de usuario", detail: "Username, nombre, avatar emoji, institución" },
              { label: "Grabaciones de audio", detail: "Todos los Drops activos y reacciones de voz" },
              { label: "Contactos SOS", detail: "Nombres y teléfonos de contactos de confianza" },
              { label: "Historial de participación", detail: "Eventos, RSVPs, check-ins emocionales" },
              { label: "Reacciones emoji", detail: "Todas las reacciones registradas" },
              { label: "Sesión de autenticación", detail: "Token JWT y registro de acceso" },
              { label: "Incidentes SOS", detail: "Registros de alertas pasadas (30 días o antes)" },
              { label: "Suscripción Spot+", detail: "Se cancela y desactiva el acceso premium" },
            ].map(({ label, detail }) => (
              <div key={label} className="flex items-start gap-2 rounded-lg bg-white/5 p-3">
                <CheckCircle2 size={14} className="text-spot-lime mt-0.5 shrink-0" />
                <div>
                  <p className="font-mono text-xs text-white font-bold">{label}</p>
                  <p className="font-mono text-[10px] text-white/50">{detail}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="font-mono text-xs text-amber-400/80">
              <strong className="text-amber-400">Nota:</strong> Los metadatos de Drops en el historial
              de rankings (solo conteo anónimo, sin audio ni identificador personal) pueden mantenerse
              de forma anonimizada hasta 90 días adicionales para preservar la integridad de estadísticas
              históricas del campus. Transcurrido ese plazo se eliminan definitivamente.
            </p>
          </div>
        </div>

        {/* Opción 1 — Desde la app */}
        <div className="mb-10">
          <h2 className="font-bebas text-2xl tracking-widest text-spot-lime uppercase mb-6">
            Métodos de Eliminación
          </h2>

          <div className="rounded-xl border border-spot-lime/30 bg-spot-lime/5 p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-spot-lime text-black font-bebas text-sm">A</div>
              <h3 className="font-bebas text-lg tracking-wider text-spot-lime uppercase">Opción A — Desde la App (Inmediata)</h3>
            </div>
            <p className="font-mono text-xs text-white/60 mb-4">Recomendada. Eliminación instantánea sin necesidad de esperar respuesta.</p>
            <div className="space-y-0">
              <Step number={1} title="Abre tu Perfil" icon={User}>
                <p>Inicia sesión en {APP_NAME} y navega a la pestaña <strong className="text-white">Perfil</strong> (ícono de persona en la barra inferior).</p>
              </Step>
              <Step number={2} title='Busca "Eliminar Cuenta"' icon={Trash2}>
                <p>Desplázate hasta el final de la página de Perfil y toca el botón <strong className="text-white">"Eliminar mi cuenta y datos"</strong>.</p>
              </Step>
              <Step number={3} title="Confirma la eliminación" icon={AlertTriangle}>
                <p>Se mostrará un diálogo de confirmación. Lee el resumen de lo que se eliminará y confirma con tu correo institucional.</p>
                <p className="text-white/50 text-xs mt-1">Esta acción es <strong className="text-white/70">permanente e irreversible</strong>.</p>
              </Step>
              <Step number={4} title="Eliminación completada" icon={CheckCircle2}>
                <p>Tu sesión se cerrará automáticamente y todos tus datos serán eliminados de nuestros servidores en un plazo máximo de <strong className="text-white">72 horas</strong> (los archivos de audio en Supabase Storage pueden tardar hasta 24h adicionales en propagarse).</p>
              </Step>
            </div>
          </div>

          {/* Opción B — Por correo */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-white font-bebas text-sm">B</div>
              <h3 className="font-bebas text-lg tracking-wider text-white uppercase">Opción B — Por Correo Electrónico</h3>
            </div>
            <p className="font-mono text-xs text-white/60 mb-4">
              Usa esta opción si ya no tienes acceso a tu cuenta o si deseas confirmación escrita del proceso.
              Respondemos en un máximo de <strong className="text-white">20 días hábiles</strong>.
            </p>
            <Step number={1} title="Envía el correo de solicitud" icon={Mail}>
              <p>
                Escribe a{" "}
                <a href={`mailto:${DELETION_EMAIL}?subject=Solicitud%20de%20Eliminaci%C3%B3n%20de%20Datos%20-%20The%20Spot&body=Nombre%20de%20usuario%3A%20%0ACorreo%20institucional%20registrado%3A%20%0AMotivo%20(opcional)%3A%20`}
                  className="text-spot-lime underline font-bold">
                  {DELETION_EMAIL}
                </a>{" "}
                con el asunto: <code className="text-spot-lime bg-white/5 px-1.5 py-0.5 rounded text-xs">Solicitud de Eliminación de Datos — The Spot</code>
              </p>
            </Step>
            <Step number={2} title="Incluye en el cuerpo del correo" icon={User}>
              <div className="rounded-lg border border-white/10 bg-black/40 p-3 space-y-1 text-xs text-white/70">
                <p>• <strong className="text-white">Nombre de usuario:</strong> @tu_username</p>
                <p>• <strong className="text-white">Correo institucional registrado:</strong> tuusuario@universidad.edu.mx</p>
                <p>• <strong className="text-white">Tipo de solicitud:</strong> Eliminación completa de datos / Eliminación parcial (especificar)</p>
                <p>• <strong className="text-white">Motivo (opcional):</strong> Descripción breve</p>
              </div>
            </Step>
            <Step number={3} title="Verificación de identidad" icon={CheckCircle2}>
              <p>Podemos solicitar confirmación adicional para proteger tu cuenta de solicitudes fraudulentas. Te enviaremos un correo de confirmación al email registrado.</p>
            </Step>
            <Step number={4} title="Confirmación de eliminación" icon={CheckCircle2}>
              <p>Recibirás un correo de confirmación cuando el proceso se complete. Guardamos un registro mínimo (fecha y hash anonimizado) de la solicitud durante 30 días por requerimientos legales, después se elimina también.</p>
            </Step>
          </div>
        </div>

        {/* Eliminación parcial */}
        <div className="mb-10 rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="font-bebas text-xl tracking-widest text-spot-lime uppercase mb-3">
            Eliminación Parcial de Datos
          </h2>
          <p className="font-mono text-sm text-white/70 mb-3">
            Si no deseas eliminar toda tu cuenta pero quieres borrar datos específicos:
          </p>
          <div className="space-y-2">
            {[
              {
                item: "Contactos SOS",
                where: "Perfil → Spot Alert → Gestionar contactos",
              },
              {
                item: "Check-ins de mood",
                where: "Los check-ins no se almacenan individualmente; son agregados anonimizados",
              },
              {
                item: "Tu Drop específico",
                where: "Toca el Drop en el feed → menú de opciones → Eliminar (antes de que expire)",
              },
              {
                item: "Suscripción Spot+",
                where: "Perfil → Suscripción → Cancelar Spot+",
              },
            ].map(({ item, where }) => (
              <div key={item} className="flex items-start gap-3 rounded-lg border border-white/10 p-3">
                <Trash2 size={14} className="text-spot-red mt-0.5 shrink-0" />
                <div>
                  <p className="font-mono text-xs text-white font-bold">{item}</p>
                  <p className="font-mono text-[10px] text-white/50">{where}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Callback URL para Meta */}
        <div className="mb-10 rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
          <h2 className="font-bebas text-xl tracking-widest text-white uppercase mb-3">
            Para Meta / Facebook Login
          </h2>
          <p className="font-mono text-sm text-white/70 mb-3">
            {APP_NAME} no utiliza Facebook Login. La autenticación es exclusivamente vía OTP con correo
            institucional (.edu). Sin embargo, si usaste Meta para conectar alguna función y deseas
            eliminar los datos compartidos con Meta, puedes hacerlo desde:
          </p>
          <ul className="list-disc pl-5 space-y-1 font-mono text-xs text-white/60">
            <li>
              Facebook → Configuración → Seguridad → Apps y sitios web → {APP_NAME} → Eliminar
            </li>
            <li>
              O envía tu solicitud a{" "}
              <a href={`mailto:${DELETION_EMAIL}`} className="text-spot-lime">{DELETION_EMAIL}</a>
            </li>
          </ul>
          <p className="mt-3 font-mono text-[10px] text-white/40">
            URL de callback para Meta Data Deletion:{" "}
            <code className="text-spot-lime">https://thespot.lovable.app/data-deletion</code>
          </p>
        </div>

        {/* Contacto */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="font-bebas text-xl tracking-widest text-spot-lime uppercase mb-3">Contacto</h2>
          <div className="space-y-2 font-mono text-xs text-white/70">
            <p>
              <strong className="text-white">Correo de privacidad:</strong>{" "}
              <a href={`mailto:${DELETION_EMAIL}`} className="text-spot-lime">{DELETION_EMAIL}</a>
            </p>
            <p>
              <strong className="text-white">Tiempo de respuesta:</strong> máximo 20 días hábiles
            </p>
            <p>
              <strong className="text-white">Política de Privacidad completa:</strong>{" "}
              <a href="/privacy" className="text-spot-lime">thespot.lovable.app/privacy</a>
            </p>
            <p>
              <strong className="text-white">Condiciones del Servicio:</strong>{" "}
              <a href="/terms" className="text-spot-lime">thespot.lovable.app/terms</a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 border-t border-white/10 pt-6 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {APP_NAME} — Eliminación de Datos v1.0 · {LAST_UPDATED}
          </p>
          <div className="mt-4 flex items-center justify-center gap-4 font-mono text-[9px] text-muted-foreground/50">
            <a href="/privacy" className="hover:text-spot-lime transition-colors">Política de Privacidad</a>
            <span>·</span>
            <a href="/terms" className="hover:text-spot-lime transition-colors">Condiciones del Servicio</a>
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

export default DataDeletionPage;
