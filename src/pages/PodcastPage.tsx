import { useState, useEffect, useRef } from "react";
import { Headphones, Play, Pause, Plus, Lock, Clock, Mic } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Podcast {
  id: string;
  title: string;
  description: string;
  audio_url: string;
  duration_seconds: number;
  expires_at: string;
  is_premium: boolean;
  play_count: number;
  profiles?: { username: string };
}

const PodcastCard = ({ pod, isPlaying, onToggle }: { pod: Podcast; isPlaying: boolean; onToggle: () => void }) => {
  const daysLeft = Math.ceil((new Date(pod.expires_at).getTime() - Date.now()) / 86400000);
  const mins = Math.floor(pod.duration_seconds / 60);
  const secs = pod.duration_seconds % 60;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-spot-lime text-black shadow-[0_0_15px_rgba(200,255,0,0.3)] transition-transform hover:scale-105 active:scale-95"
        >
          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bebas text-lg leading-none text-foreground truncate">{pod.title}</h3>
            {pod.is_premium && (
              <span className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-amber-400">
                Premium
              </span>
            )}
          </div>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground line-clamp-2">{pod.description}</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground">
              <Clock size={10} /> {mins}:{String(secs).padStart(2, "0")}
            </span>
            <span className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground">
              <Headphones size={10} /> {pod.play_count || 0}
            </span>
            <span className={`font-mono text-[9px] ${daysLeft <= 1 ? "text-spot-red" : "text-muted-foreground"}`}>
              {daysLeft > 0 ? `${daysLeft}d restantes` : "Expirado"}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const PodcastPage = () => {
  const { toast } = useToast();
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", days: 3 });
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    loadPodcasts();
    checkPremium();
  }, []);

  const checkPremium = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await (supabase as any).from("profiles").select("is_premium, role").eq("id", user.id).single();
    setIsPremium(data?.is_premium || data?.role === 'admin' || false);
  };

  const loadPodcasts = async () => {
    try {
      const { data } = await (supabase as any)
        .from("podcasts")
        .select("*, profiles:creator_id(username)")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      setPodcasts(data || []);
    } catch (e) {
      setPodcasts([]);
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = (pod: Podcast) => {
    if (playingId === pod.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = pod.audio_url;
        audioRef.current.play().catch(() => { });
      }
      setPlayingId(pod.id);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-4">
      <div className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div>
            <h1 className="font-bebas text-2xl tracking-wider text-foreground">PODCAST</h1>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Audios de larga duración</p>
          </div>
          {isPremium ? (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 rounded-full bg-spot-lime px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-black"
            >
              <Plus size={12} /> Crear
            </button>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full border border-amber-500/30 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-amber-400">
              <Lock size={10} /> Premium
            </span>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 py-4">
        {/* Premium banner if not premium */}
        {!isPremium && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4"
          >
            <div className="flex items-center gap-3">
              <Lock size={18} className="text-amber-400 shrink-0" />
              <div>
                <p className="font-bebas text-base text-amber-400">Contenido Premium</p>
                <p className="font-mono text-[10px] text-muted-foreground">Usuarios premium pueden crear podcasts de hasta 5 días. Puedes escuchar todos los podcasts de tu campus.</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Create form */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden rounded-2xl border border-spot-lime/20 bg-spot-lime/5 p-4 space-y-3"
            >
              <h3 className="font-bebas text-lg text-spot-lime">Nuevo Podcast</h3>
              <input
                placeholder="Título del podcast"
                className="w-full rounded-xl border border-border bg-black/40 px-3 py-2 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-spot-lime"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
              <textarea
                placeholder="Descripción breve..."
                rows={2}
                className="w-full rounded-xl border border-border bg-black/40 px-3 py-2 font-mono text-xs resize-none focus:outline-none focus:ring-1 focus:ring-spot-lime"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Duración:</span>
                {[1, 2, 3, 5].map(d => (
                  <button
                    key={d}
                    onClick={() => setForm(f => ({ ...f, days: d }))}
                    className={`rounded-full px-3 py-1 font-mono text-[10px] transition-all ${form.days === d ? "bg-spot-lime text-black" : "border border-border text-muted-foreground"}`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-spot-lime py-2 font-bebas text-sm text-black">
                  <Mic size={14} /> Grabar y publicar
                </button>
                <button onClick={() => setShowCreate(false)} className="rounded-xl border border-border px-3 py-2 font-mono text-xs text-muted-foreground">
                  Cancelar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="mb-3 h-24 animate-pulse rounded-2xl bg-muted/30" />
          ))
        ) : podcasts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 text-5xl">🎧</div>
            <h2 className="font-bebas text-2xl uppercase tracking-wider text-foreground">Sin podcasts aún</h2>
            <p className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground/60">
              {isPremium ? "Crea el primer podcast de tu campus" : "Los usuarios premium pueden crear podcasts"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {podcasts.map(pod => (
              <PodcastCard key={pod.id} pod={pod} isPlaying={playingId === pod.id} onToggle={() => togglePlay(pod)} />
            ))}
          </div>
        )}
      </div>

      <audio ref={audioRef} onEnded={() => setPlayingId(null)} />

    </div>
  );
};

export default PodcastPage;
