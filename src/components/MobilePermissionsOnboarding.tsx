import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, MapPin, X } from "lucide-react";

const STORAGE_KEY = "thespot_perms_shown";

const MobilePermissionsOnboarding = () => {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<"idle" | "notif" | "location" | "done">("idle");

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const alreadyShown = localStorage.getItem(STORAGE_KEY) === "1";
    if (isStandalone && !alreadyShown) {
      // Small delay so the app finishes mounting first
      const t = setTimeout(() => { setVisible(true); setStep("notif"); }, 1200);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  const requestNotifications = async () => {
    if ("Notification" in window) {
      await Notification.requestPermission().catch(() => {});
    }
    setStep("location");
  };

  const requestLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(() => {}, () => {});
    }
    dismiss();
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={dismiss}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-white/10 bg-zinc-900 px-6 pb-10 pt-4"
          >
            {/* Handle */}
            <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-white/20" />

            <button
              onClick={dismiss}
              className="absolute right-4 top-4 text-zinc-500 hover:text-white"
            >
              <X size={18} />
            </button>

            <AnimatePresence mode="wait">
              {step === "notif" && (
                <motion.div
                  key="notif"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-spot-lime/10">
                    <Bell size={28} className="text-spot-lime" />
                  </div>
                  <div>
                    <h2 className="font-bebas text-2xl text-white">Notificaciones</h2>
                    <p className="mt-1 font-mono text-xs text-zinc-400">
                      Entérate al instante cuando alguien reaccione a tus drops o te mande un mensaje.
                    </p>
                  </div>
                  <button
                    onClick={requestNotifications}
                    className="w-full rounded-2xl bg-spot-lime py-3 font-bebas text-lg text-black"
                  >
                    Permitir notificaciones
                  </button>
                  <button
                    onClick={() => setStep("location")}
                    className="w-full font-mono text-xs text-zinc-500"
                  >
                    Ahora no
                  </button>
                </motion.div>
              )}

              {step === "location" && (
                <motion.div
                  key="location"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-spot-cyan/10">
                    <MapPin size={28} className="text-spot-cyan" />
                  </div>
                  <div>
                    <h2 className="font-bebas text-2xl text-white">Ubicación</h2>
                    <p className="mt-1 font-mono text-xs text-zinc-400">
                      Úsala para ver eventos y spots cercanos en el mapa de tu campus.
                    </p>
                  </div>
                  <button
                    onClick={requestLocation}
                    className="w-full rounded-2xl bg-spot-cyan py-3 font-bebas text-lg text-black"
                  >
                    Permitir ubicación
                  </button>
                  <button
                    onClick={dismiss}
                    className="w-full font-mono text-xs text-zinc-500"
                  >
                    Ahora no
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobilePermissionsOnboarding;
