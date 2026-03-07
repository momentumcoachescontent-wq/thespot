import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, ArrowRight, ShieldCheck, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const LandingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"email" | "otp">("email");
  const [otp, setOtp] = useState("");

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) throw error;

      toast({
        title: "Código enviado",
        description: "Revisa tu correo para el código de acceso.",
      });
      setStep("otp");
    } catch (error: any) {
      console.error("Auth error:", error);
      toast({
        title: "Error de acceso",
        description: error.message || "No pudimos enviar el código.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      });

      if (error) throw error;

      toast({
        title: "Bienvenido al Spot",
        description: "Autenticación exitosa.",
      });
      navigate("/feed");
    } catch (error: any) {
      console.error("Verification error:", error);
      toast({
        title: "Código inválido",
        description: "Revisa el código e intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(200,255,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(200,255,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex max-w-sm flex-col items-center text-center z-10 w-full"
      >
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

        <div className="mt-10 w-full min-h-[140px] relative">
          <AnimatePresence mode="wait">
            {step === "email" ? (
              <motion.form
                key="email-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleSendOtp}
                className="w-full space-y-4"
              >
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <input
                    type="email"
                    placeholder="tu@universidad.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-4 pl-12 pr-5 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-spot-lime focus:outline-none transition-all"
                  />
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={isSubmitting}
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-spot-lime py-4 font-bebas text-xl tracking-wider text-black shadow-[0_0_20px_rgba(200,255,0,0.3)] transition-all hover:brightness-110 disabled:opacity-50"
                >
                  {isSubmitting ? "ENVIANDO..." : "ENTRAR AL SPOT"}
                  {!isSubmitting && <ArrowRight size={20} />}
                </motion.button>
              </motion.form>
            ) : (
              <motion.form
                key="otp-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleVerifyOtp}
                className="w-full space-y-4"
              >
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <input
                    type="text"
                    placeholder="Código de 8 dígitos"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    required
                    maxLength={8}
                    className="w-full text-center tracking-[0.3em] rounded-xl border border-white/10 bg-white/5 py-4 px-5 font-mono text-lg text-foreground placeholder:text-muted-foreground/50 focus:border-spot-lime focus:outline-none transition-all"
                  />
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={isSubmitting || otp.length !== 8}
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-spot-lime py-4 font-bebas text-xl tracking-wider text-black shadow-[0_0_20px_rgba(200,255,0,0.3)] transition-all hover:brightness-110 disabled:opacity-50"
                >
                  {isSubmitting ? "VERIFICANDO..." : "CONFIRMAR"}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <p className="mt-8 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
          Dilo ahora. Desaparece pronto. 🎤
        </p>
      </motion.div>
    </div>
  );
};

export default LandingPage;
// Lovable Sync - Auth Fix v1.0.1 (8-digit OTP UI)
