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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 relative overflow-hidden">
      {/* Elementos Decorativos de Fondo (Propuesta de Diseño) */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(200,255,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(200,255,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex max-w-sm flex-col items-center text-center z-10"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          className="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-spot-lime shadow-[0_0_30px_rgba(200,255,0,0.3)]"
        >
          <Mic size={40} className="text-black" />
        </motion.div>

        <h1 className="font-bebas text-6xl leading-[0.9] tracking-tighter text-foreground mb-2">
          THE <span className="text-spot-lime drop-shadow-[0_0_10px_rgba(200,255,0,0.4)]">SPOT</span>
        </h1>
        <p className="font-mono text-[10px] uppercase tracking-[4px] text-muted-foreground">
          Tu voz. Tu momento. Tu gente.
        </p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 font-bebas text-3xl text-foreground leading-none"
        >
          HABLA ANTES DE QUE EL MIEDO TE DETENGA.
        </motion.p>
        <p className="mt-4 font-mono text-xs text-muted-foreground leading-relaxed uppercase opacity-70">
          Audios efímeros. Conexiones reales. Sin filtros, solo momentos auténticos en tu campus.
        </p>

        {/* Sign up */}
        <form onSubmit={handleStart} className="mt-10 w-full space-y-4">
          <input
            type="email"
            placeholder="tu@universidad.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-4 px-5 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-spot-lime focus:outline-none transition-all"
          />
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-spot-lime py-4 font-bebas text-xl tracking-wider text-black shadow-[0_0_20px_rgba(200,255,0,0.3)] transition-all hover:brightness-110"
          >
            ENTRAR AL SPOT
            <ArrowRight size={20} />
          </motion.button>
        </form>

        <p className="mt-8 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
          Dilo ahora. Desaparece pronto. 🎤
        </p>
      </motion.div>
    </div>
  );
};

export default LandingPage;
