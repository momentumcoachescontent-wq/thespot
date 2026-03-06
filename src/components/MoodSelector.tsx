import { motion } from "framer-motion";

const moods = [
  { emoji: "🙂", label: "Good", value: "good" },
  { emoji: "😐", label: "Neutral", value: "neutral" },
  { emoji: "😔", label: "Low", value: "low" },
  { emoji: "🔥", label: "Motivated", value: "motivated" },
];

interface MoodSelectorProps {
  selected?: string;
  onSelect: (mood: string) => void;
}

const MoodSelector = ({ selected, onSelect }: MoodSelectorProps) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      {moods.map((mood) => {
        const isActive = selected === mood.value;
        return (
          <motion.button
            key={mood.value}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(mood.value)}
            className={`flex flex-col items-center gap-2 rounded-2xl border p-6 transition-all ${
              isActive
                ? "border-primary bg-primary/10 shadow-glow"
                : "border-border bg-card hover:border-primary/50"
            }`}
          >
            <span className="text-4xl">{mood.emoji}</span>
            <span
              className={`text-sm font-semibold ${
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
