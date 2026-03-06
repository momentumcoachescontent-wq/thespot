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
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleEnded = () => setIsPlaying(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-4 shadow-card"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-xl">
          {avatarEmoji}
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground">{username}</p>
          <p className="text-[11px] text-muted-foreground">
            {new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <CountdownRing expiresAt={expiresAt} />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 active:scale-95"
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>

        {/* Waveform placeholder */}
        <div className="flex flex-1 items-center gap-[3px]">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className={`w-[3px] rounded-full ${isPlaying ? "bg-primary" : "bg-muted-foreground/30"}`}
              style={{
                height: `${8 + Math.random() * 20}px`,
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>

        <button className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary">
          <Mic size={14} />
        </button>
      </div>

      <audio ref={audioRef} src={audioUrl} onEnded={handleEnded} />
    </motion.div>
  );
};

export default DropCard;
