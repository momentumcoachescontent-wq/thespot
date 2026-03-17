import { useState, useEffect } from "react";
import { Plus, Mic2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFilter } from "@/contexts/FilterContext";
import { useToast } from "@/hooks/use-toast";

interface PodcastShow {
  id: string;
  title: string;
  description: string | null;
  cover_emoji: string;
  creator_id: string;
  university_domain: string | null;
  is_official: boolean;
  profiles?: { username: string | null };
}

const COVER_EMOJIS = ["🎙️", "🎵", "📻", "🎤", "🎧", "🌟", "🔥", "💬", "📢", "🎼", "🏫", "🎓"];

const ShowCard = ({ show, onClick }: { show: PodcastShow; onClick: () => void }) => (
  <motion.button
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    onClick={onClick}
    className="w-full rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/20 active:scale-[0.99]"
  >
    <div className="flex items-start gap-3">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-muted text-3xl">
        {show.cover_emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bebas text-lg leading-none text-foreground truncate">{show.title}</h3>
          {show.is_official && (
            <span className="shrink-0 rounded-full bg-spot-lime/20 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-spot-lime">
              Oficial
            </span>
          )}
        </div>
        {show.description && (
          <p className="mt-1 font-mono text-[10px] text-muted-foreground line-clamp-2">{show.description}</p>
        )}
        {show.profiles?.username && (
          <p className="mt-1.5 font-mono text-[9px] text-muted-foreground/60">@{show.profiles.username}</p>
        )}
      </div>
    </div>
  </motion.button>
);

const PodcastPage = () => {
  const { toast } = useToast();
  const { isAdmin, profile, user } = useAuth();
  const { resolvedDomain } = useFilter();
  const navigate = useNavigate();

  const [shows, setShows] = useState<PodcastShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", coverEmoji: "🎙️" });

  const isPremium = profile?.is_premium || isAdmin;

  useEffect(() => {
    loadShows();
  }, [resolvedDomain]);

  const loadShows = async () => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .from("podcast_shows")
        .select("*, profiles:creator_id(username)")
        .eq("status", "active");

      if (resolvedDomain) {
        query = query.eq("university_domain", resolvedDomain);
      }

      const { data } = await query.order("created_at", { ascending: false });
      setShows(data || []);
    } catch {
      setShows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShow = async () => {
    if (!form.title.trim()) {
      toast({ title: "Falta el título", description: "Ponle un nombre a tu podcast.", variant: "destructive" });
      return;
    }
    setIsCreating(true);
    try {
      if (!user) return;

      let spotId: string | null = null;
      const domain = profile?.university_domain;
      if (domain && domain !== "admin") {
        const { data: spots } = await (supabase as any)
          .from("spots")
          .select("id")
          .eq("university_domain", domain)
          .limit(1);
        spotId = spots?.[0]?.id ?? null;
      }

      const { data, error } = await (supabase as any)
        .from("podcast_shows")
        .insert({
          title: form.title,
          description: form.description || null,
          cover_emoji: form.coverEmoji,
          creator_id: user.id,
          spot_id: spotId,
          university_domain: profile?.university_domain ?? null,
          visibility: "campus",
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: "¡Podcast creado!", description: "Graba tu primer episodio." });
      setShowCreate(false);
      setForm({ title: "", description: "", coverEmoji: "🎙️" });
      navigate(`/podcast/show/${data.id}`);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-4">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div>
            <h1 className="font-bebas text-2xl tracking-wider text-foreground">PODCASTS</h1>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Shows de tu campus
            </p>
          </div>
          {isPremium ? (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 rounded-full bg-spot-lime px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-black shadow-[0_0_12px_rgba(200,255,0,0.3)]"
            >
              <Plus size={12} /> Crear show
            </button>
          ) : (
            <button
              onClick={() => navigate("/premium")}
              className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-amber-400 hover:bg-amber-500/20 transition-colors"
            >
              <Sparkles size={10} /> Spot+
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 py-4">
        {/* Create show form */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden rounded-2xl border border-spot-lime/20 bg-spot-lime/5 p-4 space-y-3"
            >
              <h3 className="font-bebas text-lg text-spot-lime">Nuevo Podcast Show</h3>

              <input
                placeholder="Nombre del podcast"
                className="w-full rounded-xl border border-border bg-black/40 px-3 py-2 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-spot-lime"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                disabled={isCreating}
              />
              <textarea
                placeholder="Descripción (opcional)"
                rows={2}
                className="w-full rounded-xl border border-border bg-black/40 px-3 py-2 font-mono text-xs resize-none focus:outline-none focus:ring-1 focus:ring-spot-lime"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                disabled={isCreating}
              />

              {/* Emoji picker */}
              <div>
                <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground block mb-2">
                  Ícono:
                </span>
                <div className="flex flex-wrap gap-2">
                  {COVER_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setForm((f) => ({ ...f, coverEmoji: emoji }))}
                      className={`h-9 w-9 rounded-xl text-lg transition-all ${
                        form.coverEmoji === emoji
                          ? "bg-spot-lime/20 ring-1 ring-spot-lime scale-110"
                          : "bg-muted/40 hover:bg-muted/60"
                      }`}
                      disabled={isCreating}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCreateShow}
                  disabled={isCreating}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-spot-lime py-2 font-bebas text-lg text-black disabled:opacity-50"
                >
                  {isCreating ? "CREANDO..." : <><Mic2 size={16} /> CREAR SHOW</>}
                </button>
                <button
                  onClick={() => { setShowCreate(false); setForm({ title: "", description: "", coverEmoji: "🎙️" }); }}
                  className="rounded-xl border border-border px-4 py-2 font-mono text-xs text-muted-foreground"
                  disabled={isCreating}
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Freemium upsell banner */}
        {!isPremium && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4"
          >
            <div className="flex items-start gap-3">
              <Sparkles size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-bebas text-base text-amber-400">Crea tu propio podcast</p>
                <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                  Con Spot+ puedes crear tu show y grabar episodios. Los episodios libres los escucha cualquiera.
                </p>
                <button
                  onClick={() => navigate("/premium")}
                  className="mt-3 flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest text-black font-bold hover:bg-amber-400 transition-colors"
                >
                  <Sparkles size={10} /> Obtener Spot+
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Shows list */}
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="mb-3 h-24 animate-pulse rounded-2xl bg-muted/30" />
          ))
        ) : shows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 text-5xl">🎙️</div>
            <h2 className="font-bebas text-2xl uppercase tracking-wider text-foreground">Sin podcasts aún</h2>
            <p className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground/60">
              {isPremium
                ? "Crea el primer podcast de tu campus"
                : "Los usuarios Spot+ pueden crear podcasts"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {shows.map((show) => (
              <ShowCard
                key={show.id}
                show={show}
                onClick={() => navigate(`/podcast/show/${show.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PodcastPage;
