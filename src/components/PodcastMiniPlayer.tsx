import { X, Play, Pause } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { usePodcastPlayer } from "@/contexts/PodcastPlayerContext";

const PodcastMiniPlayer = () => {
  const { currentEpisode, isPlaying, currentTime, duration, pause, resume, dismiss } = usePodcastPlayer();
  const navigate = useNavigate();

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const mins = Math.floor(currentTime / 60);
  const secs = Math.floor(currentTime % 60);

  return (
    <AnimatePresence>
      {currentEpisode && (
        <motion.div
          key="mini-player"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="fixed bottom-16 md:bottom-0 left-0 right-0 md:left-16 lg:left-64 z-50 border-t border-border bg-background/95 backdrop-blur-xl"
        >
          {/* Thin progress bar at top */}
          <div className="h-0.5 bg-muted/60">
            <div
              className="h-full bg-spot-lime transition-all duration-700 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center gap-3 px-4 py-2.5">
            {/* Play / Pause */}
            <button
              onClick={isPlaying ? pause : resume}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-spot-lime text-black shadow-[0_0_10px_rgba(200,255,0,0.25)] transition-transform active:scale-95"
            >
              {isPlaying
                ? <Pause size={14} fill="currentColor" />
                : <Play size={14} fill="currentColor" className="ml-0.5" />}
            </button>

            {/* Info — click navigates to show */}
            <button
              className="flex-1 min-w-0 text-left"
              onClick={() => navigate(`/podcast/show/${currentEpisode.show.id}`)}
            >
              <p className="font-bebas text-sm leading-none text-foreground truncate">
                {currentEpisode.title}
              </p>
              <p className="font-mono text-[10px] text-muted-foreground truncate mt-0.5">
                {currentEpisode.show.title}
              </p>
            </button>

            {/* Elapsed time */}
            <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
              {mins}:{String(secs).padStart(2, "0")}
            </span>

            {/* Dismiss */}
            <button
              onClick={dismiss}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PodcastMiniPlayer;
