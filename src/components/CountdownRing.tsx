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
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={3}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={progress > 0.3 ? "hsl(var(--primary))" : "hsl(var(--spot-warn))"}
          strokeWidth={3}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <span className="absolute text-[9px] font-bold text-foreground">{timeLeft}</span>
    </div>
  );
};

export default CountdownRing;
