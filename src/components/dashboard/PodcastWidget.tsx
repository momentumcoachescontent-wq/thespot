import { useState, useEffect, useRef } from "react";
import { Headphones, Play, Pause } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFilter } from "@/contexts/FilterContext";

const PodcastWidget = () => {
    const { resolvedDomain } = useFilter();
    const [pods, setPods] = useState<any[]>([]);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const fetchPods = async () => {
            let spotIds: string[] = [];

            // Resolver spot_ids desde el dominio activo
            if (resolvedDomain) {
                const { data: spots } = await (supabase as any)
                    .from("spots")
                    .select("id")
                    .eq("university_domain", resolvedDomain);
                spotIds = (spots || []).map((s: any) => s.id);
            }

            let query = (supabase as any)
                .from("podcasts")
                .select("id, title, audio_url, duration_seconds, access_tier")
                .eq("status", "published")
                .or("expires_at.is.null,expires_at.gt." + new Date().toISOString());

            if (spotIds.length > 0) {
                query = query.in("spot_id", spotIds);
            }

            const { data, error } = await query
                .order("created_at", { ascending: false })
                .limit(2);

            if (error) console.error("Error fetching podcasts widget:", error);
            setPods(data || []);
        };

        fetchPods();
    }, [resolvedDomain]);

    if (!pods.length) return (
        <div className="flex flex-col items-center py-4 text-center">
            <Headphones size={24} className="mb-2 text-muted-foreground/30" />
            <p className="font-mono text-xs text-muted-foreground">Sin podcasts activos</p>
        </div>
    );

    return (
        <div className="space-y-2">
            {pods.map(pod => (
                <div key={pod.id} className="flex items-center gap-3 rounded-xl border border-border bg-muted/10 px-3 py-2">
                    <button
                        onClick={() => {
                            if (playingId === pod.id) {
                                audioRef.current?.pause();
                                setPlayingId(null);
                            } else {
                                if (audioRef.current) {
                                    audioRef.current.src = pod.audio_url;
                                    audioRef.current.play().catch((err) => console.warn("Podcast play failed:", err));
                                }
                                setPlayingId(pod.id);
                            }
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-spot-lime text-black shrink-0"
                    >
                        {playingId === pod.id
                            ? <Pause size={12} fill="currentColor" />
                            : <Play size={12} fill="currentColor" className="ml-0.5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                        <p className="font-bebas text-sm leading-none text-foreground truncate">{pod.title}</p>
                        {pod.access_tier === "premium" && (
                            <span className="font-mono text-[9px] text-amber-400">Spot+</span>
                        )}
                    </div>
                </div>
            ))}
            <audio ref={audioRef} onEnded={() => setPlayingId(null)} />
        </div>
    );
};

export default PodcastWidget;
