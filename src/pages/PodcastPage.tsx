import { useState, useEffect, useRef } from "react";
import { Headphones, Play, Pause, Plus, Lock, Clock, Mic, Square, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  const { isAdmin, profile, user } = useAuth();
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", days: 3 });
  const audioRef = useRef<HTMLAudioElement>(null);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Consider isPremium if the profile says so OR if the user is an admin
  const isPremium = profile?.is_premium || isAdmin;

  useEffect(() => {
    loadPodcasts();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

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

  const drawWaveform = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2.5;
        ctx.fillStyle = "#C8FF00";
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    draw();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      analyserRef.current = audioCtx.createAnalyser();
      analyserRef.current.fftSize = 64;
      source.connect(analyserRef.current);
      drawWaveform();

      const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? { mimeType: 'audio/webm;codecs=opus' } : undefined;

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const type = options ? options.mimeType : "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
        audioCtx.close();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setElapsed(0);
      setAudioBlob(null);
      timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000);
    } catch (e) {
      toast({ title: "Acceso denegado", description: "Necesitamos permiso para el micrófono.", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setIsRecording(false);
  };

  const handlePublish = async () => {
    if (!audioBlob || !form.title) {
      toast({ title: "Faltan datos", description: "Ponle un título a tu podcast.", variant: "destructive" });
      return;
    }

    setIsPublishing(true);
    try {
      if (!user) return;

      const fileName = `${user.id}-${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("podcasts")
        .upload(fileName, audioBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("podcasts").getPublicUrl(fileName);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + form.days);

      const { error: dbError } = await (supabase as any).from("podcasts").insert({
        title: form.title,
        description: form.description,
        audio_url: publicUrl,
        duration_seconds: elapsed,
        creator_id: user.id,
        is_premium: true,
        expires_at: expiresAt.toISOString(),
      });

      if (dbError) throw dbError;

      toast({ title: "Podcast publicado", description: "Tu contenido ya está al aire." });
      setShowCreate(false);
      setAudioBlob(null);
      setElapsed(0);
      setForm({ title: "", description: "", days: 3 });
      loadPodcasts();
    } catch (e: any) {
      toast({ title: "Error al publicar", description: e.message, variant: "destructive" });
    } finally {
      setIsPublishing(false);
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

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

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
              className="flex items-center gap-1.5 rounded-full bg-spot-lime px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-black shadow-[0_0_12px_rgba(200,255,0,0.3)]"
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

        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden rounded-2xl border border-spot-lime/20 bg-spot-lime/5 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bebas text-lg text-spot-lime">Nuevo Podcast</h3>
                {isRecording && <span className="flex items-center gap-1.5 animate-pulse text-spot-red font-mono text-[10px] uppercase font-bold"><div className="h-1.5 w-1.5 rounded-full bg-red-500" /> Al aire</span>}
              </div>

              <input
                placeholder="Título del podcast"
                className="w-full rounded-xl border border-border bg-black/40 px-3 py-2 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-spot-lime"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                disabled={isRecording || isPublishing}
              />
              <textarea
                placeholder="Descripción (opcional)"
                rows={2}
                className="w-full rounded-xl border border-border bg-black/40 px-3 py-2 font-mono text-xs resize-none focus:outline-none focus:ring-1 focus:ring-spot-lime"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                disabled={isRecording || isPublishing}
              />

              {/* Recording Area */}
              <div className="relative flex flex-col items-center justify-center h-32 bg-black/60 rounded-xl border border-border overflow-hidden">
                <div className={`absolute top-2 font-mono text-xl tabular-nums ${isRecording ? "text-spot-lime" : "text-muted-foreground"}`}>
                  {formatTime(elapsed)}
                </div>
                <canvas ref={canvasRef} width={280} height={60} className="mt-4" />
                {audioBlob && !isRecording && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <span className="font-mono text-[10px] text-spot-lime uppercase tracking-widest font-bold">✓ Grabación lista</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">Expiración:</span>
                  {[1, 3, 5].map(d => (
                    <button
                      key={d}
                      onClick={() => setForm(f => ({ ...f, days: d }))}
                      className={`h-7 px-3 rounded-full font-mono text-[9px] transition-all ${form.days === d ? "bg-spot-lime text-black" : "border border-border text-muted-foreground"}`}
                      disabled={isRecording || isPublishing}
                    >
                      {d}d
                    </button>
                  ))}
                </div>

                {audioBlob && !isRecording ? (
                  <button
                    onClick={() => { setAudioBlob(null); setElapsed(0); }}
                    className="font-mono text-[9px] text-muted-foreground underline uppercase tracking-tighter"
                  >
                    Borrar
                  </button>
                ) : null}
              </div>

              <div className="flex gap-2">
                {!audioBlob ? (
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 font-bebas text-lg transition-all ${isRecording ? "bg-spot-red text-white animate-pulse" : "bg-zinc-800 text-white"}`}
                    disabled={isPublishing}
                  >
                    {isRecording ? <Square size={16} /> : <Mic size={16} />}
                    {isRecording ? "DETENER" : "GRABAR"}
                  </button>
                ) : (
                  <button
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-spot-lime py-2 font-bebas text-lg text-black disabled:opacity-50"
                  >
                    {isPublishing ? "PUBLICANDO..." : <><Send size={16} /> PUBLICAR PODCAST</>}
                  </button>
                )}

                <button onClick={() => { if (!isRecording) setShowCreate(false); }} className="rounded-xl border border-border px-4 py-2 font-mono text-xs text-muted-foreground" disabled={isRecording || isPublishing}>
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
