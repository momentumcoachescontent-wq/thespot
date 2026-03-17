import { useState, useEffect } from "react";
import { Bell, BellOff, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useToast } from "@/hooks/use-toast";

const PushNotificationToggle = () => {
  const { isSupported, isConfigured, permission, isSubscribed, loading, subscribe, unsubscribe } =
    usePushNotifications();
  const { toast } = useToast();

  // ── Location permission ────────────────────────────────────────────────────
  const [locationPerm, setLocationPerm] = useState<PermissionState | "unsupported">("prompt");

  useEffect(() => {
    if (!navigator.permissions) { setLocationPerm("unsupported"); return; }
    navigator.permissions.query({ name: "geolocation" as PermissionName }).then((result) => {
      setLocationPerm(result.state);
      result.onchange = () => setLocationPerm(result.state);
    });
  }, []);

  const requestLocation = () => {
    navigator.geolocation.getCurrentPosition(
      () => setLocationPerm("granted"),
      () => {
        navigator.permissions
          ?.query({ name: "geolocation" as PermissionName })
          .then((r) => setLocationPerm(r.state));
      },
      { timeout: 10000 }
    );
  };

  // ── Push subscribe with user-visible error ────────────────────────────────
  const handleSubscribe = async () => {
    try {
      await subscribe();
    } catch (err: any) {
      toast({ title: "No se pudo activar", description: err.message, variant: "destructive" });
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Push Notifications row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {permission === "denied" ? (
            <BellOff size={16} className="text-muted-foreground" />
          ) : (
            <Bell size={16} className={isSubscribed ? "text-spot-lime" : "text-muted-foreground"} />
          )}
          <div>
            <p className="font-mono text-[11px] text-foreground">Notificaciones push</p>
            <p className="font-mono text-[9px] text-muted-foreground">
              {permission === "denied"
                ? "Bloqueadas — actívalas en configuración del sitio"
                : !isConfigured
                ? "No configuradas en este entorno"
                : isSubscribed
                ? "Recibes alertas de drops, DMs e incidentes SOS"
                : "Activa para recibir alertas en tiempo real"}
            </p>
          </div>
        </div>

        {permission !== "denied" && isConfigured && isSupported && (
          <button
            onClick={isSubscribed ? unsubscribe : handleSubscribe}
            disabled={loading}
            className="relative flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50"
          >
            <span
              className={`inline-block h-6 w-11 rounded-full transition-colors ${
                isSubscribed ? "bg-spot-lime" : "bg-muted"
              }`}
            />
            <motion.span
              animate={{ x: isSubscribed ? 20 : 2 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow"
            />
          </button>
        )}
      </div>

      {/* Location permission row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapPin
            size={16}
            className={locationPerm === "granted" ? "text-spot-lime" : "text-muted-foreground"}
          />
          <div>
            <p className="font-mono text-[11px] text-foreground">Ubicación en tiempo real</p>
            <p className="font-mono text-[9px] text-muted-foreground">
              {locationPerm === "granted"
                ? "Concedida — usada para alertas SOS"
                : locationPerm === "denied"
                ? "Bloqueada — actívala en configuración del sitio"
                : "Necesaria para compartir tu posición en SOS"}
            </p>
          </div>
        </div>

        {locationPerm === "prompt" && (
          <button
            onClick={requestLocation}
            className="rounded-xl bg-spot-lime/10 border border-spot-lime/20 px-3 py-1.5 font-mono text-[9px] text-spot-lime uppercase tracking-widest hover:bg-spot-lime/20 transition-colors"
          >
            Activar
          </button>
        )}
        {locationPerm === "granted" && (
          <span className="h-2 w-2 rounded-full bg-spot-lime shadow-[0_0_6px_rgba(200,255,0,0.8)]" />
        )}
      </div>
    </div>
  );
};

export default PushNotificationToggle;
