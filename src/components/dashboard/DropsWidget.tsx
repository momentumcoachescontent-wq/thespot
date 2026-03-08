import { useState, useEffect, useRef } from "react";
import { Play, Pause, Headphones, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFilter } from "@/contexts/FilterContext";

const DropsWidget = () => {
    const { resolvedDomain } = useFilter();
    const [drops, setDrops] = useState<any[]>([]);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [now, setNow] = useState(new Date());
    const audioRef = useRef<HTMLAudioElement>(null);
    const hasCountedRef = useRef<Record<string, boolean>>({});

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchDrops = async () => {
        let query = (supabase as any)
            .from("drops")
            .select("id, audio_url, created_at, expires_at, listened_count, profiles:author_id(username), spots!inner(university_domain), reactions(count)")
            .gt("expires_at", new Date().toISOString());

        if (resolvedDomain) {
            query = query.eq("spots.university_domain", resolvedDomain);
        }

        const { data, error } = await query
            .order("created_at", { ascending: false })
            .limit(5);

        if (error) {
            console.error("Error fetching drops widget:", error);
            return;
        }

        const formattedDrops = (data || []).map((d: any) => ({
            ...d,
            reaction_count: d.reactions?.[0]?.count || 0
        }));

        setDrops(formattedDrops);
        setLoading(false);
    };

    useEffect(() => {
        fetchDrops();

        // Realtime sync
        const channel = (supabase as any)
            .channel("drops-widget")
            .on("postgres_changes", { event: "*", schema: "public", table: "drops" }, () => fetchDrops())
            .on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, () => fetchDrops())
            .subscribe();

        return () => { channel.unsubscribe(); };
    }, [resolvedDomain]);

    const getTimeLeft = (expiresAt: string) => {
        const diff = new Date(expiresAt).getTime() - now.getTime();
        if (diff <= 0) return "00:00";
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleTimeUpdate = () => {
        if (audioRef.current && playingId) {
            const { currentTime, duration } = audioRef.current;
            if (!duration || isNaN(duration)) return;

            const progress = (currentTime / duration) * 100;

            if (progress >= 30 && !hasCountedRef.current[playingId]) {
                hasCountedRef.current[playingId] = true;
                (supabase as any).rpc('increment_listened_count', { drop_id: playingId })
                    .catch((err: any) => console.error("Error incrementing widget listener:", err));
            }
        }
    };

    const handleEnded = () => {
        if (playingId) {
            hasCountedRef.current[playingId] = false;
        }
        setPlayingId(null);
    };

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
                <div key={d.id} className="group flex items-center gap-3 rounded-xl bg-muted/10 border border-white/5 hover:bg-muted/20 px-3 py-2.5 transition-all">
                    <button onClick={() => toggle(d)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-spot-lime text-black shadow-lg shadow-spot-lime/20 transition-transform active:scale-90">
                        {playingId === d.id ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <p className="font-bebas text-sm leading-none text-foreground truncate">@{d.profiles?.username || "anónimo"}</p>
                            <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1 font-mono text-[9px] text-spot-lime">
                                    <Clock size={10} /> {getTimeLeft(d.expires_at)}
                                </span>
                            </div>
                        </div>
                        <div className="mt-1.5 flex items-center gap-4">
                            <span className="font-mono text-[9px] text-muted-foreground">{new Date(d.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground/80">
                                    👂 {d.listened_count || 0}
                                </span>
                                <span className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground/80">
                                    🔥 {d.reaction_count || 0}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
            <audio ref={audioRef} onEnded={handleEnded} onTimeUpdate={handleTimeUpdate} />
        </div>
    );
};

export default DropsWidget;
