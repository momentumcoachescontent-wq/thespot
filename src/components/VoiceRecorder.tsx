import { useState, useRef, useEffect } from "react";
import { Mic, Square, Send, X, Play, Pause, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceRecorderProps {
  maxDuration?: number;
  onRecorded: (blob: Blob) => void;
  onCancel: () => void;
}

const VoiceRecorder = ({ maxDuration = 60, onRecorded, onCancel }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Analizador de Audio para Visualización
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
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
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        ctx.fillStyle = "#C8FF00"; // Neon Lime
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    draw();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Setup Analizador
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 64;
      source.connect(analyserRef.current);
      drawWaveform();

      // Setup Recorder
      const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? { mimeType: 'audio/webm;codecs=opus' }
        : undefined;

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
        stream.getTracks().forEach((t) => t.stop());
        if (audioContextRef.current?.state !== 'closed') {
          audioContextRef.current?.close();
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setElapsed(0);
      setAudioBlob(null);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev >= maxDuration - 1) {
            stopRecording();
            return maxDuration;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error("Microphone access denied", error);
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

  const handlePlayPreview = () => {
    if (!audioBlob) return;
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      const url = URL.createObjectURL(audioBlob);
      if (!audioRef.current) {
        audioRef.current = new Audio(url);
        audioRef.current.onended = () => setIsPlaying(false);
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleReset = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setAudioBlob(null);
    setIsPlaying(false);
    setElapsed(0);
  };

  const handleSend = () => {
    if (audioBlob) onRecorded(audioBlob);
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed inset-x-0 bottom-20 z-50 mx-auto max-w-md px-4"
    >
      <div className="rounded-2xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-bebas text-xl tracking-widest text-white uppercase italic">
            {audioBlob ? "DROP LISTO" : isRecording ? "TRANSMITIENDO..." : "INICIAR DROP"}
          </h3>
          <button onClick={onCancel} className="text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-6">
          {/* Visual Area */}
          <div className="relative flex w-full flex-col items-center justify-center h-36 bg-black/60 rounded-xl border border-white/5 overflow-hidden">
            {/* Timer Overlay (Top) */}
            <div className={`absolute top-4 font-mono text-3xl font-extrabold tabular-nums tracking-tighter z-20 transition-colors drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] ${isRecording ? "text-spot-lime" : "text-white"}`}>
              {formatTime(elapsed)}
            </div>

            {!audioBlob ? (
              <canvas
                ref={canvasRef}
                width={240}
                height={80}
                className="mt-12"
                style={{ opacity: isRecording ? 1 : 0.4, transition: "opacity 0.2s" }}
              />
            ) : (
              <div className="font-mono text-[9px] uppercase tracking-[3px] text-spot-lime animate-pulse mt-12">
                Audio listo para pre-escucha
              </div>
            )}
          </div>

          <div className="flex items-center justify-between w-full px-2 -mt-2">
            <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest">Límite: {maxDuration}s</span>
            {audioBlob && <span className="font-mono text-[9px] text-spot-lime uppercase tracking-widest font-bold">✓ Grabado</span>}
          </div>

          {/* New Control Flow */}
          <div className="flex items-center justify-center gap-6 w-full">
            {!audioBlob ? (
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`group flex h-20 w-20 items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95 ${isRecording
                  ? "bg-spot-red text-white shadow-[0_0_30px_rgba(255,50,50,0.4)] animate-pulse"
                  : "bg-spot-lime text-black shadow-[0_0_30px_rgba(200,255,0,0.4)]"
                  }`}
              >
                {isRecording ? <Square size={28} fill="currentColor" /> : <Mic size={32} fill="currentColor" />}
              </button>
            ) : (
              <div className="flex items-center gap-4 w-full justify-between">
                {/* REGRABAR */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <button
                    onClick={handleReset}
                    className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-400 border border-white/10 transition-all hover:bg-zinc-700 hover:text-white"
                  >
                    <RotateCcw size={22} />
                  </button>
                  <span className="font-mono text-[8px] uppercase tracking-widest text-zinc-500">Regrabar</span>
                </div>

                {/* ESCUCHAR */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <button
                    onClick={handlePlayPreview}
                    className={`flex h-16 w-16 items-center justify-center rounded-full transition-all hover:scale-105 ${isPlaying ? "bg-white text-black" : "bg-spot-lime text-black shadow-[0_0_20px_rgba(200,255,0,0.3)]"}`}
                  >
                    {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                  </button>
                  <span className="font-mono text-[8px] uppercase tracking-widest text-spot-lime font-bold">Escuchar</span>
                </div>

                {/* PUBLICAR */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <button
                    onClick={handleSend}
                    className="flex h-14 w-14 items-center justify-center rounded-2xl bg-spot-safe text-white shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all hover:brightness-110 active:scale-95"
                  >
                    <Send size={22} />
                  </button>
                  <span className="font-mono text-[8px] uppercase tracking-widest text-spot-safe font-bold">Publicar</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default VoiceRecorder;
