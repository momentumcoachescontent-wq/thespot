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
          <h1 className="text-lg font-extrabold tracking-tight text-foreground">{spotName}</h1>
          {onlineCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-spot-safe animate-pulse" />
              <span className="text-[11px] text-muted-foreground">{onlineCount} online</span>
            </div>
          )}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Radio size={18} />
        </div>
      </div>
    </div>
  );
};

export default TopBar;
