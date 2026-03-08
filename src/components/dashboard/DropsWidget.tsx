import { useState, useEffect, useRef } from "react";
import { Play, Pause } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFilter } from "@/contexts/FilterContext";

const DropsWidget = () => {
    const { resolvedDomain } = useFilter();
    const [drops, setDrops] = useState<any[]>([]);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        let query = (supabase as any)
            .from("drops")
            .select("id, audio_url, created_at, profiles:author_id(username), spots!inner(university_domain)")
            .gt("expires_at", new Date().toISOString());

        if (resolvedDomain) {
            query = query.eq("spots.university_domain", resolvedDomain);
        }

        query
            .order("created_at", { ascending: false })
            .limit(5)
            .then(({ data, error }: any) => {
                if (error) console.error("Error fetching drops widget:", error);
                setDrops(data || []);
                setLoading(false);
            });
    }, [resolvedDomain]);

    const toggle = (drop: any) => {
        if (playingId === drop.id) {
            audioRef.current?.pause();
            setPlayingId(null);
        }
        else {
            if (audioRef.current) {
                audioRef.current.src = drop.audio_url;
                audioRef.current.play().catch((err) => console.warn("Audio play failed:", err));
            }
            setPlayingId(drop.id);
        }
    };

    if (loading) return <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-10 animate-pulse rounded-lg bg-muted/30" />)}</div>;
    if (!drops.length) return <p className="py-6 text-center font-mono text-xs text-muted-foreground">Canal en silencio — sé el primero</p>;

    return (
        <div className="space-y-2">
            {drops.map(d => (
                <div key={d.id} className="flex items-center gap-3 rounded-xl bg-muted/20 px-3 py-2">
                    <button onClick={() => toggle(d)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-spot-lime text-black">
                        {playingId === d.id ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                        <p className="font-bebas text-sm leading-none text-foreground truncate">@{d.profiles?.username || "anónimo"}</p>
                        <p className="font-mono text-[9px] text-muted-foreground">{new Date(d.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                </div>
            ))}
            <audio ref={audioRef} onEnded={() => setPlayingId(null)} />
        </div>
    );
};

export default DropsWidget;
