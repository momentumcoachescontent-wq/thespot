import { useState, useRef, useEffect } from "react";
import { Mic, Square, Send, X } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  conversationId: string;
  maxDuration?: number;
  onSent: () => void;
  onCancel: () => void;
}

const DmVoiceRecorder = ({ conversationId, maxDuration = 60, onSent, onCancel }: Props) => {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [sending, setSending] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const drawWaveform = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
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
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 64;
      source.connect(analyserRef.current);
      drawWaveform();

      const options = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? { mimeType: "audio/webm;codecs=opus" }
        : undefined;

      const mr = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: options?.mimeType ?? "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
        if (audioContextRef.current?.state !== "closed") audioContextRef.current?.close();
      };

      mr.start();
      setIsRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev >= maxDuration - 1) { stopRecording(); return maxDuration; }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Mic access denied", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setIsRecording(false);
  };

  const handleSend = async () => {
    if (!audioBlob || !user) return;
    setSending(true);
    try {
      const fileName = `${user.id}/${conversationId}-${Date.now()}.webm`;
      const { error: uploadErr } = await supabase.storage
        .from("dms")
        .upload(fileName, audioBlob, { contentType: "audio/webm" });
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from("dms").getPublicUrl(fileName);

      const { error: insertErr } = await (supabase as any).from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        message_type: "audio",
        audio_url: publicUrl,
        duration_seconds: elapsed || 1,
      });
      if (insertErr) throw insertErr;

      onSent();
    } catch (err) {
      console.error("DM audio send error:", err);
    } finally {
      setSending(false);
    }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 60, opacity: 0 }}
      className="rounded-2xl border border-white/10 bg-zinc-900/95 p-4 shadow-2xl"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-bebas text-sm tracking-widest text-white uppercase italic">
          {audioBlob ? "LISTO" : isRecording ? "GRABANDO..." : "GRABAR VOZ"}
        </span>
        <button onClick={onCancel} className="text-zinc-500 hover:text-white">
          <X size={16} />
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black/60 border border-white/5">
          <span className={`font-mono text-sm font-bold tabular-nums ${isRecording ? "text-spot-lime" : "text-white"}`}>
            {fmt(elapsed)}
          </span>
        </div>

        {!audioBlob && (
          <canvas ref={canvasRef} width={120} height={36} style={{ opacity: isRecording ? 1 : 0.3 }} />
        )}
        {audioBlob && (
          <span className="font-mono text-[9px] uppercase tracking-widest text-spot-lime">✓ Audio grabado</span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {!audioBlob ? (
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                isRecording
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-spot-lime text-black"
              }`}
            >
              {isRecording ? <Square size={16} fill="currentColor" /> : <Mic size={18} fill="currentColor" />}
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-spot-lime text-black shadow-[0_0_15px_rgba(200,255,0,0.3)] disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default DmVoiceRecorder;
