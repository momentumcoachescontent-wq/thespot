import { useState, useRef, useEffect } from "react";
import { Play, Pause, Trash2, Mic } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CountdownRing from "./CountdownRing";
import VoiceReactionRecorder from "./VoiceReactionRecorder";
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

interface VoiceReaction {
  id: string;
  audio_url: string;
  author_id: string;
}

const REACTIONS = [
  { emoji: "🔥", code: "fire" },
  { emoji: "❤️", code: "heart" },
  { emoji: "👏", code: "clap" },
  { emoji: "😂", code: "laugh" },
  { emoji: "😢", code: "cry" },
  { emoji: "🤯", code: "mind_blown" },
];

const DropCard = ({ id, username, avatarEmoji = "🎤", audioUrl, createdAt, expiresAt, initialListenedCount = 0 }: DropCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [listenedCount, setListenedCount] = useState(initialListenedCount);
  const [timeLeft, setTimeLeft] = useState("");
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({ fire: 0, heart: 0, clap: 0, laugh: 0, cry: 0, mind_blown: 0 });
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [voiceReactions, setVoiceReactions] = useState<VoiceReaction[]>([]);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasCountedRef = useRef(false);

  useEffect(() => {
    setListenedCount(initialListenedCount);
  }, [initialListenedCount]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();
      if (diff <= 0) { setTimeLeft("Expirado"); return; }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, "0")}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  useEffect(() => {
    (supabase as any).auth.getUser().then(({ data: { user } }: any) => {
      if (user) {
        setUserId(user.id);
        (supabase as any).from('profiles').select('role').eq('id', user.id).single()
          .then(({ data }: any) => {
            if (data?.role === 'admin') setIsAdminUser(true);
          });
      }
    });
    loadReactions();
    loadVoiceReactions();

    const channel = (supabase as any)
      .channel(`reactions-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "reactions", filter: `drop_id=eq.${id}` }, () => {
        loadReactions();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "voice_reactions", filter: `parent_drop_id=eq.${id}` }, () => {
        loadVoiceReactions();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
      voiceAudioRef.current?.pause();
    };
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
        if (r.emoji_code && counts[r.emoji_code] !== undefined) counts[r.emoji_code]++;
      });
      setReactionCounts(counts);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const mine = data.find((r: any) => r.user_id === user.id);
        setUserReaction(mine?.emoji_code || null);
      }
    } catch (e) {
      console.warn("Error loading reactions:", e);
    }
  };

  const loadVoiceReactions = async () => {
    try {
      const { data } = await (supabase as any)
        .from('voice_reactions')
        .select('id, audio_url, author_id')
        .eq('parent_drop_id', id)
        .order('created_at', { ascending: true });
      if (data) setVoiceReactions(data);
    } catch (e) {
      console.warn("Error loading voice reactions:", e);
    }
  };

  const toggleVoicePlay = (vr: VoiceReaction) => {
    if (playingVoiceId === vr.id) {
      voiceAudioRef.current?.pause();
      setPlayingVoiceId(null);
      return;
    }
    voiceAudioRef.current?.pause();
    const audio = new Audio(vr.audio_url);
    audio.onended = () => setPlayingVoiceId(null);
    audio.play().catch(() => {});
    voiceAudioRef.current = audio;
    setPlayingVoiceId(vr.id);
  };

  const totalReactions = Object.values(reactionCounts).reduce((a, b) => a + b, 0);

  const handleReaction = async (code: string) => {
    if (!userId) return;
    const currentReaction = userReaction;
    const isRemoving = currentReaction === code;

    setReactionCounts((prev) => {
      const newCounts = { ...prev };
      if (currentReaction && currentReaction !== code) newCounts[currentReaction] = Math.max(0, newCounts[currentReaction] - 1);
      if (isRemoving) newCounts[code] = Math.max(0, newCounts[code] - 1);
      else newCounts[code] = newCounts[code] + 1;
      return newCounts;
    });
    setUserReaction(isRemoving ? null : code);

    try {
      if (isRemoving) {
        const { error } = await (supabase as any).from('reactions').delete().eq('drop_id', id).eq('user_id', userId).eq('type', 'emoji');
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('reactions').upsert({ drop_id: id, user_id: userId, type: 'emoji', emoji_code: code }, { onConflict: 'drop_id,user_id,type' });
        if (error) throw error;
      }
    } catch (e: any) {
      console.warn("Reaction error:", e);
      loadReactions();
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play().catch(e => console.error("Auto-play error", e));
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const { currentTime, duration } = audioRef.current;
      const currentProgress = (currentTime / (duration || 1)) * 100;
      setProgress(currentProgress);
      if (currentProgress >= 30 && !hasCountedRef.current) {
        hasCountedRef.current = true;
        setListenedCount(prev => prev + 1);
        (supabase as any).rpc('increment_listened_count', { drop_id: id })
          .then(({ error }: any) => { if (error) console.error("Error incrementing listener count:", error); });
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    hasCountedRef.current = false;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-card backdrop-blur-sm"
    >
      {/* Header */}
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
              <span className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground">👂 {listenedCount}</span>
              <span className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground">🔥 {totalReactions}</span>
              {voiceReactions.length > 0 && (
                <span className="flex items-center gap-1 font-mono text-[9px] text-spot-lime/70">🎙 {voiceReactions.length}</span>
              )}
            </div>
            <div className="flex items-center gap-1 bg-spot-red/10 px-1.5 py-0.5 rounded border border-spot-red/20 ml-auto">
              <span className="font-mono text-[9px] text-spot-red font-bold uppercase tracking-widest whitespace-nowrap">{timeLeft}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 scale-75 origin-right">
          <CountdownRing expiresAt={expiresAt} />
          {isAdminUser && (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                if (window.confirm("¿Seguro que deseas borrar este drop como Arquitecto?")) {
                  const { error } = await (supabase as any).from('drops').delete().eq('id', id);
                  if (!error) window.location.reload();
                }
              }}
              className="p-2 rounded-full bg-spot-red/10 text-spot-red hover:bg-spot-red/20 transition-colors border border-spot-red/20"
              title="Borrar Drop (Arquitecto)"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Audio Player */}
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-spot-lime text-black transition-transform hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(200,255,0,0.3)]"
        >
          {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
        </button>
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
          <div className="absolute left-0 top-0 h-full bg-primary/20" style={{ width: `${progress}%`, transition: isPlaying ? 'width 0.1s linear' : 'none' }} />
          <div className="absolute inset-0 flex items-center gap-[3px] px-2">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className={`w-[3px] rounded-full transition-colors duration-300 ${progress > (i / 30) * 100 ? "bg-spot-lime" : "bg-white/10"}`}
                style={{ height: `${20 + Math.sin(i) * 10}px` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Emoji Reactions + Voice Reaction button */}
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
              {count > 0 && <span className={`font-mono text-[10px] ${isActive ? "text-spot-lime" : "text-muted-foreground"}`}>{count}</span>}
            </motion.button>
          );
        })}

        {/* Voice Reaction trigger */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => setShowVoiceRecorder((v) => !v)}
          title="Responder con voz (3 seg)"
          className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs transition-all ${showVoiceRecorder
            ? "bg-spot-lime/20 border border-spot-lime/60 text-spot-lime"
            : "bg-white/5 border border-white/10 text-muted-foreground hover:border-spot-lime/40 hover:text-spot-lime/70"
          }`}
        >
          <Mic size={12} />
          <span className="font-mono text-[9px] uppercase tracking-widest">voz</span>
        </motion.button>
      </div>

      {/* Inline Voice Reaction Recorder */}
      <AnimatePresence>
        {showVoiceRecorder && (
          <VoiceReactionRecorder
            parentDropId={id}
            onDone={() => { setShowVoiceRecorder(false); loadVoiceReactions(); }}
            onCancel={() => setShowVoiceRecorder(false)}
          />
        )}
      </AnimatePresence>

      {/* Voice Reactions List */}
      {voiceReactions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {voiceReactions.map((vr, idx) => (
            <motion.button
              key={vr.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => toggleVoicePlay(vr)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all border text-xs ${playingVoiceId === vr.id
                ? "bg-spot-lime/20 border-spot-lime/60 text-spot-lime shadow-[0_0_8px_rgba(200,255,0,0.2)]"
                : "bg-white/5 border-white/10 text-muted-foreground hover:border-white/30"
              }`}
            >
              {playingVoiceId === vr.id
                ? <Pause size={11} fill="currentColor" />
                : <Play size={11} fill="currentColor" className="ml-px" />}
              <span className="font-mono text-[9px] uppercase tracking-widest">voz {idx + 1}</span>
            </motion.button>
          ))}
        </div>
      )}

      <audio ref={audioRef} src={audioUrl} onEnded={handleEnded} onTimeUpdate={handleTimeUpdate} preload="metadata" />
    </motion.div>
  );
};

export default DropCard;
