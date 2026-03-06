import { useState, useRef } from "react";
import { Play, Pause, Mic } from "lucide-react";
import { motion } from "framer-motion";
import CountdownRing from "./CountdownRing";

interface DropCardProps {
  username: string;
  avatarEmoji?: string;
  audioUrl: string;
  createdAt: Date;
  expiresAt: Date;
}

const DropCard = ({ username, avatarEmoji = "🎤", audioUrl, createdAt, expiresAt }: DropCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error("Auto-play error", e));
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const { currentTime, duration } = audioRef.current;
      setProgress((currentTime / (duration || 1)) * 100);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-card backdrop-blur-sm"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-xl">
          {avatarEmoji}
        </div>
        <div className="flex-1">
          <h1 className="font-bebas text-2xl tracking-[2px] text-spot-lime drop-shadow-[0_0_10px_rgba(200,255,0,0.4)]">
            {username}
          </h1>
          <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-tighter">
            {new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <CountdownRing expiresAt={expiresAt} />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-spot-lime text-black transition-transform hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(200,255,0,0.3)]"
        >
          {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
        </button>

        {/* Waveform Progress Visualizer */}
        <div className="relative flex h-8 flex-1 items-center overflow-hidden rounded-md bg-muted/40 cursor-pointer"
          onClick={(e) => {
            if (!audioRef.current || !audioRef.current.duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const percentage = (e.clientX - rect.left) / rect.width;
            audioRef.current.currentTime = percentage * audioRef.current.duration;
            setProgress(percentage * 100);
          }}>
          <div
            className="absolute left-0 top-0 h-full bg-primary/20"
            style={{ width: `${progress}%`, transition: isPlaying ? 'width 0.1s linear' : 'none' }}
          />
          <div className="absolute inset-0 flex items-center gap-[3px] px-2">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className={`w-[3px] rounded-full transition-colors duration-300 ${progress > (i / 30) * 100 ? "bg-spot-lime" : "bg-white/10"
                  }`}
                style={{ height: `${20 + Math.sin(i) * 10}px` }}
              />
            ))}
          </div>
        </div>

        <button className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary">
          <Mic size={14} />
        </button>
      </div>

      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={handleEnded}
        onTimeUpdate={handleTimeUpdate}
        preload="metadata"
      />
    </motion.div>
  );
};

export default DropCard;
