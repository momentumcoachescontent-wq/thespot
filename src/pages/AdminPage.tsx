import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Users, Mic, Shield, Trophy, TrendingUp, AlertTriangle, ArrowLeft, Crown, CreditCard, CheckCircle, XCircle, Zap, Clock, Pencil, X, Check as CheckIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { useAuth } from "@/contexts/AuthContext";

// ── Catálogo de dominios institucionales ──────────────────────────────────────
const KNOWN_DOMAINS = [
  // Universidades
  { label: "UNAM", domain: "comunidad.unam.mx" },
  { label: "Tec de Monterrey (ITESM)", domain: "tec.mx" },
  { label: "IPN", domain: "alumno.ipn.mx" },
  { label: "U de G", domain: "alumnos.udg.mx" },
  { label: "UANL", domain: "uanl.edu.mx" },
  { label: "ITAM", domain: "itam.mx" },
  { label: "Ibero", domain: "ibero.mx" },
  { label: "COLMEX", domain: "colmex.mx" },
  { label: "UAQ", domain: "alumnos.uaq.mx" },
  { label: "BUAP", domain: "alumno.buap.mx" },
  { label: "Universidad Panamericana (UP)", domain: "up.edu.mx" },
  { label: "UAM", domain: "alumnos.uam.mx" },
  { label: "Anáhuac", domain: "anahuac.mx" },
  { label: "ITESO", domain: "iteso.mx" },
  { label: "UAEH", domain: "uaeh.edu.mx" },
  { label: "UDLAP", domain: "udlap.mx" },
  { label: "UASLP", domain: "alumnos.uaslp.edu.mx" },
  { label: "UAEMex", domain: "alumno.uaemex.mx" },
  { label: "UABC", domain: "uabc.edu.mx" },
  { label: "USON", domain: "unison.mx" },
  { label: "UV", domain: "estudiantes.uv.mx" },
  { label: "UMSNH", domain: "umich.mx" },
  { label: "UADY", domain: "alumnos.uady.mx" },
  { label: "UNITEC", domain: "my.unitec.edu.mx" },
  { label: "UVM", domain: "my.uvm.edu.mx" },
  { label: "ITSON", domain: "potros.itson.edu.mx" },
  { label: "UACH", domain: "uach.mx" },
  { label: "UACJ", domain: "alumnos.uacj.mx" },
  { label: "UAEM (Morelos)", domain: "uaem.edu.mx" },
  { label: "UJAT", domain: "alumno.ujat.mx" },
  { label: "UAA", domain: "alumnos.uaa.mx" },
  { label: "UANE", domain: "uane.edu.mx" },
  { label: "CIDE", domain: "cide.edu" },
  { label: "FLACSO", domain: "flacso.edu.mx" },
  { label: "U. de Montemorelos", domain: "um.edu.mx" },
  { label: "La Salle", domain: "lasallistas.edu.mx" },
  { label: "CETYS", domain: "cetys.edu.mx" },
  { label: "UDEM", domain: "udem.edu" },
  { label: "UDLA CDMX", domain: "udla.mx" },
  { label: "UNACH", domain: "unach.mx" },
  { label: "UAdeC", domain: "uadec.edu.mx" },
  { label: "U. de Colima", domain: "ucol.mx" },
  { label: "UAN", domain: "uan.edu.mx" },
  { label: "UQROO", domain: "uqroo.edu.mx" },
  { label: "UIC", domain: "uic.edu.mx" },
  { label: "U. Marista", domain: "marista.edu.mx" },
  // Preparatorias
  { label: "PrepaTec", domain: "tec.mx" },
  { label: "ENP UNAM", domain: "alumno.enp.unam.mx" },
  { label: "CCH UNAM", domain: "alumno.cch.unam.mx" },
  { label: "CECyT IPN", domain: "alumno.ipn.mx" },
  { label: "Bachillerato Anáhuac", domain: "bachilleratoanahuac.edu.mx" },
  { label: "Prepa La Salle", domain: "lasalle.mx" },
  { label: "Colegio de Bachilleres", domain: "bachilleres.edu.mx" },
  { label: "CONALEP", domain: "conalepmex.edu.mx" },
  { label: "Colegio Alemán Humboldt", domain: "humboldt.edu.mx" },
  { label: "ASF", domain: "asf.edu.mx" },
  { label: "Eton School", domain: "eton.edu.mx" },
  { label: "Colegio Vista Hermosa", domain: "cvh.edu.mx" },
  { label: "Colegio Williams", domain: "colwilliams.edu.mx" },
  { label: "Greengates School", domain: "greengates.edu.mx" },
  { label: "Liceo Mexicano Japonés", domain: "lmj.edu.mx" },
  { label: "Instituto Patria", domain: "patria.edu.mx" },
  { label: "Peterson Schools", domain: "peterson.edu.mx" },
  { label: "Prepa UVM", domain: "my.uvm.edu.mx" },
  { label: "Prepa UNITEC", domain: "my.unitec.edu.mx" },
  { label: "SEMS UdeG", domain: "alumnos.udg.mx" },
  { label: "The British School", domain: "british.edu.mx" },
  { label: "Instituto Kipling", domain: "kipling.edu.mx" },
  { label: "DGB SEP", domain: "bachillerato.sep.gob.mx" },
];

