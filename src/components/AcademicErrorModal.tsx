import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AcademicErrorModalProps {
    email: string;
    onClose: () => void;
}

const AcademicErrorModal = ({ email, onClose }: AcademicErrorModalProps) => {
    const [suggestion, setSuggestion] = useState("");
    const [isReporting, setIsReporting] = useState(false);
    const [reported, setReported] = useState(false);
    const { toast } = useToast();

    const handleReport = async () => {
        setIsReporting(true);
        try {
            const { error } = await (supabase as any)
                .from("institution_reports")
                .insert({
                    email,
                    institution_suggestion: suggestion
                });

            if (error) throw error;
            setReported(true);
            toast({ title: "Reporte enviado", description: "Revisaremos tu institución pronto." });
        } catch (err: any) {
            toast({ title: "Error al enviar", description: err.message, variant: "destructive" });
        } finally {
            setIsReporting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl"
            >
                {!reported ? (
                    <>
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 text-amber-500">
                            <AlertCircle size={24} />
                        </div>
                        <h3 className="font-bebas text-2xl tracking-wider text-white">PARECE QUE ESTE CORREO NO ES ACADÉMICO</h3>
                        <p className="mt-2 font-mono text-[11px] leading-relaxed text-zinc-400 uppercase tracking-tight">
                            Para usar The Spot necesitas un correo institucional de preparatoria o universidad.
                        </p>
                        <p className="mt-4 font-mono text-[10px] text-zinc-500 uppercase tracking-tighter">
                            Si tu correo sí pertenece a una institución educativa, repórtalo desde el botón y lo revisaremos.
                        </p>

                        <input
                            type="text"
                            placeholder="Nombre de tu institución (opcional)"
                            value={suggestion}
                            onChange={(e) => setSuggestion(e.target.value)}
                            className="mt-6 w-full rounded-xl border border-white/5 bg-white/5 py-3 px-4 font-mono text-[10px] text-white focus:border-amber-500/50 focus:outline-none"
                        />

                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 rounded-xl border border-white/10 py-3 font-bebas text-sm tracking-widest text-white transition-colors hover:bg-white/5"
                            >
                                CANCELAR
                            </button>
                            <button
                                onClick={handleReport}
                                disabled={isReporting}
                                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 font-bebas text-sm tracking-widest text-black transition-all hover:brightness-110 disabled:opacity-50"
                            >
                                {isReporting ? "ENVIANDO..." : "REPORTAR DOMINIO"}
                                <Send size={14} />
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="py-8 text-center">
                        <div className="mb-4 flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-spot-lime/20 text-spot-lime text-2xl">✨</div>
                        <h3 className="font-bebas text-2xl tracking-wider text-white">REPORTE RECIBIDO</h3>
                        <p className="mt-2 font-mono text-[10px] text-zinc-400 uppercase tracking-widest">
                            Gracias. Mantente pendiente, activaremos el acceso pronto.
                        </p>
                        <button
                            onClick={onClose}
                            className="mt-8 w-full rounded-xl bg-white py-3 font-bebas text-sm tracking-widest text-black transition-all hover:brightness-90"
                        >
                            CERRAR
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default AcademicErrorModal;
