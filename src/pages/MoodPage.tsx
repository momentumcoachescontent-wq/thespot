import { useState } from "react";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import MoodSelector from "@/components/MoodSelector";

const MoodPage = () => {
  const [selected, setSelected] = useState<string | undefined>();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!selected) return;
    console.log("Mood logged:", selected);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-md px-4 py-3">
          <h1 className="text-lg font-extrabold text-foreground">Mood Check-in</h1>
          <p className="text-xs text-muted-foreground">How are you feeling right now?</p>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 py-8">
        {submitted ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-4 py-16 text-center"
          >
            <span className="text-6xl">✨</span>
            <h2 className="text-xl font-bold text-foreground">Thanks for checking in</h2>
            <p className="text-sm text-muted-foreground">
              Your voice matters. Come back tomorrow.
            </p>
            <button
              onClick={() => { setSubmitted(false); setSelected(undefined); }}
              className="mt-4 rounded-full border border-border px-6 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Check in again
            </button>
          </motion.div>
        ) : (
          <>
            <MoodSelector selected={selected} onSelect={setSelected} />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              disabled={!selected}
              className={`mt-6 w-full rounded-2xl py-3.5 text-sm font-bold transition-all ${
                selected
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              Log my mood
            </motion.button>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default MoodPage;
