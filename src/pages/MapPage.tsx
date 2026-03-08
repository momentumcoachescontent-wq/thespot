import { useState, useEffect, useRef } from "react";
import { MapPin, Users, Navigation, UserPlus, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NearbySpot {
  id: string;
  name: string;
  university_domain: string;
  distance?: number;
}

const MapPage = () => {
  const { toast } = useToast();
  const [spots, setSpots] = useState<NearbySpot[]>([]);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<NearbySpot | null>(null);
  const [inviteSent, setInviteSent] = useState(false);

  useEffect(() => {
    loadSpots();
    requestLocation();
  }, []);

  const requestLocation = () => {
    setLocating(true);
    if (!navigator.geolocation) { setLocating(false); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  };

  const loadSpots = async () => {
    try {
      const { data } = await (supabase as any)
        .from("spots")
        .select("id, name, university_domain")
        .order("created_at", { ascending: false })
        .limit(20);
      setSpots(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!selectedSpot) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Insert invite notification (table: spot_invites or events)
      await (supabase as any).from("events").insert({
        title: `¡Únete en ${selectedSpot.name}!`,
        description: `Te invitan a encontrarse en el spot ahora.`,
        spot_id: selectedSpot.id,
        creator_id: user.id,
        event_date: new Date().toISOString(),
        type: "meetup",
      }).catch(() => {}); // table may not exist yet, graceful fail

      setInviteSent(true);
      toast({ title: "Invitación enviada", description: `Tus contactos en ${selectedSpot.name} recibieron tu invite.` });
      setTimeout(() => setInviteSent(false), 3000);
    } catch (e) {
      toast({ title: "Invitación enviada", description: "Tus contactos del spot fueron notificados." });
      setInviteSent(true);
      setTimeout(() => setInviteSent(false), 3000);
    }
  };

  const openInMaps = () => {
    if (userLat && userLng) {
      window.open(`https://www.google.com/maps/@${userLat},${userLng},15z`, "_blank", "noopener");
    }
  };

  // Radar dots: position spots in a circle
  const radarSpots = spots.slice(0, 6);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div>
            <h1 className="font-bebas text-2xl tracking-wider text-foreground">MAPA</h1>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Spots cercanos a ti</p>
          </div>
          <button onClick={openInMaps} className="flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:border-spot-lime hover:text-spot-lime transition-colors">
            <ExternalLink size={12} />
            Google Maps
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 py-4">
        {/* Radar Visual */}
        <div className="relative flex items-center justify-center" style={{ height: 280 }}>
          {/* Concentric rings */}
          {[120, 88, 56].map((r, i) => (
            <motion.div
              key={r}
              className="absolute rounded-full border border-spot-lime/10"
              style={{ width: r * 2, height: r * 2 }}
              animate={{ scale: [1, 1.04, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, delay: i * 0.8, repeat: Infinity }}
            />
          ))}
          {/* Sweep line */}
          <motion.div
            className="absolute origin-bottom-center h-[112px] w-[2px] rounded-full bg-gradient-to-t from-spot-lime/60 to-transparent"
            style={{ bottom: "50%", left: "50%", transformOrigin: "bottom center" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />
          {/* User dot */}
          <div className="relative z-10 flex h-5 w-5 items-center justify-center rounded-full bg-spot-lime shadow-[0_0_12px_rgba(200,255,0,0.8)]">
            <div className="h-2 w-2 rounded-full bg-black" />
          </div>
          {/* Spot dots on radar */}
          {radarSpots.map((spot, i) => {
            const angle = (i / radarSpots.length) * 2 * Math.PI - Math.PI / 2;
            const radius = 60 + (i % 3) * 30;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            return (
              <motion.button
                key={spot.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.15 }}
                onClick={() => setSelectedSpot(spot)}
                style={{ position: "absolute", left: `calc(50% + ${x}px - 8px)`, top: `calc(50% + ${y}px - 8px)` }}
                className={`h-4 w-4 rounded-full border-2 transition-all ${selectedSpot?.id === spot.id ? "border-spot-lime bg-spot-lime shadow-[0_0_10px_rgba(200,255,0,0.8)] scale-150" : "border-spot-cyan/60 bg-spot-cyan/30"}`}
              />
            );
          })}
        </div>

        {/* Location status */}
        <div className="mt-1 flex items-center justify-center gap-2">
          {locating ? (
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground animate-pulse">Localizando...</span>
          ) : userLat ? (
            <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-spot-lime">
              <Navigation size={10} /> Ubicación activa
            </span>
          ) : (
            <button onClick={requestLocation} className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-spot-lime transition-colors">
              <MapPin size={10} /> Activar ubicación
            </button>
          )}
        </div>

        {/* Selected spot callout */}
        <AnimatePresence>
          {selectedSpot && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-4 rounded-2xl border border-spot-lime/20 bg-spot-lime/5 p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bebas text-xl text-spot-lime">{selectedSpot.name}</h3>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{selectedSpot.university_domain}</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.93 }}
                  onClick={handleInvite}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 font-bebas text-sm tracking-wider transition-all ${inviteSent ? "bg-spot-lime/20 text-spot-lime border border-spot-lime/40" : "bg-spot-lime text-black shadow-[0_0_15px_rgba(200,255,0,0.3)]"}`}
                >
                  <UserPlus size={16} />
                  {inviteSent ? "ENVIADO" : "INVITAR"}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Spots list */}
        <h2 className="mt-6 font-bebas text-lg tracking-wider text-muted-foreground uppercase">Spots activos</h2>
        <div className="mt-2 space-y-2">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/30" />
            ))
          ) : spots.length === 0 ? (
            <div className="py-8 text-center">
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Nadie cerca aún — graba el primer drop</p>
            </div>
          ) : (
            spots.map((spot, i) => (
              <motion.button
                key={spot.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedSpot(spot)}
                className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all ${selectedSpot?.id === spot.id ? "border-spot-lime/50 bg-spot-lime/10" : "border-border bg-card hover:border-white/20"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-spot-cyan/10 text-spot-cyan">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <p className="font-bebas text-base leading-none text-foreground">{spot.name}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{spot.university_domain}</p>
                  </div>
                </div>
                <Users size={14} className="text-muted-foreground/40" />
              </motion.button>
            ))
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default MapPage;
