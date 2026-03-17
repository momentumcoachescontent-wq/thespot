import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Crown, Mic, Headphones, Clock, Check, X, ArrowLeft, Zap, CreditCard, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const buildFeaturesFreemium = (recSec: number) => [
  { text: "Oye todo el hype del campus",    ok: true },
  { text: `Drops rápidos (${recSec} seg)`,  ok: true },
  { text: "Reacciona con el mood",           ok: true },
  { text: "Explora el mapa en vivo",         ok: true },
  { text: "Botón notificación Spot",         ok: true },
  { text: "Botón SOS de seguridad",          ok: true },
  { text: "Crear Spotcasts (Podcasts)",      ok: false },
  { text: "Drops de larga duración",         ok: false },
];

const buildFeaturesMonthly = (recSec: number) => [
  { icon: "🔥", text: "Todo lo de Freemium y más" },
  { icon: "🔥", text: "Crea tus propios Spotcasts" },
  { icon: "🔥", text: `Drops de ${recSec}s (Doble tiempo)` },
  { icon: "🔥", text: "Triple alcance: Drops de 15 min" },
  { icon: "🔥", text: "DMs: Conecta en privado" },
  { icon: "🔥", text: "Badge VIP y prioridad Top" },
];

const buildFeaturesYearly = (recSec: number) => [
  { icon: "✨", text: "Todo el año en modo Creator" },
  { icon: "✨", text: "Spotcasts ilimitados (365 días)" },
  { icon: "✨", text: "Badge VIP permanente en tu perfil" },
  { icon: "✨", text: `Drops de ${recSec}s y vida de 15 min` },
  { icon: "✨", text: "DMs desbloqueados siempre" },
  { icon: "✨", text: "Prioridad máxima en cada ranking" },
  { icon: "🎁", text: "2 meses de regalo (Ahorra 15%)" },
];

const PremiumPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, profile, isPremium, isAdmin, refreshProfile } = useAuth();

  const [plan, setPlan] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);
  const [recordingLimits, setRecordingLimits] = useState({ freemium: 30, premium: 60 });
  const [displayPrices, setDisplayPrices] = useState({ monthly: 49, yearly: 499 });

  const success = searchParams.get("success") === "true";
  const canceled = searchParams.get("canceled") === "true";

  useEffect(() => {
    if (success) {
      toast({ title: "¡Bienvenido a Spot+! 🎉", description: "Tu suscripción está activa. Disfruta todas las funciones premium." });
      refreshProfile();
    }
    if (canceled) {
      toast({ title: "Suscripción cancelada", description: "Puedes suscribirte cuando quieras.", variant: "default" });
    }
  }, [success, canceled]);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await (supabase as any)
        .from("site_settings")
        .select("key, value")
        .in("key", ["recording_limit_freemium", "recording_limit_premium", "price_display_monthly", "price_display_yearly"]);

      if (data) {
        const map: Record<string, number> = {};
        data.forEach((s: any) => { map[s.key] = Number(s.value); });
        setRecordingLimits({
          freemium: map["recording_limit_freemium"] || 30,
          premium:  map["recording_limit_premium"]  || 60,
        });
        setDisplayPrices({
          monthly: map["price_display_monthly"] || 49,
          yearly:  map["price_display_yearly"]  || 499,
        });
      }
    };
    fetchSettings();
  }, []);

  const handleSubscribe = async () => {
    if (!user) { navigate("/"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", { body: { plan } });
      if (error) throw error;
      if (!data?.url) throw new Error("No se recibió URL de pago de Stripe.");
      window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Error al iniciar pago", description: err.message || "Intenta de nuevo o contacta soporte.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch {
      window.open("https://billing.stripe.com/p/login/bJe5kDbgQ7O17RnfuM5Ne00", "_blank");
    }
  };

  const premiumFeatures = plan === "yearly"
    ? buildFeaturesYearly(recordingLimits.premium)
    : buildFeaturesMonthly(recordingLimits.premium);

  const monthlyEquivalent = (displayPrices.yearly / 12).toFixed(2);

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-bebas text-2xl tracking-wider text-spot-lime">SPOT+</h1>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Suscripción Premium</p>
          </div>
          <Crown size={18} className="ml-auto text-amber-400" />
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-8">
        {/* Current status */}
        {(isPremium || isAdmin) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-spot-lime/40 bg-spot-lime/5 p-5 flex items-center gap-4"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-spot-lime/20">
              <Crown size={24} className="text-spot-lime" />
            </div>
            <div className="flex-1">
              <p className="font-bebas text-xl text-spot-lime">Ya eres Spot+ 🎉</p>
              <p className="font-mono text-[10px] text-muted-foreground">
                {isAdmin ? "Acceso premium permanente como administrador." :
                  profile?.subscription_expires_at
                    ? `Activo hasta: ${new Date(profile.subscription_expires_at).toLocaleDateString("es-MX")}`
                    : "Suscripción activa"}
              </p>
            </div>
            {!isAdmin && (
              <button
                onClick={handleManageSubscription}
                className="rounded-lg border border-border px-3 py-1.5 font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Gestionar
              </button>
            )}
          </motion.div>
        )}

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-spot-lime/20 to-spot-cyan/20 border border-spot-lime/30">
              <Crown size={36} className="text-spot-lime" />
            </div>
          </div>
          <h2 className="font-bebas text-4xl text-foreground tracking-wider">
            Domina la <span className="text-spot-lime">conversación</span>
          </h2>
          <p className="font-mono text-xs text-muted-foreground max-w-sm mx-auto">
            Desbloquea todo el potencial de The Spot con Spot+: crea Spotcasts, drops más largos y destaca en tu campus.
          </p>
        </motion.div>

        {/* Plan toggle */}
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-1.5">
          <button
            onClick={() => setPlan("monthly")}
            className={`flex-1 rounded-xl py-2.5 font-bebas text-base transition-all ${plan === "monthly" ? "bg-spot-lime text-black shadow-lg shadow-spot-lime/20" : "text-muted-foreground"}`}
          >
            Mensual
          </button>
          <button
            onClick={() => setPlan("yearly")}
            className={`flex-1 rounded-xl py-2.5 font-bebas text-base transition-all relative ${plan === "yearly" ? "bg-spot-lime text-black shadow-lg shadow-spot-lime/20" : "text-muted-foreground"}`}
          >
            Anual
            <span className={`absolute -top-2 -right-1 rounded-full px-1.5 py-0.5 font-mono text-[8px] ${plan === "yearly" ? "bg-black text-spot-lime" : "bg-spot-lime/20 text-spot-lime"}`}>
              -15%
            </span>
          </button>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Freemium */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Freemium</p>
              <p className="font-bebas text-4xl text-foreground">GRATIS</p>
            </div>
            <div className="space-y-2">
              {buildFeaturesFreemium(recordingLimits.freemium).map((f, i) => (
                <div key={i} className={`flex items-center gap-2 font-mono text-[11px] ${f.ok ? "text-foreground" : "text-muted-foreground/40 line-through"}`}>
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${f.ok ? "bg-muted" : ""}`}>
                    {f.ok
                      ? <Check size={10} className="text-spot-lime" />
                      : <X size={9} className="text-muted-foreground/40" />}
                  </span>
                  {f.text}
                </div>
              ))}
            </div>
          </div>

          {/* Premium */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="rounded-2xl border-2 border-spot-lime bg-gradient-to-b from-spot-lime/5 to-card p-5 space-y-4 relative overflow-hidden"
          >
            <div className="absolute top-3 right-3">
              <span className="rounded-full bg-spot-lime px-2 py-0.5 font-mono text-[8px] text-black uppercase tracking-widest">
                {plan === "yearly" ? "Mejor oferta" : "Popular"}
              </span>
            </div>

            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-spot-lime">Spot+</p>
              {plan === "monthly" ? (
                <div>
                  <p className="font-bebas text-4xl text-foreground">${displayPrices.monthly}<span className="text-lg text-muted-foreground">/mes</span></p>
                  <p className="font-mono text-[9px] text-muted-foreground">MXN · cancela cuando quieras</p>
                  <p className="font-mono text-[9px] text-spot-lime/70 mt-0.5">Menos de lo que cuesta un café por todo el control.</p>
                </div>
              ) : (
                <div>
                  <p className="font-bebas text-4xl text-foreground">${displayPrices.yearly}<span className="text-lg text-muted-foreground">/año</span></p>
                  <p className="font-mono text-[9px] text-spot-lime">${monthlyEquivalent} / mes · Ahorras ${Math.max(0, displayPrices.monthly * 12 - displayPrices.yearly)} MXN</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {premiumFeatures.map((f, i) => (
                <div key={i} className="flex items-center gap-2 font-mono text-[11px] text-foreground">
                  <span className="shrink-0 text-base leading-none">{f.icon}</span>
                  {f.text}
                </div>
              ))}
            </div>

            {!(isPremium || isAdmin) && (
              <div className="space-y-1.5">
                <button
                  onClick={handleSubscribe}
                  disabled={loading}
                  className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 font-bebas text-lg text-black shadow-lg transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed ${
                    plan === "yearly"
                      ? "bg-gradient-to-r from-spot-lime via-amber-300 to-spot-lime shadow-spot-lime/40 hover:shadow-spot-lime/60 hover:brightness-105"
                      : "bg-spot-lime shadow-spot-lime/30 hover:shadow-spot-lime/50"
                  }`}
                >
                  {loading ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <CreditCard size={16} />
                  )}
                  {loading ? "Redirigiendo..." : plan === "yearly" ? "Ser VIP todo el año" : "Activar mi modo Spot+"}
                </button>
                {plan === "yearly" && (
                  <p className="text-center font-mono text-[9px] text-muted-foreground/60">
                    Un solo pago. Un año de control total.
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Mic,       label: "Spotcasts",    desc: "Crea tu propio podcast de campus" },
            { icon: Clock,     label: `${recordingLimits.premium}s`, desc: "Drops más largos para más contexto" },
            { icon: Headphones, label: "Sin límites",  desc: "Escucha y crea sin restricciones" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-4 text-center space-y-2">
              <div className="flex justify-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-spot-lime/10">
                  <Icon size={18} className="text-spot-lime" />
                </div>
              </div>
              <p className="font-bebas text-base text-foreground">{label}</p>
              <p className="font-mono text-[9px] text-muted-foreground leading-tight">{desc}</p>
            </div>
          ))}
        </div>

        {/* Legal */}
        <p className="text-center font-mono text-[9px] text-muted-foreground/50 leading-relaxed">
          Al suscribirte aceptas los{" "}
          <button onClick={() => navigate("/terms")} className="underline hover:text-muted-foreground">Términos de Servicio</button>.
          {" "}Pago procesado por Stripe. Cancela en cualquier momento desde tu portal de Stripe.
        </p>

        {/* Back to feed */}
        <button
          onClick={() => navigate("/feed")}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-border py-3 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Zap size={14} /> Continuar gratis por ahora
        </button>
      </div>
    </div>
  );
};

export default PremiumPage;
