import { useEffect, useState } from "react";
import { Mic, RefreshCw, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import TopBar from "@/components/TopBar";
import DropCard from "@/components/DropCard";
import VoiceRecorder from "@/components/VoiceRecorder";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { useAuth } from "@/contexts/AuthContext";
import { useFilter } from "@/contexts/FilterContext";
import UniversitySelector from "@/components/UniversitySelector";

const FeedPage = () => {
  const { user, profile, isPremium, isAdmin } = useAuth();
  const { resolvedDomain } = useFilter();
  const [showRecorder, setShowRecorder] = useState(false);
  const [drops, setDrops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSpot, setCurrentSpot] = useState<any>(null);
  const [topUsers, setTopUsers] = useState<{ username: string; count: number }[]>([]);
  const [recordingLimits, setRecordingLimits] = useState({ freemium: 30, premium: 60 });
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchDrops = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      if (!user) { setLoading(false); return; }

      let query = (supabase as any)
        .from("drops")
        .select("id, audio_url, created_at, expires_at, duration_seconds, listened_count, profiles:author_id(username), reactions(count)")
        .gt("expires_at", new Date().toISOString());

      if (resolvedDomain) {
        // Obtenemos los spots que pertenecen a este dominio
        const { data: spotIds } = await (supabase as any).from("spots").select("id").eq("university_domain", resolvedDomain);
        const ids = (spotIds || []).map((s: any) => s.id);
        if (ids.length > 0) {
          query = query.in("spot_id", ids);
        } else {
          setDrops([]);
          setLoading(false);
          return;
        }
      }

      const { data: realDrops, error } = await query.order("created_at", { ascending: false }).limit(50);

      if (error) throw error;

      const formattedDrops = (realDrops || []).map((d: any) => ({
        id: d.id,
        username: d.profiles?.username || "Anónimo",
        avatarEmoji: "🎙️",
        audioUrl: d.audio_url,
        createdAt: new Date(d.created_at),
        expiresAt: new Date(d.expires_at),
        durationSeconds: d.duration_seconds,
        listenedCount: d.listened_count,
        reactionCount: d.reactions?.[0]?.count || 0
      }));

      setDrops(formattedDrops);

      const displayDomain = resolvedDomain || "Todas las sedes";
      setCurrentSpot({ name: resolvedDomain ? `Campus ${resolvedDomain.toUpperCase()}` : "Global" });

      const userMap: Record<string, number> = {};
      (realDrops || []).forEach((d: any) => {
        const u = d.profiles?.username || "anónimo";
        userMap[u] = (userMap[u] || 0) + 1;
      });
      setTopUsers(Object.entries(userMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([username, count]) => ({ username, count })));
    } catch (error: any) {
      toast({ title: "Error al sincronizar", description: error.message, variant: "destructive" });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    const loadRecordingLimits = async () => {
      const { data } = await (supabase as any)
        .from("site_settings")
        .select("key, value")
        .in("key", ["recording_limit_freemium", "recording_limit_premium"]);
      if (data?.length) {
        const map: Record<string, number> = {};
        data.forEach((s: any) => { map[s.key] = Number(s.value); });
        setRecordingLimits({
          freemium: map["recording_limit_freemium"] || 30,
          premium: map["recording_limit_premium"] || 60,
        });
      }
    };
    loadRecordingLimits();
  }, []);

  useEffect(() => {
    fetchDrops();
    const channel = (supabase as any)
      .channel("drops-feed-global")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "drops" }, () => {
        fetchDrops(true);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "drops" }, () => {
        fetchDrops(true);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, () => {
        fetchDrops(true);
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [user, resolvedDomain]); // Re-ejecutar si cambia el filtro

  const handleRecorded = async (blob: Blob, duration: number) => {
    try {
      setShowRecorder(false);
      toast({ title: "Subiendo drop...", description: "Transformando miedo en acción." });

      if (!user) { toast({ title: "Sin sesión", description: "Inicia sesión para grabar.", variant: "destructive" }); return; }

      let userLat = 0, userLng = 0;
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
        );
        userLat = position.coords.latitude;
        userLng = position.coords.longitude;
      } catch (geoError) {
        console.warn("Geolocation failed, using default location.", geoError);
        toast({
          title: "Sin ubicación GPS",
          description: "Tu drop se asociará al campus general."
        });
      }

      const fileName = `${user.id}-${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage.from("drops").upload(fileName, blob, { contentType: "audio/webm" });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("drops").getPublicUrl(fileName);

      // FIX: Prefer resolvedDomain (active filter) over profile domain during recording
      const domain = resolvedDomain || profile?.university_domain || "demo.edu";
      console.log(`Recording drop for domain: ${domain}`);

      let { data: spots } = await (supabase as any).from("spots").select("id").eq("university_domain", domain).limit(1);
      let spotId = spots?.[0]?.id;
      if (!spotId) {
        const { data: newSpot, error: spotError } = await (supabase as any).from("spots").insert({
          name: `Campus ${domain.toUpperCase()}`,
          university_domain: domain,
          location: `POINT(${userLng} ${userLat})`,
          creator_id: user.id
        }).select("id").single();
        if (spotError) throw spotError;
        spotId = newSpot.id;
      }

      // Fetch configurable drop duration from site_settings based on user tier
      const isPremiumUser = isPremium || isAdmin;
      const durationKey = isPremiumUser ? "drop_duration_premium" : "drop_duration_freemium";
      const { data: durationSetting } = await (supabase as any)
        .from("site_settings")
        .select("value")
        .eq("key", durationKey)
        .single();
      const dropMinutes = Number(durationSetting?.value) || (isPremiumUser ? 15 : 5);
      const expiresAt = new Date(Date.now() + dropMinutes * 60000).toISOString();

      const { error: dbError } = await (supabase as any).from("drops").insert({
        spot_id: spotId,
        author_id: user.id,
        audio_url: publicUrl,
        duration_seconds: duration || 1,
        expires_at: expiresAt,
      });
      if (dbError) throw dbError;

      // 💥 GUARDAR EN HISTORIAL (PERSISTENCIA FASE 9)
      const { error: historyError } = await (supabase as any).from("drop_history").insert({
        author_id: user.id,
        duration_seconds: Math.floor(blob.size / 15000) || 10
      });
      if (historyError) console.error("Error guardando en historial persistente:", historyError);

      toast({ title: "Drop activo 🎙️", description: `Tu voz es ahora parte del presente. Desaparecerá en ${dropMinutes} minutos.` });

      // Fire-and-forget: notify campus users about new drop
      supabase.functions.invoke("send-push", {
        body: {
          university_domain: domain,
          title: "🎙️ Nuevo drop en tu campus",
          body: `@${profile?.username} acaba de publicar`,
          url: "/feed",
          tag: "campus-drop",
        },
      }).catch(() => {});

      fetchDrops();
    } catch (error: any) {
      toast({ title: "Error en la transmisión", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar spotName={currentSpot?.name || "THE SPOT"} onlineCount={drops.length} />

      {/* Top Users Strip */}
      {topUsers.length > 0 && (
        <div className="mx-auto max-w-2xl px-4 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              <Trophy size={10} className="text-amber-400" /> Top hoy
            </span>
            <button onClick={() => navigate("/home")} className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/50 hover:text-spot-lime transition-colors">ver ranking</button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {topUsers.map((u, i) => (
              <div key={u.username} className="flex shrink-0 flex-col items-center gap-1">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-lg ${i === 0 ? "border-amber-400 bg-amber-400/10" : "border-border bg-muted"}`}>🎤</div>
                <span className="font-mono text-[8px] text-muted-foreground max-w-[44px] truncate">@{u.username}</span>
                <span className={`font-bebas text-xs ${i === 0 ? "text-amber-400" : "text-muted-foreground"}`}>{u.count}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 h-px bg-border" />
        </div>
      )}

      <div className="mx-auto max-w-2xl space-y-3 px-4 py-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-pulse">
            <RefreshCw className="mb-4 h-8 w-8 animate-spin text-spot-lime" />
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Sincronizando canal...</p>
          </div>
        ) : drops.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-spot-lime/10 text-5xl">🎤</div>
            <h2 className="font-bebas text-3xl text-foreground uppercase tracking-wider">Silencio en el campus</h2>
            <p className="mt-2 font-mono text-xs text-muted-foreground uppercase tracking-widest opacity-60">Sé el primero en romper el hielo</p>
            <button onClick={() => setShowRecorder(true)} className="mt-8 flex items-center gap-2 rounded-xl bg-spot-lime px-6 py-3 font-bebas text-lg tracking-wider text-black shadow-[0_0_20px_rgba(200,255,0,0.3)] transition-all hover:brightness-110">
              <Mic size={20} /> GRABA EL PRIMER DROP
            </button>
          </div>
        ) : (
          drops.map((drop) => (
            <DropCard
              key={drop.id}
              id={drop.id}
              username={drop.username}
              avatarEmoji={drop.avatarEmoji}
              audioUrl={drop.audioUrl}
              createdAt={drop.createdAt}
              expiresAt={drop.expiresAt}
              durationSeconds={drop.durationSeconds}
              initialListenedCount={drop.listenedCount}
            />
          ))
        )}
      </div>

      {!showRecorder && (
        <button onClick={() => setShowRecorder(true)}
          className="fixed bottom-24 right-4 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-spot-lime text-black shadow-[0_0_25px_rgba(200,255,0,0.5)] transition-transform hover:scale-110 active:scale-95 md:bottom-6"
          aria-label="Grabar drop"
        >
          <Mic size={28} fill="currentColor" />
        </button>
      )}

      <AnimatePresence>
        {showRecorder && (
          <VoiceRecorder
            maxDuration={(isPremium || isAdmin) ? recordingLimits.premium : recordingLimits.freemium}
            onRecorded={handleRecorded}
            onCancel={() => setShowRecorder(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default FeedPage;
