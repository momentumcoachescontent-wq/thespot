import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { motion } from "framer-motion";
import CountdownRing from "./CountdownRing";
import { supabase } from "@/integrations/supabase/client";

interface DropCardProps {
  id: string;
  username: string;
  avatarEmoji?: string;
  audioUrl: string;
  createdAt: Date;
  expiresAt: Date;
  durationSeconds?: number;
  initialListenedCount?: number;
}

const REACTIONS = [
  { emoji: "🔥", code: "fire" },
  { emoji: "❤️", code: "heart" },
  { emoji: "👏", code: "clap" },
  { emoji: "😂", code: "laugh" },
  { emoji: "😢", code: "cry" },
  { emoji: "🤯", code: "mind_blown" },
];

const DropCard = ({ id, username, avatarEmoji = "🎤", audioUrl, createdAt, expiresAt, durationSeconds = 0, initialListenedCount = 0 }: DropCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [listenedCount, setListenedCount] = useState(initialListenedCount);
  const [timeLeft, setTimeLeft] = useState("");
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({ fire: 0, heart: 0, clap: 0, laugh: 0, cry: 0, mind_blown: 0 });
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasCountedRef = useRef(false);

  // Sync with parent props (for realtime updates)
  useEffect(() => {
    setListenedCount(initialListenedCount);
  }, [initialListenedCount]);

  useEffect(() => {
    // Update time left
    const updateTime = () => {
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft("Expirado");
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, "0")}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
    loadReactions();

    // Subscribe to reactions table for this drop
    const channel = (supabase as any)
      .channel(`reactions-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "reactions", filter: `drop_id=eq.${id}` }, () => {
        loadReactions();
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [id]);

  const loadReactions = async () => {
    try {
      const { data } = await (supabase as any)
        .from('reactions')
        .select('emoji_code, user_id')
        .eq('drop_id', id)
        .eq('type', 'emoji');

      if (!data) return;

      const counts: Record<string, number> = { fire: 0, heart: 0, clap: 0, laugh: 0, cry: 0, mind_blown: 0 };
      data.forEach((r: any) => {
        if (r.emoji_code && counts[r.emoji_code] !== undefined) {
          counts[r.emoji_code]++;
        }
      });
      setReactionCounts(counts);

      // Detect current user's reaction
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const mine = data.find((r: any) => r.user_id === user.id);
        setUserReaction(mine?.emoji_code || null);
      }
    } catch (e) {
      console.warn("Error loading reactions:", e);
    }
  };

  const totalReactions = Object.values(reactionCounts).reduce((a, b) => a + b, 0);

  const handleReaction = async (code: string) => {
    if (!userId) return;

    const isRemoving = userReaction === code;

    // Optimistic update
    setReactionCounts((prev) => ({
      ...prev,
      [code]: isRemoving ? Math.max(0, prev[code] - 1) : prev[code] + 1,
      ...(userReaction && userReaction !== code
        ? { [userReaction]: Math.max(0, prev[userReaction] - 1) }
        : {}),
    }));
    setUserReaction(isRemoving ? null : code);

    try {
      // Remove previous reaction
      if (userReaction) {
        await (supabase as any)
          .from('reactions')
          .delete()
          .eq('drop_id', id)
          .eq('user_id', userId);
      }
      // Insert new reaction if not removing
      if (!isRemoving) {
        await (supabase as any).from('reactions').insert({
          drop_id: id,
          user_id: userId,
          type: 'emoji',
          emoji_code: code,
        });
      }
    } catch (e) {
      console.warn("Reaction error:", e);
      loadReactions(); // Revert optimistic update on error
    }
  };

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
      const currentProgress = (currentTime / (duration || 1)) * 100;
      setProgress(currentProgress);

      // Listener logic: 30% of duration
      if (currentProgress >= 30 && !hasCountedRef.current) {
        hasCountedRef.current = true;
        // Increment locally for immediate feedback
        setListenedCount(prev => prev + 1);
        (supabase as any).rpc('increment_listened_count', { drop_id: id })
          .catch((error: any) => {
            console.error("Error incrementing listener count:", error);
            // Revert local increment if failed? (Better to keep it for UX unless critical)
          });
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    hasCountedRef.current = false; // Permite volver a contar si lo escucha de nuevo
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
          <div className="flex items-center gap-3">
            <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-tighter">
              {new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground">
                👂 {listenedCount}
              </span>
              <span className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground">
                🔥 {totalReactions}
              </span>
            </div>
            <div className="flex items-center gap-1 bg-spot-red/10 px-1.5 py-0.5 rounded border border-spot-red/20 ml-auto">
              <span className="font-mono text-[9px] text-spot-red font-bold uppercase tracking-widest whitespace-nowrap">
                {timeLeft}
              </span>
            </div>
          </div>
        </div>
        <div className="scale-75 origin-right">
          <CountdownRing expiresAt={expiresAt} />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-spot-lime text-black transition-transform hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(200,255,0,0.3)]"
        >
          {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
        </button>

        {/* Waveform Progress Visualizer */}
        <div
          className="relative flex h-8 flex-1 items-center overflow-hidden rounded-md bg-muted/40 cursor-pointer"
          onClick={(e) => {
            if (!audioRef.current || !audioRef.current.duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const percentage = (e.clientX - rect.left) / rect.width;
            audioRef.current.currentTime = percentage * audioRef.current.duration;
            setProgress(percentage * 100);
          }}
        >
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
      </div>

      {/* Sticker Reactions */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {REACTIONS.map(({ emoji, code }) => {
          const isActive = userReaction === code;
          const count = reactionCounts[code] || 0;
          return (
            <motion.button
              key={code}
              whileTap={{ scale: 0.85 }}
              onClick={() => handleReaction(code)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-all ${isActive
                ? "bg-spot-lime/20 border border-spot-lime/60 text-spot-lime"
                : "bg-white/5 border border-white/10 text-muted-foreground hover:border-white/30"
                }`}
            >
              <span className="text-sm">{emoji}</span>
              {count > 0 && (
                <span className={`font-mono text-[10px] ${isActive ? "text-spot-lime" : "text-muted-foreground"}`}>
                  {count}
                </span>
              )}
            </motion.button>
          );
        })}
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
