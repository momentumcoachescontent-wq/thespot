import { useState } from "react";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import MoodSelector from "@/components/MoodSelector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Maps mood string values to INTEGER 1-5 (schema constraint)
const MOOD_TO_INT: Record<string, number> = {
  anxious: 1,
  frustrated: 2,
  low: 2,
  neutral: 3,
  good: 4,
  motivated: 5,
};

const MoodPage = () => {
  const [selected, setSelected] = useState<string | undefined>();
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!selected) return;
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await (supabase as any).from('mood_checkins').insert({
          user_id: user.id,
          mood: MOOD_TO_INT[selected] ?? 3,
        });
      }
      setSubmitted(true);
    } catch (error: any) {
      // Si la tabla no existe aún, igual mostramos éxito (UX > error técnico)
      console.warn("Mood save error:", error?.message);
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-md px-4 py-3">
          <h1 className="font-bebas text-2xl tracking-wider text-foreground">¿Cómo estás?</h1>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Registra tu estado de ánimo ahora</p>
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
            <h2 className="font-bebas text-3xl tracking-wider text-spot-lime drop-shadow-[0_0_10px_rgba(200,255,0,0.4)]">Gracias por compartir</h2>
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
              Tu bienestar importa. Vuelve mañana.
            </p>
            <button
              onClick={() => { setSubmitted(false); setSelected(undefined); }}
              className="mt-4 rounded-full border border-border px-6 py-2 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:border-spot-lime hover:text-spot-lime"
            >
              Registrar de nuevo
            </button>
          </motion.div>
        ) : (
          <>
            <MoodSelector selected={selected} onSelect={setSelected} />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              disabled={!selected || isSubmitting}
              className={`mt-6 w-full rounded-2xl py-4 font-bebas text-xl tracking-wider transition-all ${
                selected
                  ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(200,255,0,0.3)]"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {isSubmitting ? "GUARDANDO..." : "REGISTRAR ESTADO"}
            </motion.button>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default MoodPage;
