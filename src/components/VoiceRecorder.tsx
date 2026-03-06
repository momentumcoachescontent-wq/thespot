import { useState, useRef, useEffect } from "react";
import { Mic, Square, Send, X } from "lucide-react";
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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Analizador de Audio para Visualización
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
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
        ctx.fillStyle = `rgb(${barHeight + 100}, 69, 96)`; // Acento coral
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

      // Setup Recorder: Forzamos Opus si es posible
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
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setElapsed(0);
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
      className="fixed inset-x-0 bottom-16 z-50 mx-auto max-w-md px-4"
    >
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">
            {audioBlob ? "Ready to drop" : isRecording ? "Recording..." : "Record a Drop"}
          </h3>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4">
          {/* Visualizador / Timer */}
          <div className="relative flex w-full flex-col items-center justify-center h-20">
            {!audioBlob ? (
              <canvas
                ref={canvasRef}
                width={200}
                height={60}
                className="absolute inset-0 mx-auto"
                style={{ opacity: isRecording ? 1 : 0, transition: "opacity 0.2s" }}
              />
            ) : (
              <div className="text-xl font-medium text-emerald-400">Audio capturado ({formatTime(elapsed)})</div>
            )}

            <div className={`text-3xl font-bold tabular-nums text-foreground z-10 drop-shadow-md ${isRecording ? "text-white" : ""}`}>
              {formatTime(elapsed)}
            </div>
          </div>
          <div className="text-xs text-muted-foreground -mt-2">Límite: {maxDuration}s</div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            {!audioBlob ? (
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`flex h-16 w-16 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95 ${isRecording
                    ? "bg-destructive text-destructive-foreground animate-pulse-glow"
                    : "bg-primary text-primary-foreground shadow-glow"
                  }`}
              >
                {isRecording ? <Square size={24} /> : <Mic size={28} />}
              </button>
            ) : (
              <button
                onClick={handleSend}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-spot-safe text-primary-foreground transition-transform hover:scale-105 active:scale-95"
              >
                <Send size={24} />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default VoiceRecorder;
