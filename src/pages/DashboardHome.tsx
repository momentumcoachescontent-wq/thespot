import { useState, useEffect, useRef } from "react";
import { Mic, MapPin, CalendarDays, Trophy, Headphones, Play, Pause, RefreshCw, UserPlus, Smile } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MoodSelector from "@/components/MoodSelector";
import { useToast } from "@/hooks/use-toast";

const MOOD_TO_INT: Record<string, number> = { anxious: 1, frustrated: 2, low: 2, neutral: 3, good: 4, motivated: 5 };

// ─── Widget wrapper ───────────────────────────────────────────────────────────
const Widget = ({ title, icon: Icon, linkTo, children, span = "" }: any) => {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col rounded-2xl border border-border bg-card overflow-hidden ${span}`}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="flex items-center gap-2 font-bebas text-base tracking-wider text-foreground">
          <Icon size={15} className="text-spot-lime" />
          {title}
        </span>
        {linkTo && (
          <button
            onClick={() => navigate(linkTo)}
            className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/50 hover:text-spot-lime transition-colors"
          >
            Ver todo →
          </button>
        )}
      </div>
      <div className="flex-1 overflow-hidden p-4">{children}</div>
    </motion.div>
  );
};

// ─── Drops Widget ─────────────────────────────────────────────────────────────
const DropsWidget = () => {
  const [drops, setDrops] = useState<any[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    (supabase as any)
      .from("drops")
      .select("id, audio_url, created_at, profiles:author_id(username)")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }: any) => { setDrops(data || []); setLoading(false); });
  }, []);

  const toggle = (drop: any) => {
    if (playingId === drop.id) { audioRef.current?.pause(); setPlayingId(null); }
    else { if (audioRef.current) { audioRef.current.src = drop.audio_url; audioRef.current.play().catch(() => {}); } setPlayingId(drop.id); }
  };

  if (loading) return <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 animate-pulse rounded-lg bg-muted/30" />)}</div>;
  if (!drops.length) return <p className="py-6 text-center font-mono text-xs text-muted-foreground">Canal en silencio — sé el primero</p>;

  return (
    <div className="space-y-2">
      {drops.map(d => (
        <div key={d.id} className="flex items-center gap-3 rounded-xl bg-muted/20 px-3 py-2">
          <button onClick={() => toggle(d)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-spot-lime text-black">
            {playingId === d.id ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-bebas text-sm leading-none text-foreground truncate">@{d.profiles?.username || "anónimo"}</p>
            <p className="font-mono text-[9px] text-muted-foreground">{new Date(d.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
        </div>
      ))}
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} />
    </div>
  );
};

// ─── Map Widget ───────────────────────────────────────────────────────────────
const MapWidget = () => {
  const [spots, setSpots] = useState<any[]>([]);
  const [hasLocation, setHasLocation] = useState(false);

  useEffect(() => {
    (supabase as any).from("spots").select("id, name, university_domain").limit(6).then(({ data }: any) => setSpots(data || []));
    navigator.geolocation?.getCurrentPosition(() => setHasLocation(true), () => {});
  }, []);

  return (
    <div className="flex flex-col items-center">
      {/* Mini radar */}
      <div className="relative flex h-32 w-32 items-center justify-center">
        {[56, 40, 24].map((r, i) => (
          <motion.div key={r} className="absolute rounded-full border border-spot-lime/15" style={{ width: r * 2, height: r * 2 }}
            animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 3, delay: i * 0.8, repeat: Infinity }} />
        ))}
        <motion.div className="absolute origin-bottom h-14 w-[1.5px] rounded-full bg-gradient-to-t from-spot-lime/50 to-transparent"
          style={{ bottom: "50%", left: "50%", transformOrigin: "bottom center" }}
          animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} />
        <div className="relative z-10 h-3 w-3 rounded-full bg-spot-lime shadow-[0_0_8px_rgba(200,255,0,0.8)]" />
        {spots.slice(0, 4).map((_, i) => {
          const angle = (i / 4) * 2 * Math.PI - Math.PI / 2;
          const r = 36 + (i % 2) * 18;
          return (
            <div key={i} className="absolute h-2 w-2 rounded-full bg-spot-cyan/60 border border-spot-cyan/80"
              style={{ left: `calc(50% + ${Math.cos(angle) * r}px - 4px)`, top: `calc(50% + ${Math.sin(angle) * r}px - 4px)` }} />
          );
        })}
      </div>
      <p className={`mt-2 font-mono text-[9px] uppercase tracking-widest ${hasLocation ? "text-spot-lime" : "text-muted-foreground"}`}>
        {hasLocation ? "Ubicación activa" : "Activa tu ubicación"}
      </p>
      <p className="mt-1 font-mono text-[9px] text-muted-foreground">{spots.length} spots cercanos</p>
    </div>
  );
};

// ─── Top Users Widget ─────────────────────────────────────────────────────────
const TopUsersWidget = () => {
  const [users, setUsers] = useState<{ username: string; count: number }[]>([]);

  useEffect(() => {
    (supabase as any)
      .from("drops")
      .select("profiles:author_id(username)")
      .gt("expires_at", new Date().toISOString())
      .limit(100)
      .then(({ data }: any) => {
        const map: Record<string, number> = {};
        (data || []).forEach((d: any) => { const u = d.profiles?.username || "anónimo"; map[u] = (map[u] || 0) + 1; });
        setUsers(Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([username, count]) => ({ username, count })));
      });
  }, []);

  const medals = ["🥇", "🥈", "🥉", "4", "5"];

  if (!users.length) return <p className="py-4 text-center font-mono text-xs text-muted-foreground">Sin drops hoy</p>;

  return (
    <div className="space-y-2">
      {users.map((u, i) => (
        <div key={u.username} className="flex items-center gap-3">
          <span className="w-6 text-center text-base shrink-0">{medals[i]}</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm shrink-0">🎤</div>
          <div className="flex-1 min-w-0">
            <p className="font-bebas text-sm leading-none truncate text-foreground">@{u.username}</p>
          </div>
          <span className={`font-mono text-xs shrink-0 ${i === 0 ? "text-amber-400" : "text-muted-foreground"}`}>{u.count}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Events Widget ────────────────────────────────────────────────────────────
const EventsWidget = () => {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    (supabase as any)
      .from("events")
      .select("id, title, event_date, spots:spot_id(name)")
      .gt("event_date", new Date().toISOString())
      .order("event_date", { ascending: true })
      .limit(3)
      .then(({ data }: any) => setEvents(data || []));
  }, []);

  if (!events.length) return (
    <div className="flex flex-col items-center py-4 text-center">
      <CalendarDays size={24} className="mb-2 text-muted-foreground/30" />
      <p className="font-mono text-xs text-muted-foreground">Sin eventos próximos</p>
    </div>
  );

  return (
    <div className="space-y-2">
      {events.map(ev => (
        <div key={ev.id} className="rounded-xl border border-border bg-muted/10 px-3 py-2">
          <p className="font-bebas text-sm leading-none text-foreground">{ev.title}</p>
          <p className="font-mono text-[9px] text-muted-foreground mt-0.5">
            {new Date(ev.event_date).toLocaleDateString("es-MX", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            {ev.spots?.name ? ` · ${ev.spots.name}` : ""}
          </p>
        </div>
      ))}
    </div>
  );
};

// ─── Podcast Widget ───────────────────────────────────────────────────────────
const PodcastWidget = () => {
  const [pods, setPods] = useState<any[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    (supabase as any)
      .from("podcasts")
      .select("id, title, audio_url, duration_seconds")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(2)
      .then(({ data }: any) => setPods(data || []));
  }, []);

  if (!pods.length) return (
    <div className="flex flex-col items-center py-4 text-center">
      <Headphones size={24} className="mb-2 text-muted-foreground/30" />
      <p className="font-mono text-xs text-muted-foreground">Sin podcasts activos</p>
    </div>
  );

  return (
    <div className="space-y-2">
      {pods.map(pod => (
        <div key={pod.id} className="flex items-center gap-3 rounded-xl border border-border bg-muted/10 px-3 py-2">
          <button
            onClick={() => {
              if (playingId === pod.id) { audioRef.current?.pause(); setPlayingId(null); }
              else { if (audioRef.current) { audioRef.current.src = pod.audio_url; audioRef.current.play().catch(() => {}); } setPlayingId(pod.id); }
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-spot-lime text-black shrink-0"
          >
            {playingId === pod.id ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" className="ml-0.5" />}
          </button>
          <p className="font-bebas text-sm leading-none text-foreground truncate">{pod.title}</p>
        </div>
      ))}
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} />
    </div>
  );
};

// ─── Mood Widget ──────────────────────────────────────────────────────────────
const MoodWidget = () => {
  const { toast } = useToast();
  const [selected, setSelected] = useState<string | undefined>();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!selected) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await (supabase as any).from("mood_checkins").insert({ user_id: user.id, mood: MOOD_TO_INT[selected] ?? 3 }).catch(() => {});
    }
    setSubmitted(true);
    toast({ title: "Estado registrado", description: "Gracias por compartir cómo te sientes." });
    setTimeout(() => { setSubmitted(false); setSelected(undefined); }, 8000);
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
        disabled={!selected}
        className={`w-full rounded-xl py-2.5 font-bebas text-base tracking-wider transition-all ${selected ? "bg-spot-lime text-black shadow-[0_0_15px_rgba(200,255,0,0.3)]" : "bg-muted text-muted-foreground"}`}
      >
        REGISTRAR
      </motion.button>
    </div>
  );
};

// ─── DashboardHome ────────────────────────────────────────────────────────────
const DashboardHome = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="px-4 py-3 lg:px-6">
          <h1 className="font-bebas text-2xl tracking-wider text-foreground">DASHBOARD</h1>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Vista unificada de tu campus</p>
        </div>
      </div>

      {/* Grid responsivo */}
      <div className="p-4 lg:p-6">
        {/* Mobile: single column  |  md: 2 cols  |  lg+: 3 cols */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">

          {/* Canal (drops) — span 2 cols on lg */}
          <Widget title="CANAL EN VIVO" icon={Mic} linkTo="/feed" span="lg:col-span-2">
            <DropsWidget />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/feed")}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-spot-lime py-2.5 font-bebas text-base tracking-wider text-black shadow-[0_0_15px_rgba(200,255,0,0.3)]"
            >
              <Mic size={16} fill="currentColor" />
              GRABAR UN DROP
            </motion.button>
          </Widget>

          {/* Mapa */}
          <Widget title="MAPA DE SPOTS" icon={MapPin} linkTo="/map">
            <MapWidget />
          </Widget>

          {/* Top Usuarios */}
          <Widget title="TOP USUARIOS" icon={Trophy} linkTo="/feed">
            <TopUsersWidget />
          </Widget>

          {/* Eventos */}
          <Widget title="PRÓXIMOS EVENTOS" icon={CalendarDays} linkTo="/events">
            <EventsWidget />
          </Widget>

          {/* Podcast */}
          <Widget title="PODCAST" icon={Headphones} linkTo="/podcast">
            <PodcastWidget />
          </Widget>

          {/* Mood — span full on md+, 1 col on mobile */}
          <Widget title="¿CÓMO ESTÁS HOY?" icon={Smile} span="md:col-span-2 lg:col-span-3">
            <MoodWidget />
          </Widget>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