const StatCard = ({ icon: Icon, label, value, color = "text-spot-lime" }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl border border-border bg-card p-4"
  >
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
        <Icon size={18} className={color} />
      </div>
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className={`font-bebas text-3xl leading-none ${color}`}>{value}</p>
      </div>
    </div>
  </motion.div>
);

const MOOD_COLORS = ["#FF2D55", "#FF6B6B", "#888", "#C8FF00", "#00F0FF"];

const AdminPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<"overview" | "drops" | "users" | "incidents" | "settings" | "stripe">("overview");
  const [settings, setSettings] = useState<any>({
    ai_moderation_enabled: false,
    auto_moderation_mode: false,
    moderation_rules: "",
    ai_model_provider: "openai",
    drop_duration_freemium: 5,
    drop_duration_premium: 15,
  });
  const [stats, setStats] = useState({ users: 0, drops: 0, incidents: 0, podcasts: 0 });
  const [dropsByDay, setDropsByDay] = useState<any[]>([]);
  const [engagementByDay, setEngagementByDay] = useState<any[]>([]);
  const [uniRanking, setUniRanking] = useState<any[]>([]);
  const [moodDist, setMoodDist] = useState<any[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [flaggedDrops, setFlaggedDrops] = useState<any[]>([]);
  const [moderationLogs, setModerationLogs] = useState<any[]>([]);
  const [stripeTransactions, setStripeTransactions] = useState<any[]>([]);
  const [stripeStats, setStripeStats] = useState({ total: 0, revenue: 0, premium_users: 0 });
  const [loading, setLoading] = useState(true);
  const [domainEditingId, setDomainEditingId] = useState<string | null>(null);
  const [domainInput, setDomainInput] = useState("");

  useEffect(() => {
    if (isAdmin) {
      loadDashboard();
    }
  }, [isAdmin]);

  const loadDashboard = async () => {
    try {
      const [profilesRes, dropsRes, incidentsRes, moodRes, settingsRes, interactionsRes, allUsersRes, stripeRes] = await Promise.allSettled([
        (supabase as any).from("profiles").select("id, flag_count", { count: "exact", head: true }),
        (supabase as any).from("drops").select("id, created_at, profiles:author_id(username, university_domain, flag_count)", { count: "exact" }).order("created_at", { ascending: false }).limit(200),
        (supabase as any).from("sos_incidents").select("*").order("created_at", { ascending: false }).limit(50),
        (supabase as any).from("mood_checkins").select("mood").limit(500),
        (supabase as any).from("site_settings").select("*"),
        (supabase as any).from("interactions").select("id, drop_id, created_at").order("created_at", { ascending: false }).limit(1000),
        (supabase as any).from("profiles").select("id, username, full_name, is_premium, role, subscription_status, premium_granted_by_admin, university_domain, created_at").order("created_at", { ascending: false }).limit(100),
        (supabase as any).from("stripe_transactions").select("*").order("created_at", { ascending: false }).limit(50),
      ]);

      const userCount = profilesRes.status === "fulfilled" ? (profilesRes.value.count || 0) : 0;
      const dropsData = dropsRes.status === "fulfilled" ? (dropsRes.value.data || []) : [];
      const dropCount = dropsRes.status === "fulfilled" ? (dropsRes.value.count || 0) : 0;
      const incidentsData = incidentsRes.status === "fulfilled" ? (incidentsRes.value.data || []) : [];
      const settingsData = settingsRes.status === "fulfilled" ? (settingsRes.value.data || []) : [];
      const usersData = allUsersRes.status === "fulfilled" ? (allUsersRes.value.data || []) : [];
      const txData = stripeRes.status === "fulfilled" ? (stripeRes.value.data || []) : [];

      const loadedSettings = { ...settings };
      settingsData.forEach((s: any) => {
        loadedSettings[s.key] = s.value;
      });
      setSettings(loadedSettings);

      setStats({ users: userCount, drops: dropCount, incidents: incidentsData.length, podcasts: 0 });
      setIncidents(incidentsData.slice(0, 10));
      setAllUsers(usersData);
      setStripeTransactions(txData);

      // Stripe aggregate stats
      const successTx = txData.filter((t: any) => t.event_type === "invoice.payment_succeeded");
      const revenue = successTx.reduce((acc: number, t: any) => acc + (t.amount || 0), 0);
      const premiumCount = usersData.filter((u: any) => u.is_premium).length;
      setStripeStats({ total: txData.length, revenue, premium_users: premiumCount });

      // Drops by day
      const daysDrops: Record<string, number> = {};
      const daysEng: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const label = d.toLocaleDateString("es-MX", { weekday: "short" });
        daysDrops[label] = 0;
        daysEng[label] = 0;
      }
      dropsData.forEach((d: any) => {
        const label = new Date(d.created_at).toLocaleDateString("es-MX", { weekday: "short" });
        if (label in daysDrops) daysDrops[label]++;
      });

      const interactionsData = interactionsRes.status === "fulfilled" ? (interactionsRes.value.data || []) : [];
      interactionsData.forEach((i: any) => {
        const label = new Date(i.created_at).toLocaleDateString("es-MX", { weekday: "short" });
        if (label in daysEng) daysEng[label]++;
      });

      setDropsByDay(Object.entries(daysDrops).map(([day, count]) => ({ day, drops: count })));
      setEngagementByDay(Object.entries(daysDrops).map(([day, count]) => {
        const eng = daysEng[day] || 0;
        return { day, rate: count === 0 ? 0 : Math.round((eng / count) * 100) / 100 };
      }));

      const uniCounts: Record<string, number> = {};
      dropsData.forEach((d: any) => {
        const uni = d.profiles?.university_domain || "Otro";
        uniCounts[uni] = (uniCounts[uni] || 0) + 1;
      });
      setUniRanking(Object.entries(uniCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([uni, drops]) => ({ uni, drops })));

      const userStats: Record<string, { drops: number, flags: number }> = {};
      dropsData.forEach((d: any) => {
        const u = d.profiles?.username || "anónimo";
        if (!userStats[u]) userStats[u] = { drops: 0, flags: d.profiles?.flag_count || 0 };
        userStats[u].drops++;
      });
      setTopUsers(Object.entries(userStats).sort((a, b) => b[1].drops - a[1].drops).slice(0, 10).map(([user, data], i) => ({
        user,
        drops: data.drops,
        flags: data.flags,
        rank: i + 1
      })));

      const { data: flaggedData } = await (supabase as any)
        .from('drops')
        .select('id, audio_url, created_at, profiles:author_id(username)')
        .eq('is_flagged', true)
        .order('created_at', { ascending: false });
      setFlaggedDrops(flaggedData || []);

      const { data: logsData } = await (supabase as any)
        .from('moderation_logs')
        .select('*, profiles:user_id(username)')
        .order('created_at', { ascending: false })
        .limit(20);
      setModerationLogs(logsData || []);

    } catch (e) {
      console.error("Dashboard error:", e);
    } finally {
      setLoading(false);
    }
  };

  const grantPremium = async (userId: string, grant: boolean) => {
    const { error } = await (supabase as any)
      .from("profiles")
      .update({
        is_premium: grant,
        premium_granted_by_admin: grant,
        subscription_status: grant ? "active" : "inactive",
        subscription_expires_at: grant ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : null,
      })
      .eq("id", userId);

    if (!error) {
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, is_premium: grant, premium_granted_by_admin: grant } : u));
      toast({ title: grant ? "✅ Premium activado" : "Premium revocado", description: grant ? "El usuario ahora tiene Spot+" : "El usuario volvió a freemium" });
    } else {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const updateUserDomain = async (userId: string, domain: string) => {
    const trimmed = domain.trim().replace(/^@/, "").toLowerCase();
    if (!trimmed) {
      toast({ title: "Dominio vacío", description: "Ingresa un dominio válido.", variant: "destructive" });
      return;
    }
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ university_domain: trimmed })
      .eq("id", userId);

    if (!error) {
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, university_domain: trimmed } : u));
      setDomainEditingId(null);
      toast({ title: "Dominio actualizado", description: `@${trimmed}` });
    } else {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const saveDropDurations = async () => {
    const freemiumVal = Number(settings.drop_duration_freemium);
    const premiumVal = Number(settings.drop_duration_premium);
    if (isNaN(freemiumVal) || isNaN(premiumVal) || freemiumVal < 1 || premiumVal < 1) {
      toast({ title: "Valores inválidos", description: "Las duraciones deben ser mayores a 0", variant: "destructive" });
      return;
    }
    const [r1, r2] = await Promise.all([
      (supabase as any).from("site_settings").upsert({ key: "drop_duration_freemium", value: freemiumVal }),
      (supabase as any).from("site_settings").upsert({ key: "drop_duration_premium", value: premiumVal }),
    ]);
    if (r1.error || r2.error) {
      toast({ title: "Error guardando duraciones", variant: "destructive" });
    } else {
      toast({ title: "✅ Duraciones actualizadas", description: `Freemium: ${freemiumVal}min · Premium: ${premiumVal}min` });
    }
  };

  const testStripeConnection = async () => {
    toast({ title: "Probando conexión a Stripe...", duration: 2000 });
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { _test: true, plan: "monthly" },
      });
      // A missing STRIPE_SECRET_KEY will return a 400 with a specific error
      if (error && error.message?.includes("STRIPE_SECRET_KEY")) {
        throw new Error("STRIPE_SECRET_KEY no está configurada en Supabase");
      }
      // If we get a url back, connection works
      if (data?.url || data?.error?.includes("No such price")) {
        toast({ title: "✅ Stripe conectado", description: "Las credenciales son válidas. Configura el STRIPE_PRICE_ID." });
      } else if (data?.error) {
        throw new Error(data.error);
      } else {
        toast({ title: "✅ Stripe accesible", description: "Conexión establecida correctamente." });
      }
    } catch (err: any) {
      toast({ title: "❌ Error de conexión Stripe", description: err.message || "Revisa STRIPE_SECRET_KEY en Supabase secrets", variant: "destructive" });
    }
  };

  const refreshStripeTransactions = async () => {
    const { data } = await (supabase as any).from("stripe_transactions").select("*").order("created_at", { ascending: false }).limit(50);
    if (data) setStripeTransactions(data);
  };

  if (authLoading) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-spot-lime border-t-transparent" /></div>;

  if (!isAdmin) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-6">
      <Shield size={40} className="text-spot-red" />
      <h1 className="font-bebas text-3xl text-foreground">Acceso restringido</h1>
      <p className="font-mono text-xs text-muted-foreground">Solo administradores pueden ver esta sección.</p>
      <button onClick={() => navigate("/feed")} className="mt-2 rounded-xl bg-spot-lime px-6 py-3 font-bebas text-lg text-black">
        Volver al Canal
      </button>
    </div>
  );

  const TABS = ["overview", "drops", "users", "incidents", "settings", "stripe"] as const;
  const TAB_LABELS: Record<string, string> = {
    overview: "General", drops: "Drops", users: "Usuarios", incidents: "Incidentes", settings: "Config", stripe: "Stripe"
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/feed")} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-bebas text-2xl tracking-wider text-spot-lime">PORTAL DEL ARQUITECTO</h1>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">The Spot — Configuración Maestra</p>
            </div>
          </div>
          <Crown size={20} className="text-amber-400" />
        </div>
        <div className="mx-auto flex max-w-2xl gap-1 overflow-x-auto px-4 pb-2">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`shrink-0 rounded-full px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-all ${tab === t ? "bg-spot-lime text-black" : "text-muted-foreground hover:text-foreground"}`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-spot-lime border-t-transparent" />
          </div>
        ) : (
          <>
            {/* ── Overview ── */}
            {tab === "overview" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard icon={Users} label="Usuarios" value={stats.users} />
                  <StatCard icon={Mic} label="Drops totales" value={stats.drops} color="text-spot-cyan" />
                  <StatCard icon={AlertTriangle} label="Incidentes SOS" value={stats.incidents} color="text-spot-red" />
                  <StatCard icon={Trophy} label="Top universidades" value={uniRanking.length} color="text-amber-400" />
                </div>

                <div className="rounded-2xl border border-border bg-card p-4">
                  <h3 className="mb-4 font-bebas text-lg text-foreground">Drops — Últimos 7 días</h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={dropsByDay} barCategoryGap="30%">
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} width={24} />
                      <Tooltip contentStyle={{ background: "#101010", border: "1px solid #1F1F1F", borderRadius: 12, fontSize: 11 }} />
                      <Bar dataKey="drops" fill="#C8FF00" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4">
                  <h3 className="mb-4 font-bebas text-lg text-foreground flex items-center gap-2">
                    <TrendingUp size={16} className="text-spot-cyan" />
                    Tasa de Engagement (Interacciones / Drop)
                  </h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={engagementByDay}>
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} width={24} />
                      <Tooltip contentStyle={{ background: "#101010", border: "1px solid #1F1F1F", borderRadius: 12, fontSize: 11 }} />
                      <Line type="monotone" dataKey="rate" stroke="#00F0FF" strokeWidth={3} dot={{ fill: '#00F0FF', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {moodDist.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <h3 className="mb-4 font-bebas text-lg text-foreground">Distribución de Estado de Ánimo</h3>
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width="50%" height={140}>
                        <PieChart>
                          <Pie data={moodDist} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                            {moodDist.map((_, i) => <Cell key={i} fill={MOOD_COLORS[i % MOOD_COLORS.length]} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-1.5">
                        {moodDist.map((m, i) => (
                          <div key={m.name} className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ background: MOOD_COLORS[i % MOOD_COLORS.length] }} />
                            <span className="font-mono text-[10px] text-muted-foreground">{m.name}: {m.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── Drops ── */}
            {tab === "drops" && (
              <div className="rounded-2xl border border-border bg-card p-4">
                <h3 className="mb-4 font-bebas text-lg text-foreground">Universidades más activas</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={uniRanking} layout="vertical" barCategoryGap="25%">
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#666" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="uni" tick={{ fontSize: 9, fill: "#888" }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip contentStyle={{ background: "#101010", border: "1px solid #1F1F1F", borderRadius: 12, fontSize: 11 }} />
                    <Bar dataKey="drops" fill="#00F0FF" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>

                <div className="mt-6 space-y-4">
                  <h3 className="font-bebas text-lg text-foreground uppercase tracking-widest">Historial de Moderación Reciente</h3>
                  <div className="space-y-2">
                    {moderationLogs.length === 0 ? (
                      <p className="font-mono text-[10px] text-muted-foreground uppercase opacity-50">Sin actividad registrada</p>
                    ) : moderationLogs.map(log => (
                      <div key={log.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-2 font-mono text-[9px]">
                        <div className="flex items-center gap-2">
                          <span className={`${log.action === 'AUTO_APPROVED' ? 'text-spot-lime' : 'text-spot-red'} font-bold`}>
                            [{log.action}]
                          </span>
                          <span className="text-foreground">@{log.profiles?.username}</span>
                        </div>
                        <span className="text-muted-foreground opacity-60">
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Users ── */}
            {tab === "users" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bebas text-xl text-foreground">Gestión de Usuarios</h3>
                  <span className="font-mono text-[10px] text-muted-foreground">{allUsers.length} usuarios</span>
                </div>

                {/* Top drops */}
                <div className="space-y-2">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Top por drops</p>
                  {topUsers.map((u) => (
                    <div key={u.user} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                      <span className={`font-bebas text-2xl w-8 text-center ${u.rank === 1 ? "text-amber-400" : u.rank === 2 ? "text-gray-300" : u.rank === 3 ? "text-amber-600" : "text-muted-foreground"}`}>
                        {u.rank}
                      </span>
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-lg">🎤</div>
                      <div className="flex-1">
                        <p className="font-bebas text-base leading-none text-foreground flex items-center gap-2">
                          @{u.user}
                          {u.flags > 0 && (
                            <span className="bg-spot-red/10 text-spot-red px-1.5 py-0.5 rounded text-[8px] font-mono leading-none border border-spot-red/20">
                              ⚠️ {u.flags}
                            </span>
                          )}
                        </p>
                        <p className="font-mono text-[10px] text-muted-foreground">{u.drops} drops</p>
                      </div>
                      {u.rank === 1 && <Trophy size={16} className="text-amber-400" />}
                    </div>
                  ))}
                </div>

                {/* Premium + domain management */}
                {/* Datalist for domain autocomplete */}
                <datalist id="domain-list">
                  {KNOWN_DOMAINS.map((d) => (
                    <option key={d.domain} value={d.domain}>{d.label}</option>
                  ))}
                </datalist>

                <div className="space-y-2">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Gestión de Premium y Dominio (Spot+)</p>
                  {allUsers.length === 0 ? (
                    <p className="font-mono text-xs text-muted-foreground">Sin datos.</p>
                  ) : allUsers.map((u) => (
                    <div key={u.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
                      {/* Row 1: avatar + name + premium button */}
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm">
                          {u.role === 'admin' ? '👑' : u.is_premium ? '⭐' : '🎤'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bebas text-sm leading-none text-foreground truncate">
                            @{u.username || "—"}
                            {u.role === 'admin' && <span className="ml-1 text-amber-400 text-[10px]"> ADMIN</span>}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {u.is_premium ? (
                              <span className="font-mono text-[9px] text-spot-lime">Spot+ activo</span>
                            ) : (
                              <span className="font-mono text-[9px] text-muted-foreground">Freemium</span>
                            )}
                            {u.premium_granted_by_admin && (
                              <span className="font-mono text-[8px] text-amber-400 border border-amber-400/30 px-1 rounded">manual</span>
                            )}
                          </div>
                        </div>
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => grantPremium(u.id, !u.is_premium)}
                            className={`shrink-0 rounded-lg px-3 py-1.5 font-bebas text-[11px] transition-all ${u.is_premium
                              ? "bg-muted text-muted-foreground hover:bg-spot-red/20 hover:text-spot-red border border-border"
                              : "bg-spot-lime/10 text-spot-lime border border-spot-lime/30 hover:bg-spot-lime/20"
                            }`}
                          >
                            {u.is_premium ? "REVOCAR" : "DAR SPOT+"}
                          </button>
                        )}
                      </div>

                      {/* Row 2: domain display / edit */}
                      {domainEditingId === u.id ? (
                        <div className="flex items-center gap-2 pl-11">
                          <input
                            list="domain-list"
                            value={domainInput}
                            onChange={(e) => setDomainInput(e.target.value)}
                            placeholder="ej. tec.mx o dominio personalizado"
                            className="flex-1 rounded-lg border border-spot-lime/40 bg-background px-2 py-1 font-mono text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-spot-lime"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") updateUserDomain(u.id, domainInput);
                              if (e.key === "Escape") setDomainEditingId(null);
                            }}
                            autoFocus
                          />
                          <button
                            onClick={() => updateUserDomain(u.id, domainInput)}
                            className="flex h-6 w-6 items-center justify-center rounded-md bg-spot-lime/20 text-spot-lime hover:bg-spot-lime/40"
                          >
                            <CheckIcon size={12} />
                          </button>
                          <button
                            onClick={() => setDomainEditingId(null)}
                            className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground hover:text-foreground"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 pl-11">
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {u.university_domain ? `@${u.university_domain}` : "Sin dominio"}
                          </span>
                          <button
                            onClick={() => {
                              setDomainEditingId(u.id);
                              setDomainInput(u.university_domain || "");
                            }}
                            className="flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground hover:text-foreground hover:border-spot-lime/40 transition-colors"
                          >
                            <Pencil size={9} /> editar
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Incidents ── */}
            {tab === "incidents" && (
              <div className="space-y-3">
                <h3 className="font-bebas text-xl text-foreground">Incidentes SOS recientes</h3>
                {incidents.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-center">
                    <Shield size={32} className="mb-3 text-spot-lime" />
                    <p className="font-mono text-xs text-muted-foreground uppercase">Sin incidentes registrados</p>
                  </div>
                ) : incidents.map((inc: any) => (
                  <div key={inc.id} className="rounded-xl border border-spot-red/20 bg-spot-red/5 p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {new Date(inc.created_at).toLocaleString("es-MX")}
                        </p>
                        {inc.location_lat && (
                          <p className="font-mono text-[10px] text-muted-foreground/60">
                            GPS: {Number(inc.location_lat).toFixed(4)}, {Number(inc.location_lng).toFixed(4)}
                          </p>
                        )}
                      </div>
                      <span className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase ${inc.status === "active" ? "bg-spot-red/20 text-spot-red" : "bg-spot-lime/20 text-spot-lime"}`}>
                        {inc.status === "active" ? "Activo" : "Resuelto"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Settings ── */}
            {tab === "settings" && (
              <div className="space-y-6">
                <h3 className="font-bebas text-xl text-foreground">Configuración de Sistema</h3>

                <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
                  {/* AI moderation toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bebas text-lg text-foreground">Moderación Automática (IA)</h4>
                      <p className="font-mono text-[10px] text-muted-foreground">Analiza el contenido de los audios antes de publicarlos.</p>
                    </div>
                    <button
                      onClick={async () => {
                        const newValue = !settings.ai_moderation_enabled;
                        const { error } = await (supabase as any).from('site_settings').upsert({ key: 'ai_moderation_enabled', value: newValue });
                        if (!error) {
                          setSettings({ ...settings, ai_moderation_enabled: newValue });
                          toast({ title: newValue ? "Moderación activada" : "Moderación desactivada" });
                        }
                      }}
                      className={`relative h-6 w-12 rounded-full transition-colors ${settings.ai_moderation_enabled ? 'bg-spot-lime' : 'bg-muted'}`}
                    >
                      <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${settings.ai_moderation_enabled ? 'left-7 bg-black' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4">
                    <div className="space-y-1">
                      <h4 className="font-bebas text-lg text-foreground">Modo Auto-Piloto</h4>
                      <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">La IA decide el destino del Drop sin intervención del Arquitecto.</p>
                    </div>
                    <button
                      onClick={async () => {
                        const newValue = !settings.auto_moderation_mode;
                        const { error } = await (supabase as any).from('site_settings').upsert({ key: 'auto_moderation_mode', value: newValue });
                        if (!error) {
                          setSettings({ ...settings, auto_moderation_mode: newValue });
                          toast({ title: newValue ? "Auto-Piloto Activado" : "Auto-Piloto Desactivado" });
                        }
                      }}
                      className={`relative h-6 w-12 rounded-full transition-colors ${settings.auto_moderation_mode ? 'bg-spot-lime' : 'bg-muted'}`}
                    >
                      <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${settings.auto_moderation_mode ? 'left-7 bg-black' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4">
                    <div className="space-y-1">
                      <h4 className="font-bebas text-lg text-foreground">Motor de IA</h4>
                      <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Selecciona el ojo que vigilará el campus.</p>
                    </div>
                    <select
                      value={settings.ai_model_provider}
                      onChange={async (e) => {
                        const newValue = e.target.value;
                        const { error } = await (supabase as any).from('site_settings').upsert({ key: 'ai_model_provider', value: newValue });
                        if (!error) {
                          setSettings({ ...settings, ai_model_provider: newValue });
                          toast({ title: `IA cambiada a ${newValue.toUpperCase()}` });
                        }
                      }}
                      className="rounded-lg border border-border bg-black px-3 py-1 font-mono text-[10px] text-spot-lime focus:outline-none focus:border-spot-lime"
                    >
                      <option value="openai">OpenAI (GPT-4o)</option>
                      <option value="gpt-4o-mini">OpenAI (GPT-4o mini)</option>
                      <option value="google">Google (Gemini Pro)</option>
                      <option value="gemini-1.5-flash">Google (Gemini 1.5 Flash)</option>
                      <option value="gemini-1.5-flash-lite">Google (Gemini 1.5 Flash-Lite)</option>
                    </select>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={async () => {
                        toast({ title: "Iniciando prueba de conexión...", duration: 2000 });
                        try {
                          const { data, error } = await supabase.functions.invoke('test-ai', { body: { provider: settings.ai_model_provider } });
                          if (error) throw error;
                          if (data?.success) {
                            toast({ title: "✅ Conexión Exitosa", description: data.message });
                          } else {
                            throw new Error(data?.error || "Error desconocido");
                          }
                        } catch (err: any) {
                          toast({ title: "❌ Fallo de Conexión", description: err.message || "Revisa las API Keys en Supabase", variant: "destructive" });
                        }
                      }}
                      className="rounded-lg bg-spot-cyan/10 px-4 py-2 font-mono text-[10px] text-spot-cyan border border-spot-cyan/20 hover:bg-spot-cyan/20 hover:text-white transition-all uppercase tracking-widest flex items-center gap-2"
                    >
                      Probar Conexión a {settings.ai_model_provider?.split('-')[0].toUpperCase()}
                    </button>
                  </div>

                  <div className="h-px bg-border" />

                  {/* ─ Drop duration config ─ */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-spot-lime" />
                      <h4 className="font-bebas text-lg text-foreground">Duración de Drops</h4>
                    </div>
                    <p className="font-mono text-[10px] text-muted-foreground">Configura cuántos minutos duran los drops según el plan del usuario.</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Freemium (min)</label>
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={settings.drop_duration_freemium}
                          onChange={(e) => setSettings({ ...settings, drop_duration_freemium: e.target.value })}
                          className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 font-mono text-sm text-foreground focus:border-spot-lime/50 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="font-mono text-[10px] uppercase tracking-widest text-spot-lime">Spot+ Premium (min)</label>
                        <input
                          type="number"
                          min={1}
                          max={1440}
                          value={settings.drop_duration_premium}
                          onChange={(e) => setSettings({ ...settings, drop_duration_premium: e.target.value })}
                          className="w-full rounded-lg border border-spot-lime/30 bg-spot-lime/5 px-3 py-2 font-mono text-sm text-spot-lime focus:border-spot-lime focus:outline-none"
                        />
                      </div>
                    </div>
                    <button
                      onClick={saveDropDurations}
                      className="rounded-lg bg-spot-lime px-4 py-2 font-bebas text-sm text-black hover:bg-spot-lime/80 transition-all"
                    >
                      GUARDAR DURACIONES
                    </button>
                  </div>

                  <div className="h-px bg-border" />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bebas text-lg text-foreground">Reglas de Moderación</h4>
                      <button
                        onClick={async () => {
                          const { error } = await (supabase as any).from('site_settings').upsert({ key: 'moderation_rules', value: settings.moderation_rules });
                          if (!error) toast({ title: "Reglas actualizadas" });
                        }}
                        className="rounded-md bg-spot-lime/10 px-2 py-1 font-bebas text-[10px] text-spot-lime border border-spot-lime/20 hover:bg-spot-lime/20"
                      >
                        GUARDAR REGLAS
                      </button>
                    </div>
                    <textarea
                      value={settings.moderation_rules}
                      onChange={(e) => setSettings({ ...settings, moderation_rules: e.target.value })}
                      className="w-full rounded-xl border border-border bg-muted/50 p-4 font-mono text-[11px] h-32 text-zinc-300 focus:border-spot-lime/50 focus:outline-none focus:bg-black/20"
                      placeholder="Ej: Bloquear acoso, lenguaje vulgar, o menciones a la competencia..."
                    />
                  </div>
                </div>

                {/* Moderation queue */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bebas text-xl text-foreground">Cola de Moderación ({flaggedDrops.length})</h3>
                    {flaggedDrops.length > 0 && (
                      <span className="animate-pulse rounded-full bg-spot-red px-2 py-0.5 font-mono text-[8px] uppercase text-white">Pendiente</span>
                    )}
                  </div>

                  {flaggedDrops.length === 0 ? (
                    <div className="rounded-xl border border-border bg-card/50 p-8 text-center">
                      <Shield size={24} className="mx-auto mb-2 text-muted-foreground opacity-20" />
                      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Sin drops para revisión</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {flaggedDrops.map((drop) => (
                        <div key={drop.id} className="group relative flex flex-col gap-3 rounded-2xl border border-spot-red/20 bg-card p-4 transition-all hover:border-spot-red/40 hover:bg-spot-red/5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertTriangle size={14} className="text-spot-red" />
                              <span className="font-bebas text-sm text-foreground">@{drop.profiles?.username || "anónimo"}</span>
                              <span className="font-mono text-[9px] text-muted-foreground opacity-60">
                                {new Date(drop.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={async () => {
                                  const { error } = await supabase.functions.invoke('moderate-drop', { body: { drop_id: drop.id, action: 'ADMIN_APPROVE' } });
                                  if (!error) {
                                    setFlaggedDrops(prev => prev.filter(d => d.id !== drop.id));
                                    toast({ title: "Drop aprobado ✅" });
                                  }
                                }}
                                className="rounded-lg bg-spot-lime px-3 py-1 font-bebas text-[11px] text-black shadow-lg shadow-spot-lime/20 transition-all hover:scale-105"
                              >
                                APROBAR
                              </button>
                              <button
                                onClick={async () => {
                                  const { error } = await supabase.functions.invoke('moderate-drop', { body: { drop_id: drop.id, action: 'ADMIN_REJECT' } });
                                  if (!error) {
                                    setFlaggedDrops(prev => prev.filter(d => d.id !== drop.id));
                                    toast({ title: "Drop eliminado" });
                                  }
                                }}
                                className="rounded-lg bg-muted px-3 py-1 font-bebas text-[11px] text-muted-foreground hover:bg-spot-red hover:text-white transition-all"
                              >
                                RECHAZAR
                              </button>
                            </div>
                          </div>
                          <audio controls src={drop.audio_url} className="h-8 w-full brightness-90 saturate-50 hover:brightness-100 transition-all" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-spot-cyan/20 bg-spot-cyan/5 p-4">
                  <p className="font-mono text-[10px] text-spot-cyan leading-relaxed">
                    <TrendingUp size={12} className="inline mr-1 mb-0.5" />
                    <strong>Nota:</strong> Al usar WebM (Opus) ahorramos ~70% de ancho de banda vs MP3 estándar.
                  </p>
                </div>
              </div>
            )}

            {/* ── Stripe ── */}
            {tab === "stripe" && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <CreditCard size={20} className="text-spot-lime" />
                  <h3 className="font-bebas text-xl text-foreground">Panel de Stripe — Spot+</h3>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-border bg-card p-4 text-center">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Usuarios Premium</p>
                    <p className="font-bebas text-3xl text-spot-lime">{stripeStats.premium_users}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-4 text-center">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Transacciones</p>
                    <p className="font-bebas text-3xl text-spot-cyan">{stripeStats.total}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-4 text-center">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Ingresos</p>
                    <p className="font-bebas text-3xl text-amber-400">
                      ${(stripeStats.revenue / 100).toFixed(0)}
                      <span className="text-xs text-muted-foreground ml-1">MXN</span>
                    </p>
                  </div>
                </div>

                {/* Connection test */}
                <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                  <h4 className="font-bebas text-lg text-foreground flex items-center gap-2">
                    <Zap size={16} className="text-amber-400" />
                    Prueba de Conexión
                  </h4>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    Verifica que <code className="text-spot-lime">STRIPE_SECRET_KEY</code> y <code className="text-spot-lime">STRIPE_PRICE_ID</code> estén configuradas en los secretos de Supabase.
                  </p>
                  <div className="rounded-lg border border-border bg-muted/30 p-3 font-mono text-[10px] text-muted-foreground space-y-1">
                    <p>Secrets requeridos en Supabase → Edge Functions:</p>
                    <p className="text-spot-lime">• STRIPE_SECRET_KEY — clave secreta de Stripe (sk_...)</p>
                    <p className="text-spot-lime">• STRIPE_WEBHOOK_SECRET — desde Stripe Webhooks (whsec_...)</p>
                    <p className="text-spot-lime">• STRIPE_PRICE_ID — ID del precio mensual (price_...)</p>
                    <p className="text-spot-cyan">• STRIPE_PRICE_ID_YEARLY — ID del precio anual (opcional)</p>
                    <p className="text-spot-cyan">• APP_URL — URL del frontend (https://thespot.lovable.app)</p>
                  </div>
                  <button
                    onClick={testStripeConnection}
                    className="flex items-center gap-2 rounded-lg bg-spot-lime/10 px-4 py-2 font-mono text-[10px] text-spot-lime border border-spot-lime/30 hover:bg-spot-lime/20 transition-all uppercase tracking-widest"
                  >
                    <Zap size={12} /> Probar Conexión a Stripe
                  </button>
                </div>

                {/* Transactions */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bebas text-lg text-foreground">Transacciones Recientes</h4>
                    <button
                      onClick={refreshStripeTransactions}
                      className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground hover:text-spot-lime transition-colors"
                    >
                      Actualizar
                    </button>
                  </div>

                  {stripeTransactions.length === 0 ? (
                    <div className="rounded-xl border border-border bg-card/50 p-10 text-center">
                      <CreditCard size={28} className="mx-auto mb-3 text-muted-foreground opacity-20" />
                      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Sin transacciones aún</p>
                      <p className="font-mono text-[9px] text-muted-foreground/50 mt-1">Las transacciones aparecerán aquí al recibir webhooks de Stripe.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {stripeTransactions.map((tx) => {
                        const isSuccess = tx.status === "succeeded" || tx.status === "active";
                        const isFailed = tx.status === "failed" || tx.status === "canceled";
                        return (
                          <div key={tx.id} className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isSuccess ? "bg-spot-lime/10" : isFailed ? "bg-spot-red/10" : "bg-amber-400/10"}`}>
                              {isSuccess ? <CheckCircle size={14} className="text-spot-lime" /> : isFailed ? <XCircle size={14} className="text-spot-red" /> : <Clock size={14} className="text-amber-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-mono text-[10px] text-foreground truncate">{tx.event_type}</p>
                              <p className="font-mono text-[9px] text-muted-foreground">
                                {new Date(tx.created_at).toLocaleString("es-MX")}
                                {tx.stripe_customer && <span className="ml-2 opacity-50 truncate">{tx.stripe_customer}</span>}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              {tx.amount != null && (
                                <p className={`font-bebas text-base ${isSuccess ? "text-spot-lime" : "text-muted-foreground"}`}>
                                  ${(tx.amount / 100).toFixed(2)}
                                  <span className="text-[9px] ml-0.5 uppercase">{tx.currency || "mxn"}</span>
                                </p>
                              )}
                              <span className={`font-mono text-[8px] uppercase px-1.5 py-0.5 rounded ${isSuccess ? "bg-spot-lime/10 text-spot-lime" : isFailed ? "bg-spot-red/10 text-spot-red" : "bg-amber-400/10 text-amber-400"}`}>
                                {tx.status || "—"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Webhook setup instructions */}
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 space-y-2">
                  <p className="font-mono text-[10px] text-amber-400 font-bold uppercase tracking-widest">Configuración del Webhook en Stripe</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    En el dashboard de Stripe → Developers → Webhooks, agrega este endpoint:
                  </p>
                  <code className="block rounded bg-black/40 px-3 py-2 font-mono text-[10px] text-spot-lime break-all">
                    https://inchlsvnvdotbxqnsxmd.supabase.co/functions/v1/stripe-webhook
                  </code>
                  <p className="font-mono text-[9px] text-muted-foreground">
                    Eventos a escuchar: <span className="text-spot-cyan">customer.subscription.*</span> · <span className="text-spot-cyan">invoice.payment_succeeded</span> · <span className="text-spot-cyan">invoice.payment_failed</span> · <span className="text-spot-cyan">checkout.session.completed</span>
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
