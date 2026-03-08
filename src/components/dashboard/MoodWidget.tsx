import { useState } from "react";
import { Smile } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import MoodSelector from "@/components/MoodSelector";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const MOOD_TO_INT: Record<string, number> = { anxious: 1, frustrated: 2, low: 2, neutral: 3, good: 4, motivated: 5 };

const MoodWidget = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [selected, setSelected] = useState<string | undefined>();
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!selected || !user) return;

        setIsSubmitting(true);
        try {
            const { error } = await (supabase as any)
                .from("mood_checkins")
                .insert({
                    user_id: user.id,
                    mood: MOOD_TO_INT[selected] ?? 3
                });

            if (error) throw error;

            setSubmitted(true);
            toast({
                title: "Estado registrado",
                description: "Gracias por compartir cómo te sientes."
            });

            setTimeout(() => {
                setSubmitted(false);
                setSelected(undefined);
            }, 8000);
        } catch (error: any) {
            console.error("Mood submit error:", error);
            toast({
                title: "Error al registrar",
                description: "No pudimos guardar tu estado de ánimo. Intenta de nuevo.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitted) return (
        <div className="flex flex-col items-center py-4 text-center">
            <span className="text-3xl mb-2">✨</span>
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Gracias por compartir</p>
        </div>
    );

    return (
        <div className="space-y-3">
            <MoodSelector selected={selected} onSelect={setSelected} />
            <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleSubmit}
                disabled={!selected || isSubmitting}
                className={`w-full rounded-xl py-2.5 font-bebas text-base tracking-wider transition-all ${selected ? "bg-spot-lime text-black shadow-[0_0_15px_rgba(200,255,0,0.3)]" : "bg-muted text-muted-foreground"}`}
            >
                {isSubmitting ? "REGISTRANDO..." : "REGISTRAR"}
            </motion.button>
        </div>
    );
};

export default MoodWidget;
