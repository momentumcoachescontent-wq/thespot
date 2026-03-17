import { useState, useEffect } from "react";
import { Headphones, Play, Pause } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useFilter } from "@/contexts/FilterContext";
import { usePodcastPlayer } from "@/contexts/PodcastPlayerContext";

const PodcastWidget = () => {
    const { resolvedDomain } = useFilter();
    const navigate = useNavigate();
    const { currentEpisode, isPlaying, play, pause } = usePodcastPlayer();
    const [episodes, setEpisodes] = useState<any[]>([]);

    useEffect(() => {
        const fetchEpisodes = async () => {
            // 1. Resolver show_ids del campus activo
            let showIds: string[] = [];
            if (resolvedDomain) {
                const { data: shows } = await (supabase as any)
                    .from("podcast_shows")
                    .select("id")
                    .eq("university_domain", resolvedDomain)
                    .eq("status", "active");
                showIds = (shows || []).map((s: any) => s.id);

                if (showIds.length === 0) {
                    setEpisodes([]);
                    return;
                }
            }

            // 2. Obtener últimos 2 episodios publicados
            let query = (supabase as any)
                .from("podcast_episodes")
                .select("id, title, audio_url, duration_seconds, access_tier, show_id, podcast_shows(id, title)")
                .eq("status", "published")
                .or("expires_at.is.null,expires_at.gt." + new Date().toISOString());

            if (showIds.length > 0) {
                query = query.in("show_id", showIds);
            }

            const { data, error } = await query
                .order("created_at", { ascending: false })
                .limit(2);

            if (error) console.error("PodcastWidget error:", error);
            setEpisodes(data || []);
        };

        fetchEpisodes();
    }, [resolvedDomain]);

    if (!episodes.length) return (
        <div className="flex flex-col items-center py-4 text-center">
            <Headphones size={24} className="mb-2 text-muted-foreground/30" />
            <p className="font-mono text-xs text-muted-foreground">Sin podcasts activos</p>
        </div>
    );

    return (
        <div className="space-y-2">
            {episodes.map(ep => {
                const show = ep.podcast_shows;
                const playing = currentEpisode?.id === ep.id && isPlaying;

                return (
                    <div key={ep.id} className="flex items-center gap-3 rounded-xl border border-border bg-muted/10 px-3 py-2">
                        <button
                            onClick={() => {
                                if (playing) {
                                    pause();
                                } else {
                                    play({
                                        id: ep.id,
                                        title: ep.title,
                                        audio_url: ep.audio_url,
                                        duration_seconds: ep.duration_seconds,
                                        access_tier: ep.access_tier,
                                        show: { id: show?.id ?? "", title: show?.title ?? "" },
                                    });
                                }
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-spot-lime text-black shrink-0"
                        >
                            {playing
                                ? <Pause size={12} fill="currentColor" />
                                : <Play size={12} fill="currentColor" className="ml-0.5" />}
                        </button>

                        <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => show?.id && navigate(`/podcast/show/${show.id}`)}
                        >
                            <p className="font-bebas text-sm leading-none text-foreground truncate">{ep.title}</p>
                            {ep.access_tier === "premium" && (
                                <span className="font-mono text-[9px] text-amber-400">Spot+</span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default PodcastWidget;
