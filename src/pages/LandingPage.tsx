import { useState } from "react";
import { motion } from "framer-motion";
import { Mic, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const LandingPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Supabase auth
    navigate("/feed");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex max-w-sm flex-col items-center text-center"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          className="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-hero shadow-glow"
        >
          <Mic size={40} className="text-primary-foreground" />
        </motion.div>

        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
          THE <span className="text-gradient-hero">SPOT</span>
        </h1>
        <p className="mt-2 text-sm font-medium text-muted-foreground">
          Tu voz. Tu momento. Tu gente.
        </p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-lg font-semibold text-foreground"
        >
          Speak before fear stops you.
        </motion.p>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Voice drops that disappear. Real connections that stay. No perfect feeds — just authentic moments.
        </p>

        {/* Sign up */}
        <form onSubmit={handleStart} className="mt-8 w-full space-y-3">
          <input
            type="email"
            placeholder="your@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-border bg-muted py-3.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-glow transition-all hover:brightness-110"
          >
            Enter The Spot
            <ArrowRight size={16} />
          </motion.button>
        </form>

        <p className="mt-6 text-[11px] text-muted-foreground">
          Say it now. It disappears soon. 🎤
        </p>
      </motion.div>
    </div>
  );
};

export default LandingPage;
