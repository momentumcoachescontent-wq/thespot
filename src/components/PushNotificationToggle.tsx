import { Bell, BellOff } from "lucide-react";
import { motion } from "framer-motion";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const PushNotificationToggle = () => {
  const { isSupported, permission, isSubscribed, loading, subscribe, unsubscribe } =
    usePushNotifications();

  if (!isSupported) return null;

  if (permission === "denied") {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BellOff size={16} className="text-muted-foreground" />
          <div>
            <p className="font-mono text-[11px] text-foreground">Notificaciones</p>
            <p className="font-mono text-[9px] text-muted-foreground">
              Bloqueadas en tu navegador — actívalas en configuración del sitio
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Bell size={16} className={isSubscribed ? "text-spot-lime" : "text-muted-foreground"} />
        <div>
          <p className="font-mono text-[11px] text-foreground">Notificaciones push</p>
          <p className="font-mono text-[9px] text-muted-foreground">
            {isSubscribed
              ? "Recibes alerts de drops, DMs e incidentes SOS"
              : "Activa para recibir alerts en tiempo real"}
          </p>
        </div>
      </div>
      <button
        onClick={isSubscribed ? unsubscribe : subscribe}
        disabled={loading}
        className="relative flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50"
        style={{ backgroundColor: isSubscribed ? "#C8FF00" : undefined }}
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
    </div>
  );
};

export default PushNotificationToggle;
