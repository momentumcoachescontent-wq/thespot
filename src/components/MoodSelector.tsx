import { motion } from "framer-motion";

const moods = [
  { emoji: "🔥", label: "Motivado", value: "motivated" },
  { emoji: "🙂", label: "Bien", value: "good" },
  { emoji: "😐", label: "Normal", value: "neutral" },
  { emoji: "😔", label: "Bajo", value: "low" },
  { emoji: "😤", label: "Frustrado", value: "frustrated" },
  { emoji: "😰", label: "Ansioso", value: "anxious" },
];

interface MoodSelectorProps {
  selected?: string;
  onSelect: (mood: string) => void;
}

const MoodSelector = ({ selected, onSelect }: MoodSelectorProps) => {
  return (
    <div className="grid grid-cols-3 gap-3">
      {moods.map((mood) => {
        const isActive = selected === mood.value;
        return (
          <motion.button
            key={mood.value}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(mood.value)}
            className={`flex flex-col items-center gap-2 rounded-2xl border p-5 transition-all ${
              isActive
                ? "border-primary bg-primary/10 shadow-glow"
                : "border-border bg-card hover:border-primary/50"
            }`}
          >
            <span className="text-3xl">{mood.emoji}</span>
            <span
              className={`font-mono text-[10px] uppercase tracking-widest ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {mood.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};

export default MoodSelector;
