import { createContext, useContext, useRef, useState, useEffect, useCallback } from "react";

export interface PlayingEpisode {
  id: string;
  title: string;
  audio_url: string;
  duration_seconds: number;
  access_tier: "free" | "premium";
  show: { id: string; title: string };
}

interface PodcastPlayerContextType {
  currentEpisode: PlayingEpisode | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  play: (episode: PlayingEpisode) => void;
  pause: () => void;
  resume: () => void;
  dismiss: () => void;
  seekTo: (seconds: number) => void;
}

const PodcastPlayerContext = createContext<PodcastPlayerContextType | undefined>(undefined);

export const PodcastPlayerProvider = ({ children }: { children: React.ReactNode }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<PlayingEpisode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Lazy-init the Audio element (avoids SSR issues)
  const getAudio = () => {
    if (!audioRef.current) audioRef.current = new Audio();
    return audioRef.current;
  };

  useEffect(() => {
    const audio = getAudio();
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(isNaN(audio.duration) ? 0 : audio.duration);
    const onEnded = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  const play = useCallback((episode: PlayingEpisode) => {
    const audio = getAudio();
    if (currentEpisode?.id !== episode.id) {
      audio.src = episode.audio_url;
      setCurrentTime(0);
      setDuration(0);
    }
    audio.play().catch(() => {});
    setCurrentEpisode(episode);
  }, [currentEpisode]);

  const pause = useCallback(() => {
    getAudio().pause();
  }, []);

  const resume = useCallback(() => {
    getAudio().play().catch(() => {});
  }, []);

  const dismiss = useCallback(() => {
    const audio = getAudio();
    audio.pause();
    audio.src = "";
    setCurrentEpisode(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const seekTo = useCallback((seconds: number) => {
    getAudio().currentTime = seconds;
  }, []);

  return (
    <PodcastPlayerContext.Provider value={{
      currentEpisode, isPlaying, currentTime, duration,
      play, pause, resume, dismiss, seekTo,
    }}>
      {children}
    </PodcastPlayerContext.Provider>
  );
};

export const usePodcastPlayer = () => {
  const ctx = useContext(PodcastPlayerContext);
  if (!ctx) throw new Error("usePodcastPlayer must be used within PodcastPlayerProvider");
  return ctx;
};
