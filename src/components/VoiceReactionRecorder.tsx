import { useState, useRef, useEffect } from "react";
import { Mic, Square, Send, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VoiceReactionRecorderProps {
  parentDropId: string;
  onDone: () => void;
  onCancel: () => void;
}

const MAX_DURATION = 3;

const VoiceReactionRecorder = ({ parentDropId, onDone, onCancel }: VoiceReactionRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isSending, setIsSending] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      audioContextRef.current?.close();
    };
  }, []);

  const drawWaveform = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyserRef.current!.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 2;
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
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 64;
      source.connect(analyserRef.current);
      drawWaveform();

      const options = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? { mimeType: "audio/webm;codecs=opus" }
        : undefined;

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: options?.mimeType || "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        audioContextRef.current?.close();
      };

      recorder.start();
      setIsRecording(true);
      setElapsed(0);

      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev >= MAX_DURATION - 1) {
            stopRecording();
            return MAX_DURATION;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      toast({ title: "Sin acceso al micrófono", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  };

  const handleSend = async () => {
    if (!audioBlob) return;
    setIsSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sin sesión");

      const fileName = `reactions/${parentDropId}-${user.id}-${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("drops")
        .upload(fileName, audioBlob, { contentType: "audio/webm" });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("drops").getPublicUrl(fileName);

      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Perfil no encontrado");

      const { error: insertError } = await (supabase as any)
        .from("voice_reactions")
        .insert({
          parent_drop_id: parentDropId,
          author_id: profile.id,
          audio_url: publicUrl,
          duration_seconds: elapsed || MAX_DURATION,
        });
      if (insertError) throw insertError;

      toast({ title: "Reacción de voz enviada 🎙️" });
      onDone();
    } catch (e: any) {
      toast({ title: "Error enviando reacción", description: e.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const progress = (elapsed / MAX_DURATION) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="mt-2 rounded-xl border border-spot-lime/20 bg-black/60 p-3 backdrop-blur-sm"
    >
      <div className="flex items-center gap-3">
        {/* Waveform canvas */}
        <div className="relative flex h-10 flex-1 items-center overflow-hidden rounded-md bg-white/5">
          {/* Progress bar */}
          <div
            className="absolute left-0 top-0 h-full bg-spot-lime/20 transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
          <canvas
            ref={canvasRef}
            width={200}
            height={32}
            className="relative z-10 w-full"
            style={{ opacity: isRecording ? 1 : 0.3 }}
          />
          {!isRecording && !audioBlob && (
            <span className="absolute inset-0 flex items-center justify-center font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              Presiona para grabar
            </span>
          )}
          {audioBlob && !isRecording && (
            <span className="absolute inset-0 flex items-center justify-center font-mono text-[9px] uppercase tracking-widest text-spot-lime">
              ✓ {elapsed}s grabados
            </span>
          )}
        </div>

        {/* Timer badge */}
        <span className="font-mono text-[10px] font-bold text-spot-lime tabular-nums w-6 text-center">
          {MAX_DURATION - elapsed}s
        </span>

        {/* Record / Stop button */}
        {!audioBlob ? (
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all ${
              isRecording
                ? "bg-spot-red text-white animate-pulse shadow-[0_0_12px_rgba(255,49,49,0.5)]"
                : "bg-spot-lime text-black shadow-[0_0_12px_rgba(200,255,0,0.3)] hover:brightness-110"
            }`}
          >
            {isRecording ? <Square size={14} fill="currentColor" /> : <Mic size={14} fill="currentColor" />}
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={isSending}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-spot-safe text-white shadow-[0_0_12px_rgba(34,197,94,0.3)] transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
          >
            <Send size={14} />
          </button>
        )}

        {/* Cancel */}
        <button
          onClick={onCancel}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-muted-foreground hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </motion.div>
  );
};

export default VoiceReactionRecorder;
