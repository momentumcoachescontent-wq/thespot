import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, ArrowRight, ShieldCheck, Search, X, ChevronDown, School } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ACADEMIC_DOMAINS } from "@/utils/academicDomains";
import AcademicErrorModal from "@/components/AcademicErrorModal";
import OnboardingModal from "@/components/OnboardingModal";

// Bypass: non-institutional emails (admins + test accounts)
const EMAIL_BYPASS = ["momentumcoaches.content@gmail.com", "ealvareze1@gmail.com"];
const isBypassEmail = (e: string) =>
  e.toLowerCase().includes("admin") || EMAIL_BYPASS.includes(e.toLowerCase());

// Flat combined school list (no tabs)
const ALL_SCHOOLS = [
  ...ACADEMIC_DOMAINS.universities,
  ...ACADEMIC_DOMAINS.prepas,
].filter((s, i, arr) => arr.findIndex((x) => x.domain === s.domain) === i); // deduplicate by domain

const LandingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();

  // ── Steps: "email" | "otp" ────────────────────────────────────────────────
  const [step, setStep] = useState<"email" | "otp">("email");

  // ── School picker ─────────────────────────────────────────────────────────
  const [selectedSchool, setSelectedSchool] = useState<{ name: string; domain: string } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [schoolSearch, setSchoolSearch] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);

  // ── Email / OTP ───────────────────────────────────────────────────────────
  const [emailPrefix, setEmailPrefix] = useState("");
  const [confirmedEmail, setConfirmedEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Modals ────────────────────────────────────────────────────────────────
  const [showAcademicError, setShowAcademicError] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [detectedInstitution, setDetectedInstitution] = useState("");

  useEffect(() => {
    if (profile?.onboarding_completed) navigate("/home");
  }, [profile, navigate]);

  // Close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Filtered + sorted school list
  const filteredSchools = useMemo(() => {
    if (!schoolSearch) return ALL_SCHOOLS;
    const q = schoolSearch.toLowerCase();
    return ALL_SCHOOLS.filter(
      (s) => s.name.toLowerCase().includes(q) || s.domain.toLowerCase().includes(q)
    );
  }, [schoolSearch]);

  // Computed full email
  const fullEmail = useMemo(() => {
    if (selectedSchool) return `${emailPrefix.trim()}@${selectedSchool.domain}`;
    return emailPrefix.trim();
  }, [emailPrefix, selectedSchool]);

  const handleSelectSchool = (school: { name: string; domain: string }) => {
    setSelectedSchool(school);
    setPickerOpen(false);
    setSchoolSearch("");
    setEmailPrefix("");
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = fullEmail.toLowerCase();

    if (!email.includes("@") || !email.split("@")[1]?.includes(".")) {
      toast({
        title: "Email inválido",
        description: selectedSchool
          ? `Ingresa tu usuario de correo (ej: juan.perez@${selectedSchool.domain})`
          : "Ingresa tu correo institucional completo.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Password bypass for admin / test accounts
      if (isBypassEmail(email)) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: "SpotAdmin2026!",
        });
        if (!error) {
          toast({ title: "Acceso directo", description: "Bienvenido de vuelta." });
          navigate("/feed");
          return;
        }
        // fall through to OTP if password fails
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;

      setConfirmedEmail(email);
      setDetectedInstitution(selectedSchool?.name || "");
      toast({ title: "Código enviado", description: "Revisa tu correo." });
      setStep("otp");
    } catch (err: any) {
      toast({
        title: "Error de acceso",
        description: err.message || "No pudimos enviar el código.",
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
        email: confirmedEmail,
        token: otp,
        type: "email",
      });
      if (error) throw error;

      toast({ title: "Bienvenido al Spot", description: "Autenticación exitosa." });
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await (supabase as any)
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", user.id)
          .single();
        if (prof?.onboarding_completed) {
          navigate("/home");
        } else {
          setShowOnboarding(true);
        }
      }
    } catch (err: any) {
      toast({ title: "Código inválido", description: "Revisa el código e intenta de nuevo.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 relative overflow-hidden">
      {/* Grid background */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(200,255,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(200,255,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20" />

      {/* Modals */}
      <AnimatePresence>
        {showAcademicError && (
          <AcademicErrorModal email={fullEmail} onClose={() => setShowAcademicError(false)} />
        )}
        {showOnboarding && (
          <OnboardingModal
            initialInstitution={detectedInstitution}
            onComplete={() => navigate("/home")}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex max-w-sm flex-col items-center text-center z-10 w-full"
      >
        {/* Brand icon */}
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

        {/* ── EMAIL STEP ─────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {step === "email" && (
            <motion.div
              key="email"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-10 w-full space-y-3"
            >
              {/* School picker trigger */}
              <div ref={pickerRef} className="relative">
                <button
                  type="button"
                  onClick={() => setPickerOpen((o) => !o)}
                  className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                    selectedSchool
                      ? "border-spot-lime/50 bg-spot-lime/8"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <School size={15} className={selectedSchool ? "text-spot-lime" : "text-muted-foreground"} />
                  <span className={`flex-1 font-mono text-[11px] ${selectedSchool ? "text-spot-lime" : "text-muted-foreground/60"}`}>
                    {selectedSchool ? selectedSchool.name : "Selecciona tu escuela (opcional)"}
                  </span>
                  {selectedSchool ? (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedSchool(null); setEmailPrefix(""); }}
                      className="text-muted-foreground hover:text-foreground p-0.5"
                    >
                      <X size={12} />
                    </button>
                  ) : (
                    <ChevronDown
                      size={13}
                      className={`text-muted-foreground transition-transform ${pickerOpen ? "rotate-180" : ""}`}
                    />
                  )}
                </button>

                {/* Inline dropdown picker */}
                <AnimatePresence>
                  {pickerOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl shadow-black/60 overflow-hidden"
                    >
                      {/* Search */}
                      <div className="p-3 border-b border-white/8">
                        <div className="relative">
                          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <input
                            type="text"
                            placeholder="Buscar escuela..."
                            value={schoolSearch}
                            onChange={(e) => setSchoolSearch(e.target.value)}
                            autoFocus
                            className="w-full rounded-lg border border-white/8 bg-white/5 py-2 pl-8 pr-3 font-mono text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:border-spot-lime/40 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* List */}
                      <div className="max-h-52 overflow-y-auto">
                        {filteredSchools.length === 0 ? (
                          <p className="py-6 text-center font-mono text-[10px] text-muted-foreground/50">
                            Sin resultados para "{schoolSearch}"
                          </p>
                        ) : (
                          filteredSchools.map((school) => (
                            <button
                              key={school.domain}
                              type="button"
                              onClick={() => handleSelectSchool(school)}
                              className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-spot-lime/8 transition-colors group"
                            >
                              <span className="font-mono text-[11px] text-foreground group-hover:text-spot-lime transition-colors">
                                {school.name}
                              </span>
                              <span className="font-mono text-[9px] text-muted-foreground/40 ml-2 truncate max-w-[130px]">
                                @{school.domain}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Email input: split if school selected, full if not */}
              <form onSubmit={handleSendOtp} className="space-y-3">
                {selectedSchool ? (
                  <div className="flex items-stretch rounded-xl border border-white/10 bg-white/5 overflow-hidden focus-within:border-spot-lime transition-all">
                    <input
                      type="text"
                      placeholder="tu.usuario"
                      value={emailPrefix}
                      onChange={(e) => setEmailPrefix(e.target.value.replace(/[\s@]/g, "").toLowerCase())}
                      required
                      autoFocus
                      className="flex-1 min-w-0 bg-transparent py-4 pl-4 pr-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                    />
                    <span className="flex items-center px-3 font-mono text-[11px] text-spot-lime/80 border-l border-white/8 bg-spot-lime/5 whitespace-nowrap select-none">
                      @{selectedSchool.domain}
                    </span>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="Email de Tu Preparatoria o Universidad"
                      value={emailPrefix}
                      onChange={(e) => setEmailPrefix(e.target.value)}
                      required
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-4 pl-5 pr-5 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-spot-lime focus:outline-none transition-all"
                    />
                  </div>
                )}

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={isSubmitting}
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-spot-lime py-4 font-bebas text-xl tracking-wider text-black shadow-[0_0_20px_rgba(200,255,0,0.3)] transition-all hover:brightness-110 disabled:opacity-50"
                >
                  {isSubmitting ? "ENTRANDO..." : "ENTRAR AL SPOT"}
                  {!isSubmitting && <ArrowRight size={20} />}
                </motion.button>
              </form>
            </motion.div>
          )}

          {/* ── OTP STEP ─────────────────────────────────────────────────── */}
          {step === "otp" && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="mt-10 w-full space-y-4"
            >
              <div className="flex justify-center mb-2">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-spot-lime/30 bg-spot-lime/10">
                  <ShieldCheck size={26} className="text-spot-lime" />
                </div>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Código enviado a
              </p>
              <p className="font-mono text-xs text-spot-lime break-all">{confirmedEmail}</p>

              <form onSubmit={handleVerifyOtp} className="space-y-3">
                <input
                  type="text"
                  placeholder="Código de 8 dígitos"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  required
                  maxLength={8}
                  autoFocus
                  className="w-full text-center tracking-[0.3em] rounded-xl border border-white/10 bg-white/5 py-4 px-5 font-mono text-lg text-foreground placeholder:text-muted-foreground/50 focus:border-spot-lime focus:outline-none transition-all"
                />
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={isSubmitting || otp.length !== 8}
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-spot-lime py-4 font-bebas text-xl tracking-wider text-black shadow-[0_0_20px_rgba(200,255,0,0.3)] transition-all hover:brightness-110 disabled:opacity-50"
                >
                  {isSubmitting ? "VERIFICANDO..." : "CONFIRMAR"}
                </motion.button>
                <button
                  type="button"
                  onClick={() => { setStep("email"); setOtp(""); }}
                  className="w-full font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  ← Cambiar correo
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-8 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
          Dilo ahora. Desaparece pronto. 🎤
        </p>
        <p className="mt-4 font-mono text-[8px] text-muted-foreground/40 uppercase tracking-widest">
          Al ingresar aceptas nuestra{" "}
          <a href="/privacy" className="underline underline-offset-2 hover:text-spot-lime transition-colors">
            Política de Privacidad
          </a>
        </p>
      </motion.div>
    </div>
  );
};

export default LandingPage;
