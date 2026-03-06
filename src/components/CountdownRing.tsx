import { useEffect, useState } from "react";

interface CountdownRingProps {
  expiresAt: Date;
  size?: number;
}

const CountdownRing = ({ expiresAt, size = 40 }: CountdownRingProps) => {
  const [progress, setProgress] = useState(1);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const totalDuration = 15 * 60 * 1000; // 15 min
    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = expiresAt.getTime() - now;
      if (remaining <= 0) {
        setProgress(0);
        setTimeLeft("0:00");
        clearInterval(interval);
        return;
      }
      setProgress(remaining / totalDuration);
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const r = (size - 4) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - progress);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 drop-shadow-[0_0_5px_rgba(200,255,0,0.2)]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={3}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={progress > 0.3 ? "#C8FF00" : "#FF2D55"}
          strokeWidth={3}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <span className="absolute font-mono text-[8px] font-bold text-foreground">{timeLeft}</span>
    </div>
  );
};

export default CountdownRing;
