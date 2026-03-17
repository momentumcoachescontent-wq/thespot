import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Pause, Headphones, Clock, LockKeyhole, Mic, Square, Send, Plus, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { usePodcastPlayer, type PlayingEpisode } from "@/contexts/PodcastPlayerContext";

interface Show {
  id: string;
  title: string;
  description: string | null;
  cover_emoji: string;
  creator_id: string;
  university_domain: string | null;
  is_official: boolean;
  profiles?: { username: string | null };
}

interface Episode {
  id: string;
  show_id: string;
  title: string;
  description: string | null;
  audio_url: string;
  duration_seconds: number;
  episode_number: number | null;
  access_tier: "free" | "premium";
  play_count: number;
  created_at: string;
}

const EpisodeCard = ({
  episode, show, isPlaying, canPlay, onToggle,
}: {
  episode: Episode;
  show: Show;
  isPlaying: boolean;
  canPlay: boolean;
  onToggle: () => void;
}) => {
  const mins = Math.floor(episode.duration_seconds / 60);
  const secs = episode.duration_seconds % 60;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          disabled={!canPlay}
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-spot-lime text-black shadow-[0_0_12px_rgba(200,255,0,0.25)] transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {!canPlay ? (
            <LockKeyhole size={14} />
          ) : isPlaying ? (
            <Pause size={16} fill="currentColor" />
          ) : (
            <Play size={16} fill="currentColor" className="ml-0.5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {episode.episode_number != null && (
              <span className="shrink-0 font-mono text-[9px] text-muted-foreground">
                Ep. {episode.episode_number}
              </span>
            )}
            <h3 className="font-bebas text-base leading-none text-foreground truncate">
              {episode.title}
            </h3>
            {episode.access_tier === "premium" && (
              <span className="shrink-0 rounded-full bg-amber-500/20 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-amber-400">
                Spot+
              </span>
            )}
          </div>
          {episode.description && (
            <p className="mt-1 font-mono text-[10px] text-muted-foreground line-clamp-2">
              {episode.description}
            </p>
          )}
          <div className="mt-2 flex items-center gap-3">
            <span className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground">
              <Clock size={10} /> {mins}:{String(secs).padStart(2, "0")}
            </span>
            <span className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground">
              <Headphones size={10} /> {episode.play_count}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const ShowDetailPage = () => {
  const { showId } = useParams<{ showId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, profile, user } = useAuth();
  const { currentEpisode, isPlaying, play, pause } = usePodcastPlayer();

  const [show, setShow] = useState<Show | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    accessTier: "free" as "free" | "premium",
    useExpiry: false,
    days: 3,
  });

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Play tracking
  const listenedRef = useRef<Record<string, number>>({});
  const trackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isPremium = profile?.is_premium || isAdmin;
  const isCreator = show?.creator_id === profile?.id || isAdmin;

  useEffect(() => {
    if (showId) loadShow();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (trackIntervalRef.current) clearInterval(trackIntervalRef.current);
    };
  }, [showId]);

  const loadShow = async () => {
    setLoading(true);
    try {
      const [showRes, epRes] = await Promise.all([
        (supabase as any)
          .from("podcast_shows")
          .select("*, profiles:creator_id(username)")
          .eq("id", showId)
          .single(),
        (supabase as any)
          .from("podcast_episodes")
          .select("*")
          .eq("show_id", showId)
          .eq("status", "published")
          .order("episode_number", { ascending: true }),
      ]);
      if (showRes.error) throw showRes.error;
      setShow(showRes.data);
      setEpisodes(epRes.data || []);
    } catch {
      toast({ title: "Error", description: "No se pudo cargar el podcast.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ── Recording helpers ──────────────────────────────────
  const drawWaveform = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const bufLen = analyserRef.current.frequencyBinCount;
    const data = new Uint8Array(bufLen);
    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyserRef.current!.getByteFrequencyData(data);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bw = (canvas.width / bufLen) * 2.5;
      let x = 0;
      for (let i = 0; i < bufLen; i++) {
        const bh: number = data[i] / 2.5;
        ctx.fillStyle = "#C8FF00";
        ctx.fillRect(x, canvas.height - bh, bw, bh);
        x += bw + 1;
      }
    };
    draw();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ac = new (window.AudioContext || (window as any).webkitAudioContext)();
      const src = ac.createMediaStreamSource(stream);
      analyserRef.current = ac.createAnalyser();
      analyserRef.current.fftSize = 64;
      src.connect(analyserRef.current);
      drawWaveform();

      const opts = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? { mimeType: "audio/webm;codecs=opus" } : undefined;
      const mr = new MediaRecorder(stream, opts);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        setAudioBlob(new Blob(chunksRef.current, { type: opts?.mimeType ?? "audio/webm" }));
        stream.getTracks().forEach((t) => t.stop());
        ac.close();
      };
      mr.start();
      setIsRecording(true);
      setElapsed(0);
      setAudioBlob(null);
      timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
    } catch {
      toast({ title: "Acceso denegado", description: "Necesitamos permiso para el micrófono.", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setIsRecording(false);
  };

  const handlePublishEpisode = async () => {
    if (!audioBlob || !form.title.trim()) {
      toast({ title: "Faltan datos", description: "Ponle un título al episodio.", variant: "destructive" });
      return;
    }
    setIsPublishing(true);
    try {
      if (!user || !showId) return;
      const fileName = `${user.id}-${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage.from("podcasts").upload(fileName, audioBlob);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("podcasts").getPublicUrl(fileName);

      const nextEp = episodes.length + 1;
      const expiresAt = form.useExpiry
        ? (() => { const d = new Date(); d.setDate(d.getDate() + form.days); return d.toISOString(); })()
        : null;

      const { error: dbError } = await (supabase as any).from("podcast_episodes").insert({
        show_id: showId,
        title: form.title,
        description: form.description || null,
        audio_url: publicUrl,
        duration_seconds: elapsed,
        episode_number: nextEp,
        access_tier: form.accessTier,
        status: "published",
        expires_at: expiresAt,
      });
      if (dbError) throw dbError;

      toast({ title: "Episodio publicado", description: `Ep. ${nextEp} ya está al aire.` });
      setShowCreate(false);
      setAudioBlob(null);
      setElapsed(0);
      setForm({ title: "", description: "", accessTier: "free", useExpiry: false, days: 3 });
      loadShow();
    } catch (e: any) {
      toast({ title: "Error al publicar", description: e.message, variant: "destructive" });
    } finally {
      setIsPublishing(false);
    }
  };

  // ── Playback ───────────────────────────────────────────
  const startTracking = (epId: string, episode: PlayingEpisode) => {
    if (trackIntervalRef.current) clearInterval(trackIntervalRef.current);
    listenedRef.current[epId] = listenedRef.current[epId] ?? 0;
    trackIntervalRef.current = setInterval(() => {
      listenedRef.current[epId] = (listenedRef.current[epId] ?? 0) + 1;
      if (listenedRef.current[epId] === 15) {
        (supabase as any).rpc("increment_episode_play_count", {
          p_episode_id: epId,
          p_listened_secs: 15,
        });
      }
    }, 1000);
  };

  const handleTogglePlay = (episode: Episode) => {
    const canPlay = episode.access_tier === "free" || isPremium;
    if (!canPlay) { navigate("/premium"); return; }

    const ep: PlayingEpisode = {
      id: episode.id,
      title: episode.title,
      audio_url: episode.audio_url,
      duration_seconds: episode.duration_seconds,
      access_tier: episode.access_tier,
      show: { id: showId!, title: show?.title ?? "" },
    };

    if (currentEpisode?.id === episode.id && isPlaying) {
      pause();
      if (trackIntervalRef.current) clearInterval(trackIntervalRef.current);
    } else {
      play(ep);
      startTracking(episode.id, ep);
    }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // ── Loading / Not found ────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-background p-4 space-y-3">
      <div className="h-8 w-32 animate-pulse rounded-xl bg-muted/30" />
      <div className="h-24 animate-pulse rounded-2xl bg-muted/30" />
      <div className="h-20 animate-pulse rounded-2xl bg-muted/30" />
    </div>
  );

  if (!show) return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center p-4">
      <p className="font-bebas text-2xl text-muted-foreground">Show no encontrado</p>
      <button onClick={() => navigate("/podcast")} className="mt-4 font-mono text-xs text-spot-lime underline">
        Volver
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-4">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate("/podcast")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bebas text-xl leading-none text-foreground truncate">{show.title}</h1>
            {show.profiles?.username && (
              <p className="font-mono text-[10px] text-muted-foreground">@{show.profiles.username}</p>
            )}
          </div>
          {isCreator && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 rounded-full bg-spot-lime px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-black shadow-[0_0_10px_rgba(200,255,0,0.25)]"
            >
              <Plus size={10} /> Ep.
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 py-4 space-y-4">
        {/* Show info card */}
        <div className="rounded-2xl border border-border bg-card p-4 flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-muted text-3xl">
            {show.cover_emoji}
          </div>
          <div className="flex-1 min-w-0">
            {show.description && (
              <p className="font-mono text-xs text-muted-foreground">{show.description}</p>
            )}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {show.is_official && (
                <span className="rounded-full bg-spot-lime/20 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-spot-lime">
                  Oficial
                </span>
              )}
              <span className="font-mono text-[9px] text-muted-foreground">
                {episodes.length} episodio{episodes.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Create episode form */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden rounded-2xl border border-spot-lime/20 bg-spot-lime/5 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bebas text-lg text-spot-lime">Ep. {episodes.length + 1}</h3>
                {isRecording && (
                  <span className="flex items-center gap-1.5 animate-pulse text-spot-red font-mono text-[10px] uppercase font-bold">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-500" /> Al aire
                  </span>
                )}
              </div>

              <input
                placeholder="Título del episodio"
                className="w-full rounded-xl border border-border bg-black/40 px-3 py-2 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-spot-lime"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                disabled={isRecording || isPublishing}
              />
              <textarea
                placeholder="Descripción (opcional)"
                rows={2}
                className="w-full rounded-xl border border-border bg-black/40 px-3 py-2 font-mono text-xs resize-none focus:outline-none focus:ring-1 focus:ring-spot-lime"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                disabled={isRecording || isPublishing}
              />

              {/* Access tier */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">Acceso:</span>
                {(["free", "premium"] as const).map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setForm((f) => ({ ...f, accessTier: tier }))}
                    className={`h-7 px-3 rounded-full font-mono text-[9px] transition-all ${
                      form.accessTier === tier
                        ? tier === "premium" ? "bg-amber-500 text-black" : "bg-spot-lime text-black"
                        : "border border-border text-muted-foreground"
                    }`}
                    disabled={isRecording || isPublishing}
                  >
                    {tier === "free" ? "Libre" : "Spot+"}
                  </button>
                ))}
              </div>

              {/* Expiry */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setForm((f) => ({ ...f, useExpiry: !f.useExpiry }))}
                  className={`h-7 px-3 rounded-full font-mono text-[9px] transition-all border ${
                    form.useExpiry ? "border-spot-lime text-spot-lime" : "border-border text-muted-foreground"
                  }`}
                  disabled={isRecording || isPublishing}
                >
                  {form.useExpiry ? "✓ Expira en:" : "Sin expiración"}
                </button>
                {form.useExpiry && [1, 3, 5].map((d) => (
                  <button
                    key={d}
                    onClick={() => setForm((f) => ({ ...f, days: d }))}
                    className={`h-7 px-3 rounded-full font-mono text-[9px] transition-all ${
                      form.days === d ? "bg-spot-lime text-black" : "border border-border text-muted-foreground"
                    }`}
                    disabled={isRecording || isPublishing}
                  >
                    {d}d
                  </button>
                ))}
              </div>

              {/* Waveform */}
              <div className="relative flex flex-col items-center justify-center h-28 bg-black/60 rounded-xl border border-border overflow-hidden">
                <div className={`absolute top-2 font-mono text-xl tabular-nums ${isRecording ? "text-spot-lime" : "text-muted-foreground"}`}>
                  {fmt(elapsed)}
                </div>
                <canvas ref={canvasRef} width={280} height={50} className="mt-4" />
                {audioBlob && !isRecording && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <span className="font-mono text-[10px] text-spot-lime uppercase tracking-widest font-bold">✓ Grabación lista</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {!audioBlob ? (
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 font-bebas text-lg transition-all ${
                      isRecording ? "bg-spot-red text-white animate-pulse" : "bg-zinc-800 text-white"
                    }`}
                    disabled={isPublishing}
                  >
                    {isRecording ? <><Square size={14} /> DETENER</> : <><Mic size={14} /> GRABAR</>}
                  </button>
                ) : (
                  <button
                    onClick={handlePublishEpisode}
                    disabled={isPublishing}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-spot-lime py-2 font-bebas text-lg text-black disabled:opacity-50"
                  >
                    {isPublishing ? "PUBLICANDO..." : <><Send size={14} /> PUBLICAR</>}
                  </button>
                )}
                <button
                  onClick={() => { if (!isRecording) { setShowCreate(false); setAudioBlob(null); setElapsed(0); } }}
                  className="rounded-xl border border-border px-4 py-2 font-mono text-xs text-muted-foreground"
                  disabled={isRecording || isPublishing}
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Non-premium upsell (show-level) */}
        {!isPremium && episodes.some((e) => e.access_tier === "premium") && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 flex items-center gap-3">
            <Sparkles size={16} className="text-amber-400 shrink-0" />
            <p className="flex-1 font-mono text-[10px] text-muted-foreground">
              Algunos episodios son exclusivos de Spot+
            </p>
            <button
              onClick={() => navigate("/premium")}
              className="shrink-0 rounded-full bg-amber-500 px-3 py-1 font-mono text-[9px] uppercase tracking-widest text-black font-bold"
            >
              Spot+
            </button>
          </div>
        )}

        {/* Episodes */}
        {episodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 text-4xl">{show.cover_emoji}</div>
            <h2 className="font-bebas text-xl uppercase tracking-wider text-foreground">Sin episodios aún</h2>
            <p className="mt-1 font-mono text-xs text-muted-foreground/60">
              {isCreator ? "Graba el primer episodio" : "El creador aún no ha publicado episodios"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {episodes.map((ep) => (
              <EpisodeCard
                key={ep.id}
                episode={ep}
                show={show}
                isPlaying={currentEpisode?.id === ep.id && isPlaying}
                canPlay={ep.access_tier === "free" || isPremium}
                onToggle={() => handleTogglePlay(ep)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShowDetailPage;
