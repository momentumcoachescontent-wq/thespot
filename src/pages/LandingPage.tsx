import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, ArrowRight, ShieldCheck, Search, ChevronRight, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ACADEMIC_DOMAINS } from "@/utils/academicDomains";
import AcademicErrorModal from "@/components/AcademicErrorModal";
import OnboardingModal from "@/components/OnboardingModal";

// Bypass list: non-institutional emails allowed through (admins + test users)
const EMAIL_BYPASS = [
  "momentumcoaches.content@gmail.com",
  "ealvareze1@gmail.com",
];
const isAdminEmail = (e: string) =>
  e.toLowerCase().includes("admin") || EMAIL_BYPASS.includes(e.toLowerCase());

const LandingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();

  // ── Flow steps ───────────────────────────────────────────────────────────
  const [step, setStep] = useState<"school" | "email" | "otp">("school");

  // ── School picker state ──────────────────────────────────────────────────
  const [selectedSchool, setSelectedSchool] = useState<{ name: string; domain: string } | null>(null);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [schoolTab, setSchoolTab] = useState<"unis" | "prepas">("unis");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customDomain, setCustomDomain] = useState("");

  // ── Email / OTP state ────────────────────────────────────────────────────
  const [emailPrefix, setEmailPrefix] = useState("");
  const [confirmedEmail, setConfirmedEmail] = useState(""); // locked once OTP sent
  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Modals ───────────────────────────────────────────────────────────────
  const [showAcademicError, setShowAcademicError] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [detectedInstitution, setDetectedInstitution] = useState("");

  useEffect(() => {
    if (profile?.onboarding_completed) navigate("/home");
  }, [profile, navigate]);

  // ── Computed email ────────────────────────────────────────────────────────
  const fullEmail = useMemo(() => {
    if (selectedSchool) return `${emailPrefix.trim()}@${selectedSchool.domain}`;
    return emailPrefix.trim(); // fallback if no school selected
  }, [emailPrefix, selectedSchool]);

  // ── Filtered school list ─────────────────────────────────────────────────
  const filteredSchools = useMemo(() => {
    const list =
      schoolTab === "unis" ? ACADEMIC_DOMAINS.universities : ACADEMIC_DOMAINS.prepas;
    if (!schoolSearch) return list;
    const q = schoolSearch.toLowerCase();
    return list.filter(
      (s) => s.name.toLowerCase().includes(q) || s.domain.toLowerCase().includes(q)
    );
  }, [schoolTab, schoolSearch]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSelectSchool = (school: { name: string; domain: string }) => {
    setSelectedSchool(school);
    setStep("email");
    setSchoolSearch("");
    setShowCustomInput(false);
    setCustomDomain("");
  };

  const handleCustomDomainConfirm = () => {
    const d = customDomain.trim().replace(/^@/, "").toLowerCase();
    if (!d || !d.includes(".")) {
      toast({ title: "Dominio inválido", description: "Ej: miescuela.edu.mx", variant: "destructive" });
      return;
    }
    setSelectedSchool({ name: d, domain: d });
    setStep("email");
    setShowCustomInput(false);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = fullEmail.toLowerCase();

    if (!email.includes("@") || !email.includes(".")) {
      toast({ title: "Email inválido", description: "Ingresa tu correo institucional completo.", variant: "destructive" });
      return;
    }

    // Admin / bypass: use password auth
    if (isAdminEmail(email)) {
      setIsSubmitting(true);
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: "SpotAdmin2026!",
        });
        if (!error) {
          toast({ title: "Acceso directo", description: "Bienvenido de vuelta." });
          navigate("/feed");
          return;
        }
      } finally {
        setIsSubmitting(false);
      }
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setConfirmedEmail(email);
      setDetectedInstitution(selectedSchool?.name || "");
      toast({ title: "Código enviado", description: "Revisa tu correo para el código de acceso." });
      setStep("otp");
    } catch (err: any) {
      toast({ title: "Error de acceso", description: err.message || "No pudimos enviar el código.", variant: "destructive" });
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-background relative overflow-hidden">
      {/* grid background */}
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

      {/* ── STEP: SCHOOL PICKER ────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {step === "school" && (
          <motion.div
            key="school"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col min-h-screen"
          >
            {/* Top brand strip */}
            <div className="flex items-center gap-3 px-5 pt-10 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-spot-lime shadow-[0_0_15px_rgba(200,255,0,0.3)]">
                <Mic size={20} className="text-black" />
              </div>
              <div>
                <p className="font-bebas text-2xl leading-none text-foreground">
                  THE <span className="text-spot-lime">SPOT</span>
                </p>
                <p className="font-mono text-[8px] uppercase tracking-[3px] text-muted-foreground">
                  Tu voz. Tu momento.
                </p>
              </div>
            </div>

            {/* Heading */}
            <div className="px-5 mb-4">
              <h1 className="font-bebas text-4xl leading-none text-foreground">
                ¿DÓNDE<br />
                <span className="text-spot-lime">ESTUDIAS?</span>
              </h1>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
                Conéctate con tu campus
              </p>
            </div>

            {/* Search bar */}
            <div className="px-5 mb-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar escuela..."
                  value={schoolSearch}
                  onChange={(e) => setSchoolSearch(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-9 pr-4 font-mono text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:border-spot-lime/50 focus:outline-none transition-all"
                />
                {schoolSearch && (
                  <button onClick={() => setSchoolSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="px-5 mb-4">
              <div className="flex rounded-xl border border-border bg-card p-1 gap-1">
                {(["unis", "prepas"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setSchoolTab(t)}
                    className={`flex-1 rounded-lg py-2 font-bebas text-sm tracking-wider transition-all ${schoolTab === t
                      ? "bg-spot-lime text-black shadow-sm shadow-spot-lime/30"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t === "unis" ? "🎓 Universidades" : "📚 Preparatorias"}
                  </button>
                ))}
              </div>
            </div>

            {/* School grid — scrollable */}
            <div className="flex-1 overflow-y-auto px-5 pb-2">
              <div className="grid grid-cols-3 gap-2.5">
                {filteredSchools.map((school) => (
                  <motion.button
                    key={school.domain}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSelectSchool(school)}
                    className="flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/4 p-3 text-center transition-all hover:border-spot-lime/40 hover:bg-spot-lime/5 active:scale-95 min-h-[80px]"
                  >
                    <p className="font-bebas text-base leading-tight text-foreground line-clamp-2">
                      {school.name}
                    </p>
                    <p className="mt-1 font-mono text-[7px] text-muted-foreground/50 truncate w-full text-center">
                      @{school.domain}
                    </p>
                  </motion.button>
                ))}
              </div>

              {filteredSchools.length === 0 && (
                <div className="flex flex-col items-center py-8 text-center">
                  <p className="font-mono text-xs text-muted-foreground">No encontramos "{schoolSearch}"</p>
                </div>
              )}

              {/* Custom domain fallback */}
              <div className="mt-4 mb-4">
                {!showCustomInput ? (
                  <button
                    onClick={() => setShowCustomInput(true)}
                    className="w-full flex items-center justify-between rounded-xl border border-dashed border-white/15 bg-transparent px-4 py-3 font-mono text-[10px] text-muted-foreground/60 hover:border-spot-lime/30 hover:text-muted-foreground transition-all"
                  >
                    <span>🔒 Mi escuela no aparece aquí</span>
                    <ChevronRight size={12} />
                  </button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="rounded-xl border border-spot-lime/20 bg-spot-lime/5 p-4 space-y-3"
                  >
                    <p className="font-mono text-[10px] text-spot-lime uppercase tracking-widest">Ingresa el dominio de tu escuela</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="ej. miescuela.edu.mx"
                        value={customDomain}
                        onChange={(e) => setCustomDomain(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCustomDomainConfirm()}
                        className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:border-spot-lime/50 focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={handleCustomDomainConfirm}
                        className="rounded-lg bg-spot-lime px-4 py-2.5 font-bebas text-sm text-black hover:brightness-110"
                      >
                        OK
                      </button>
                    </div>
                    <button onClick={() => setShowCustomInput(false)} className="font-mono text-[9px] text-muted-foreground/50 hover:text-muted-foreground">
                      Cancelar
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── STEP: EMAIL ───────────────────────────────────────────────── */}
        {step === "email" && (
          <motion.div
            key="email"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="flex flex-col items-center justify-center min-h-screen px-6 text-center z-10"
          >
            {/* Brand */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
              className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-spot-lime shadow-[0_0_30px_rgba(200,255,0,0.3)]"
            >
              <Mic size={36} className="text-black" />
            </motion.div>

            <h1 className="font-bebas text-5xl leading-[0.9] tracking-tighter text-foreground mb-1">
              THE <span className="text-spot-lime drop-shadow-[0_0_10px_rgba(200,255,0,0.4)]">SPOT</span>
            </h1>
            <p className="font-mono text-[9px] uppercase tracking-[4px] text-muted-foreground mb-8">
              Tu voz. Tu momento. Tu gente.
            </p>

            <p className="font-bebas text-2xl text-foreground leading-none mb-8">
              HABLA ANTES DE QUE EL<br />MIEDO TE DETENGA.
            </p>

            {/* Selected school chip */}
            {selectedSchool && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 flex items-center gap-2 rounded-full border border-spot-lime/40 bg-spot-lime/10 px-3 py-1.5"
              >
                <span className="font-mono text-[10px] text-spot-lime">{selectedSchool.name}</span>
                <button
                  onClick={() => { setSelectedSchool(null); setStep("school"); setEmailPrefix(""); }}
                  className="text-muted-foreground hover:text-foreground ml-1"
                >
                  <X size={10} />
                </button>
              </motion.div>
            )}

            {/* Email input */}
            <form onSubmit={handleSendOtp} className="w-full max-w-sm space-y-4">
              {selectedSchool ? (
                /* Split input: prefix @ domain */
                <div className="flex items-stretch rounded-xl border border-white/10 bg-white/5 overflow-hidden focus-within:border-spot-lime transition-all">
                  <input
                    type="text"
                    placeholder="tu.usuario"
                    value={emailPrefix}
                    onChange={(e) => setEmailPrefix(e.target.value.replace(/\s|@/g, "").toLowerCase())}
                    required
                    autoFocus
                    className="flex-1 min-w-0 bg-transparent py-4 pl-4 pr-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                  />
                  <span className="flex items-center px-3 font-mono text-xs text-spot-lime/80 border-l border-white/5 bg-spot-lime/5 whitespace-nowrap">
                    @{selectedSchool.domain}
                  </span>
                </div>
              ) : (
                /* Full email input (no school selected) */
                <input
                  type="email"
                  placeholder="Email de Tu Preparatoria o Universidad"
                  value={emailPrefix}
                  onChange={(e) => setEmailPrefix(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-4 pl-5 pr-5 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-spot-lime focus:outline-none transition-all"
                />
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

              <button
                type="button"
                onClick={() => setStep("school")}
                className="w-full font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                ← Cambiar escuela
              </button>
            </form>

            <p className="mt-8 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              Dilo ahora. Desaparece pronto. 🎤
            </p>
            <p className="mt-3 font-mono text-[8px] text-muted-foreground/40 uppercase tracking-widest">
              Al ingresar aceptas nuestra{" "}
              <a href="/privacy" className="underline underline-offset-2 hover:text-spot-lime transition-colors">
                Política de Privacidad
              </a>
            </p>
          </motion.div>
        )}

        {/* ── STEP: OTP ────────────────────────────────────────────────── */}
        {step === "otp" && (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="flex flex-col items-center justify-center min-h-screen px-6 text-center z-10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-spot-lime shadow-[0_0_30px_rgba(200,255,0,0.3)]"
            >
              <ShieldCheck size={36} className="text-black" />
            </motion.div>

            <h2 className="font-bebas text-4xl text-foreground mb-1">VERIFICA TU ACCESO</h2>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              Código enviado a
            </p>
            <p className="font-mono text-xs text-spot-lime mb-8 break-all">{confirmedEmail}</p>

            <form onSubmit={handleVerifyOtp} className="w-full max-w-sm space-y-4">
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
    </div>
  );
};

export default LandingPage;
