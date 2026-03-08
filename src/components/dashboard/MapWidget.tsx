import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const MapWidget = () => {
    const [spots, setSpots] = useState<any[]>([]);
    const [hasLocation, setHasLocation] = useState(false);

    useEffect(() => {
        (supabase as any).from("spots").select("id, name, university_domain").limit(6).then(({ data, error }: any) => {
            if (error) console.error("Error fetching spots widget:", error);
            setSpots(data || []);
        });
        navigator.geolocation?.getCurrentPosition(() => setHasLocation(true), () => { });
    }, []);

    return (
        <div className="flex flex-col items-center">
            {/* Mini radar */}
            <div className="relative flex h-32 w-32 items-center justify-center">
                {[56, 40, 24].map((r, i) => (
                    <motion.div key={r} className="absolute rounded-full border border-spot-lime/15" style={{ width: r * 2, height: r * 2 }}
                        animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 3, delay: i * 0.8, repeat: Infinity }} />
                ))}
                <motion.div className="absolute origin-bottom h-14 w-[1.5px] rounded-full bg-gradient-to-t from-spot-lime/50 to-transparent"
                    style={{ bottom: "50%", left: "50%", transformOrigin: "bottom center" }}
                    animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} />
                <div className="relative z-10 h-3 w-3 rounded-full bg-spot-lime shadow-[0_0_8px_rgba(200,255,0,0.8)]" />
                {spots.slice(0, 4).map((_, i) => {
                    const angle = (i / 4) * 2 * Math.PI - Math.PI / 2;
                    const r = 36 + (i % 2) * 18;
                    return (
                        <div key={i} className="absolute h-2 w-2 rounded-full bg-spot-cyan/60 border border-spot-cyan/80"
                            style={{ left: `calc(50% + ${Math.cos(angle) * r}px - 4px)`, top: `calc(50% + ${Math.sin(angle) * r}px - 4px)` }} />
                    );
                })}
            </div>
            <p className={`mt-2 font-mono text-[9px] uppercase tracking-widest ${hasLocation ? "text-spot-lime" : "text-muted-foreground"}`}>
                {hasLocation ? "Ubicación activa" : "Activa tu ubicación"}
            </p>
            <p className="mt-1 font-mono text-[9px] text-muted-foreground">{spots.length} spots cercanos</p>
        </div>
    );
};

export default MapWidget;
