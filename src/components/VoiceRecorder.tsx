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

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
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
    } catch {
      console.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
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
          {/* Timer */}
          <div className="text-3xl font-bold tabular-nums text-foreground">
            {formatTime(elapsed)}
          </div>
          <div className="text-xs text-muted-foreground">max {maxDuration}s</div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            {!audioBlob ? (
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`flex h-16 w-16 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95 ${
                  isRecording
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
