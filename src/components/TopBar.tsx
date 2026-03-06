import { Radio } from "lucide-react";

interface TopBarProps {
  spotName?: string;
  onlineCount?: number;
}

const TopBar = ({ spotName = "THE SPOT", onlineCount = 0 }: TopBarProps) => {
  return (
    <div className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
        <div>
          <h1 className="font-bebas text-2xl tracking-[2px] text-spot-lime drop-shadow-[0_0_10px_rgba(200,255,0,0.4)]">
            {spotName}
          </h1>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-spot-lime shadow-[0_0_8px_#C8FF00] animate-pulse" />
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{onlineCount} online</span>
          </div>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Radio size={18} />
        </div>
      </div>
    </div>
  );
};

export default TopBar;
