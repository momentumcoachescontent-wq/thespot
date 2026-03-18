import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Pause, Headphones, Clock, LockKeyhole, Mic, Square, Send, Plus, Sparkles, Users, UserPlus, Check, X, Trash2 } from "lucide-react";
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

interface Collaborator {
  id: string;
  user_id: string;
  status: "pending" | "accepted" | "declined";
  can_upload: boolean;
  profiles: { username: string | null; full_name: string | null };
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

  // Collaborators
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [showCollabPanel, setShowCollabPanel] = useState(false);
  const [collabSearch, setCollabSearch] = useState("");
  const [collabSearchResults, setCollabSearchResults] = useState<{ id: string; username: string | null; full_name: string | null }[]>([]);
  const [inviting, setInviting] = useState(false);

  // Play tracking
  const listenedRef = useRef<Record<string, number>>({});
  const trackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isPremium = profile?.is_premium || isAdmin;
  const isCreator = show?.creator_id === profile?.id || isAdmin;
  const isAcceptedCollaborator = collaborators.some(
    (c) => c.user_id === profile?.id && c.status === "accepted" && c.can_upload
  );

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
      const [showRes, epRes, collabRes] = await Promise.all([
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
        (supabase as any)
          .from("podcast_collaborators")
          .select("id, user_id, status, can_upload, profiles:user_id(username, full_name)")
          .eq("show_id", showId),
      ]);
      if (showRes.error) throw showRes.error;
      setShow(showRes.data);
      setEpisodes(epRes.data || []);
      setCollaborators(collabRes.data || []);
    } catch {
      toast({ title: "Error", description: "No se pudo cargar el podcast.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (query.trim().length < 2) { setCollabSearchResults([]); return; }
    const { data } = await (supabase as any)
      .from("profiles")
      .select("id, username, full_name")
      .ilike("username", `%${query.trim()}%`)
      .neq("id", profile?.id)
      .limit(5);
    setCollabSearchResults(data || []);
  };

  const inviteCollaborator = async (userId: string) => {
    if (!showId) return;
    setInviting(true);
    const { error } = await (supabase as any)
      .from("podcast_collaborators")
      .insert({ show_id: showId, user_id: userId, invited_by: profile?.id });
    setInviting(false);
    if (error) {
      toast({ title: "Error", description: error.message.includes("unique") ? "Ya fue invitado" : error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Invitación enviada" });
    setCollabSearch("");
    setCollabSearchResults([]);
    loadShow();
  };

  const removeCollaborator = async (collabId: string) => {
    await (supabase as any).from("podcast_collaborators").delete().eq("id", collabId);
    setCollaborators((prev) => prev.filter((c) => c.id !== collabId));
  };

  const respondToInvite = async (collabId: string, accept: boolean) => {
    await (supabase as any)
      .from("podcast_collaborators")
      .update({ status: accept ? "accepted" : "declined" })
      .eq("id", collabId);
    setCollaborators((prev) =>
      prev.map((c) => c.id === collabId ? { ...c, status: accept ? "accepted" : "declined" } : c)
    );
    toast({ title: accept ? "Invitación aceptada" : "Invitación rechazada" });
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
              onClick={() => setShowCollabPanel((p) => !p)}
              className="flex items-center justify-center rounded-full border border-border bg-black/40 p-2 text-muted-foreground hover:text-foreground transition-colors"
              title="Colaboradores"
            >
              <Users size={14} />
            </button>
          )}
          {(isCreator || isAcceptedCollaborator) && (
            <button
              onClick={() => isPremium ? setShowCreate(true) : navigate("/premium")}
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

        {/* Pending invite banner (for current user) */}
        {collaborators.some((c) => c.user_id === profile?.id && c.status === "pending") && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-spot-cyan/30 bg-spot-cyan/5 p-4 flex items-center gap-3"
          >
            <UserPlus size={18} className="text-spot-cyan shrink-0" />
            <p className="flex-1 font-mono text-xs text-muted-foreground">
              Te invitaron a colaborar en este podcast
            </p>
            <button
              onClick={() => {
                const c = collaborators.find((c) => c.user_id === profile?.id && c.status === "pending");
                if (c) respondToInvite(c.id, true);
              }}
              className="flex items-center gap-1 rounded-full bg-spot-cyan px-3 py-1.5 font-mono text-[10px] text-black font-bold"
            >
              <Check size={10} /> Aceptar
            </button>
            <button
              onClick={() => {
                const c = collaborators.find((c) => c.user_id === profile?.id && c.status === "pending");
                if (c) respondToInvite(c.id, false);
              }}
              className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
            >
              <X size={10} /> Rechazar
            </button>
          </motion.div>
        )}

        {/* Collaborators panel (creator only) */}
        <AnimatePresence>
          {showCollabPanel && isCreator && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden rounded-2xl border border-border bg-card p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bebas text-base text-foreground flex items-center gap-2">
                  <Users size={14} className="text-spot-cyan" /> Colaboradores
                </h3>
                <button onClick={() => setShowCollabPanel(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <input
                  placeholder="Buscar por @username"
                  value={collabSearch}
                  onChange={(e) => { setCollabSearch(e.target.value); searchUsers(e.target.value); }}
                  className="w-full rounded-xl border border-border bg-black/40 px-3 py-2 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-spot-cyan"
                />
                {collabSearchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border border-border bg-zinc-900 shadow-xl overflow-hidden">
                    {collabSearchResults.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => inviteCollaborator(u.id)}
                        disabled={inviting || collaborators.some((c) => c.user_id === u.id)}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-white/5 disabled:opacity-50"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-spot-cyan/20 font-bebas text-sm text-spot-cyan">
                          {(u.username || u.full_name || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-mono text-[11px] text-foreground">@{u.username}</p>
                          {u.full_name && <p className="font-mono text-[9px] text-muted-foreground">{u.full_name}</p>}
                        </div>
                        {collaborators.some((c) => c.user_id === u.id) ? (
                          <span className="ml-auto font-mono text-[9px] text-muted-foreground">Invitado</span>
                        ) : (
                          <UserPlus size={12} className="ml-auto text-spot-cyan" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* List */}
              {collaborators.length === 0 ? (
                <p className="font-mono text-[10px] text-muted-foreground text-center py-2">Sin colaboradores aún</p>
              ) : (
                <div className="space-y-2">
                  {collaborators.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 rounded-xl bg-black/20 px-3 py-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted font-bebas text-sm text-muted-foreground">
                        {(c.profiles.username || "?")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-[11px] text-foreground truncate">@{c.profiles.username}</p>
                      </div>
                      <span className={`font-mono text-[9px] uppercase px-2 py-0.5 rounded-full ${
                        c.status === "accepted" ? "bg-spot-lime/10 text-spot-lime" :
                        c.status === "declined" ? "bg-spot-red/10 text-spot-red" :
                        "bg-amber-400/10 text-amber-400"
                      }`}>
                        {c.status === "accepted" ? "activo" : c.status === "declined" ? "rechazó" : "pendiente"}
                      </span>
                      <button
                        onClick={() => removeCollaborator(c.id)}
                        className="text-muted-foreground hover:text-spot-red transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

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
