import { useState, useRef } from "react";
import { Play, Pause } from "lucide-react";
import { Message } from "@/hooks/useMessages";

interface Props {
  message: Message;
  isMine: boolean;
}

const AudioPlayer = ({ url, duration }: { url: string; duration: number | null }) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggle = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.ontimeupdate = () => {
        if (audioRef.current) {
          setProgress(audioRef.current.currentTime / (audioRef.current.duration || 1));
        }
      };
      audioRef.current.onended = () => { setPlaying(false); setProgress(0); };
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <button
        onClick={toggle}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-spot-lime/20 text-spot-lime hover:bg-spot-lime/30 transition-colors"
      >
        {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
      </button>
      <div className="flex-1 space-y-1">
        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-spot-lime transition-all" style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="font-mono text-[8px] text-muted-foreground">{fmt(duration ?? 0)}</p>
      </div>
    </div>
  );
};

const MessageBubble = ({ message, isMine }: Props) => {
  const time = new Date(message.created_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-3 py-2 ${
          isMine
            ? "rounded-br-sm bg-spot-lime text-black"
            : "rounded-bl-sm border border-white/10 bg-white/5 text-foreground"
        }`}
      >
        {message.message_type === "audio" ? (
          <AudioPlayer url={message.audio_url!} duration={message.duration_seconds} />
        ) : (
          <p className="font-mono text-[11px] leading-relaxed">{message.content}</p>
        )}
        <p className={`mt-1 font-mono text-[8px] text-right ${isMine ? "text-black/50" : "text-muted-foreground"}`}>
          {time}
        </p>
      </div>
    </div>
  );
};

export default MessageBubble;
