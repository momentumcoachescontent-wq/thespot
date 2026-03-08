import { Users } from "lucide-react";
import { motion } from "framer-motion";

interface SpotCardProps {
  name: string;
  description: string;
  campus: string;
  memberCount: number;
  isJoined?: boolean;
  onJoin?: () => void;
  onClick?: () => void;
}

const SpotCard = ({ name, description, campus, memberCount, isJoined, onJoin, onClick }: SpotCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="cursor-pointer rounded-2xl border border-border bg-card p-4 shadow-card transition-all hover:border-primary/40"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-base font-bold text-foreground">{name}</h3>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{description}</p>
          <div className="mt-3 flex items-center gap-3">
            <span className="rounded-full bg-secondary/50 px-2.5 py-0.5 text-[10px] font-semibold text-secondary-foreground">
              {campus}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Users size={12} /> {memberCount}
            </span>
          </div>
        </div>
        {onJoin && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onJoin();
            }}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
              isJoined
                ? "border border-border text-muted-foreground"
                : "bg-primary text-primary-foreground hover:shadow-glow"
            }`}
          >
            {isJoined ? "Unido" : "Unirse"}
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default SpotCard;
