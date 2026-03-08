import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Users, Mic, Shield, Trophy, TrendingUp, AlertTriangle, ArrowLeft, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { useAuth } from "@/contexts/AuthContext";

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

const MOOD_LABELS: Record<number, string> = { 1: "Ansioso", 2: "Bajo", 3: "Normal", 4: "Bien", 5: "Motivado" };
const MOOD_COLORS = ["#FF2D55", "#FF6B6B", "#888", "#C8FF00", "#00F0FF"];

const AdminPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<"overview" | "drops" | "users" | "incidents" | "settings">("overview");
  const [settings, setSettings] = useState<any>({
    ai_moderation_enabled: false,
    auto_moderation_mode: false,
    moderation_rules: "",
    ai_model_provider: "openai"
  });
  const [stats, setStats] = useState({ users: 0, drops: 0, incidents: 0, podcasts: 0 });
  const [dropsByDay, setDropsByDay] = useState<any[]>([]);
  const [uniRanking, setUniRanking] = useState<any[]>([]);
  const [moodDist, setMoodDist] = useState<any[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [flaggedDrops, setFlaggedDrops] = useState<any[]>([]);
  const [moderationLogs, setModerationLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      loadDashboard();
    }
  }, [isAdmin]);

  const loadDashboard = async () => {
    try {
      // Parallel data loading
      const [profilesRes, dropsRes, incidentsRes, moodRes, settingsRes] = await Promise.allSettled([
        (supabase as any).from("profiles").select("id, flag_count", { count: "exact", head: true }),
        (supabase as any).from("drops").select("id, created_at, profiles:author_id(username, university_domain, flag_count)", { count: "exact" }).order("created_at", { ascending: false }).limit(200),
        (supabase as any).from("sos_incidents").select("*").order("created_at", { ascending: false }).limit(50),
        (supabase as any).from("mood_checkins").select("mood").limit(500),
        (supabase as any).from("site_settings").select("*")
      ]);

      const userCount = profilesRes.status === "fulfilled" ? (profilesRes.value.count || 0) : 0;
      const dropsData = dropsRes.status === "fulfilled" ? (dropsRes.value.data || []) : [];
      const dropCount = dropsRes.status === "fulfilled" ? (dropsRes.value.count || 0) : 0;
      const incidentsData = incidentsRes.status === "fulfilled" ? (incidentsRes.value.data || []) : [];
      const moodData = moodRes.status === "fulfilled" ? (moodRes.value.data || []) : [];
      const settingsData = settingsRes.status === "fulfilled" ? (settingsRes.value.data || []) : [];

      const loadedSettings = { ...settings };
      settingsData.forEach((s: any) => {
        loadedSettings[s.key] = s.value;
      });
      setSettings(loadedSettings);

      setStats({ users: userCount, drops: dropCount, incidents: incidentsData.length, podcasts: 0 });
      setIncidents(incidentsData.slice(0, 10));

      // Drops by day (last 7 days)
      const days: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days[d.toLocaleDateString("es-MX", { weekday: "short" })] = 0;
      }
      dropsData.forEach((d: any) => {
        const label = new Date(d.created_at).toLocaleDateString("es-MX", { weekday: "short" });
        if (label in days) days[label]++;
      });
      setDropsByDay(Object.entries(days).map(([day, count]) => ({ day, drops: count })));

      // University ranking
      const uniCounts: Record<string, number> = {};
      dropsData.forEach((d: any) => {
        const uni = d.profiles?.university_domain || "Otro";
        uniCounts[uni] = (uniCounts[uni] || 0) + 1;
      });
      setUniRanking(Object.entries(uniCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([uni, drops]) => ({ uni, drops })));

      // Top users
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

      // Mood distribution
      const moodCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      // Moderation queue
      const { data: flaggedData } = await (supabase as any)
        .from('drops')
        .select('id, audio_url, created_at, profiles:author_id(username)')
        .eq('is_flagged', true)
        .order('created_at', { ascending: false });

      setFlaggedDrops(flaggedData || []);

      // Moderation logs
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
        {/* Tabs */}
        <div className="mx-auto flex max-w-2xl gap-1 overflow-x-auto px-4 pb-2">
          {(["overview", "drops", "users", "incidents", "settings"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`shrink-0 rounded-full px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-all ${tab === t ? "bg-spot-lime text-black" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t === "overview" ? "General" : t === "drops" ? "Drops" : t === "users" ? "Usuarios" : t === "incidents" ? "Incidentes" : "Config"}
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
            {/* Overview tab */}
            {tab === "overview" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard icon={Users} label="Usuarios" value={stats.users} />
                  <StatCard icon={Mic} label="Drops totales" value={stats.drops} color="text-spot-cyan" />
                  <StatCard icon={AlertTriangle} label="Incidentes SOS" value={stats.incidents} color="text-spot-red" />
                  <StatCard icon={Trophy} label="Top universidades" value={uniRanking.length} color="text-amber-400" />
                </div>

                {/* Drops por día */}
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

                {/* Mood distribution */}
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

            {/* Drops tab */}
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

            {/* Users tab */}
            {tab === "users" && (
              <div className="space-y-3">
                <h3 className="font-bebas text-xl text-foreground">Top usuarios por drops</h3>
                {topUsers.length === 0 ? (
                  <p className="font-mono text-xs text-muted-foreground">Sin datos suficientes aún.</p>
                ) : topUsers.map((u) => (
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
            )}

            {/* Incidents tab */}
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

            {/* Settings tab */}
            {tab === "settings" && (
              <div className="space-y-6">
                <h3 className="font-bebas text-xl text-foreground">Configuración de Sistema</h3>

                <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bebas text-lg text-foreground">Moderación Automática (IA)</h4>
                      <p className="font-mono text-[10px] text-muted-foreground">Analiza el contenido de los audios antes de publicarlos.</p>
                    </div>
                    <button
                      onClick={async () => {
                        const newValue = !settings.ai_moderation_enabled;
                        const { error } = await (supabase as any)
                          .from('site_settings')
                          .upsert({ key: 'ai_moderation_enabled', value: newValue });

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
                        const { error } = await (supabase as any)
                          .from('site_settings')
                          .upsert({ key: 'auto_moderation_mode', value: newValue });

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
                        const { error } = await (supabase as any)
                          .from('site_settings')
                          .upsert({ key: 'ai_model_provider', value: newValue });

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

                  <div className="h-px bg-border" />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bebas text-lg text-foreground">Reglas de Moderación</h4>
                      <button
                        onClick={async () => {
                          const { error } = await (supabase as any)
                            .from('site_settings')
                            .upsert({ key: 'moderation_rules', value: settings.moderation_rules });

                          if (!error) toast({ title: "Reglas actualizadas" });
                        }}
                        className="rounded-md bg-spot-lime/10 px-2 py-1 font-bebas text-[10px] text-spot-lime border border-spot-lime/20 hover:bg-spot-lime/20"
                      >
                        GUARDAR REGLAS
                      </button>
                    </div>
                    <p className="font-mono text-[10px] text-muted-foreground">Personaliza el criterio de la IA. Sé específico sobre qué prohibir.</p>
                    <textarea
                      value={settings.moderation_rules}
                      onChange={(e) => setSettings({ ...settings, moderation_rules: e.target.value })}
                      className="w-full rounded-xl border border-border bg-muted/50 p-4 font-mono text-[11px] h-32 text-zinc-300 focus:border-spot-lime/50 focus:outline-none focus:bg-black/20"
                      placeholder="Ej: Bloquear acoso, lenguaje vulgar, o menciones a la competencia..."
                    />
                  </div>
                </div>

                {/* Moderation Queue */}
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
                                  const { error } = await (supabase as any).from('drops').update({ is_flagged: false }).eq('id', drop.id);
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
                                  const { error } = await (supabase as any).from('drops').delete().eq('id', drop.id);
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
                    <strong>Nota de Rendimiento:</strong> Al usar WebM (Opus), estamos ahorrando un 70% de ancho de banda en comparación con MP3 estándar.
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
