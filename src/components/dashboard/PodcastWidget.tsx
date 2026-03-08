import { useState, useEffect, useRef } from "react";
import { Headphones, Play, Pause } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const PodcastWidget = () => {
    const [pods, setPods] = useState<any[]>([]);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        (supabase as any)
            .from("podcasts")
            .select("id, title, audio_url, duration_seconds")
            .gt("expires_at", new Date().toISOString())
            .order("created_at", { ascending: false })
            .limit(2)
            .then(({ data, error }: any) => {
                if (error) console.error("Error fetching podcasts widget:", error);
                setPods(data || []);
            });
    }, []);

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
                            if (playingId === pod.id) { audioRef.current?.pause(); setPlayingId(null); }
                            else { if (audioRef.current) { audioRef.current.src = pod.audio_url; audioRef.current.play().catch((err) => console.warn("Podcast play failed:", err)); } setPlayingId(pod.id); }
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-spot-lime text-black shrink-0"
                    >
                        {playingId === pod.id ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" className="ml-0.5" />}
                    </button>
                    <p className="font-bebas text-sm leading-none text-foreground truncate">{pod.title}</p>
                </div>
            ))}
            <audio ref={audioRef} onEnded={() => setPlayingId(null)} />
        </div>
    );
};

export default PodcastWidget;
