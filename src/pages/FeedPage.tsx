import { useEffect, useState, useCallback } from "react";
import { Mic, RefreshCw, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import DropCard from "@/components/DropCard";
import VoiceRecorder from "@/components/VoiceRecorder";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SosButton from "@/components/SosButton";
import SosModal from "@/components/SosModal";

const FeedPage = () => {
  const [showRecorder, setShowRecorder] = useState(false);
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [drops, setDrops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSpot, setCurrentSpot] = useState<any>(null);
  const [topUsers, setTopUsers] = useState<{ username: string; count: number }[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSosTrigger = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Debes estar autenticado");

      // 1. Obtener ubicación actual
      let userLat = 0;
      let userLng = 0;
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        userLat = position.coords.latitude;
        userLng = position.coords.longitude;
      } catch (e) {
        console.warn("Location not available for SOS", e);
      }

      // 2. Registrar incidente en Supabase
      const { data: incident, error: incError } = await (supabase as any).from('sos_incidents').insert({
        user_id: user.id,
        location_lat: userLat,
        location_lng: userLng,
        status: 'active'
      }).select().single();

      if (incError) throw incError;

      // 3. Notificar a n8n (solo si hay un webhook configurado)
      const n8nUrl = import.meta.env.VITE_N8N_SOS_WEBHOOK;
      if (n8nUrl) {
        fetch(n8nUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            incident_id: incident.id,
            user_id: user.id,
            user_email: user.email,
            location: { lat: userLat, lng: userLng },
            timestamp: new Date().toISOString()
          })
        }).catch(e => console.warn("n8n SOS webhook error:", e));
      }

      toast({
        title: "ALERTA SOS ACTIVADA",
        description: "Tus contactos de confianza están recibiendo tu ubicación. No estás solo.",
        variant: "destructive"
      });

    } catch (error: any) {
      console.error("SOS Error:", error);
      toast({ title: "Error en SOS", description: error.message, variant: "destructive" });
    }
  }, [toast]);

  const fetchDrops = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // 1. Obtener perfil para dominio
      const { data: profile } = await (supabase as any).from('profiles').select('university_domain').eq('id', user.id).single();
      const domain = profile?.university_domain || 'demo.edu';

      // 2. Obtener drops activos
      const { data: realDrops, error } = await (supabase as any)
        .from('drops')
        .select(`
          id,
          audio_url,
          created_at,
          expires_at,
          duration_seconds,
          profiles:author_id (username, avatar_url)
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedDrops = (realDrops || []).map((d: any) => ({
        id: d.id,
        username: d.profiles?.username || "Anónimo",
        avatarEmoji: "🎙️",
        audioUrl: d.audio_url,
        createdAt: new Date(d.created_at),
        expiresAt: new Date(d.expires_at),
      }));

      setDrops(formattedDrops);
      setCurrentSpot({ name: `Campus ${domain.toUpperCase()}` });

      // Top users from today's drops
      const userMap: Record<string, number> = {};
      (realDrops || []).forEach((d: any) => {
        const u = d.profiles?.username || "anónimo";
        userMap[u] = (userMap[u] || 0) + 1;
      });
      const sorted = Object.entries(userMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([username, count]) => ({ username, count }));
      setTopUsers(sorted);
    } catch (error: any) {
      console.error("Error fetching drops:", error);
      toast({ title: "Error al sincronizar", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrops();

    // Supabase Realtime: auto-refresh cuando llega un drop nuevo
    const channel = (supabase as any)
      .channel('drops-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'drops' }, () => {
        fetchDrops();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const handleRecorded = async (blob: Blob) => {
    try {
      setShowRecorder(false);
      toast({ title: "Subiendo drop...", description: "Transformando miedo en acción." });

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({ title: "Entorno Restringido", description: "Solo perfiles universitarios pueden grabar. Simulando subida local.", variant: "destructive" });
        return;
      }

      let userLat = 0;
      let userLng = 0;

      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        userLat = position.coords.latitude;
        userLng = position.coords.longitude;
      } catch (geoError) {
        console.warn("No geolocation granted/available. Using default(0,0)", geoError);
        toast({ title: "Sin ubicación GPS", description: "Tu dispositivo no reporta coordenadas. Te asignaremos al Campus general.", variant: "destructive" });
      }

      const fileName = `${user.id}-${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('drops')
        .upload(fileName, blob, { contentType: 'audio/webm' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('drops')
        .getPublicUrl(fileName);

      const { data: profile } = await (supabase as any).from('profiles').select('university_domain').eq('id', user.id).single();
      const domain = profile?.university_domain || 'demo.edu';

      let { data: spots } = await (supabase as any).from('spots').select('id').eq('university_domain', domain).limit(1);
      let spotId = spots?.[0]?.id;

      if (!spotId) {
        const { data: newSpot, error: spotError } = await (supabase as any).from('spots').insert({
          name: `Campus ${domain.toUpperCase()}`,
          university_domain: domain,
          location: `POINT(${userLng} ${userLat})`,
          creator_id: user.id
        }).select('id').single();
        if (spotError) throw spotError;
        spotId = newSpot.id;
      }

      const expiresAt = new Date(Date.now() + 15 * 60000).toISOString();
      const { error: dbError } = await (supabase as any).from('drops').insert({
        spot_id: spotId,
        author_id: user.id,
        audio_url: publicUrl,
        duration_seconds: Math.floor(blob.size / 15000) || 10,
        expires_at: expiresAt
      });

      if (dbError) throw dbError;

      toast({ title: "Drop activo 🎙️", description: "Tu voz es ahora parte del presente. Desaparecerá en 15 minutos." });
      fetchDrops();

    } catch (error: any) {
      console.error(error);
      toast({ title: "Error en la transmisión", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar spotName={currentSpot?.name || "Cargando..."} onlineCount={drops.length} />

      {/* Top Users Strip */}
      {topUsers.length > 0 && (
        <div className="mx-auto max-w-md px-4 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              <Trophy size={10} className="text-amber-400" /> Top hoy
            </span>
            <button onClick={() => navigate("/admin")} className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/50 hover:text-spot-lime transition-colors">ver más</button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {topUsers.map((u, i) => (
              <div key={u.username} className="flex shrink-0 flex-col items-center gap-1">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-lg ${i === 0 ? "border-amber-400 bg-amber-400/10" : "border-border bg-muted"}`}>
                  🎤
                </div>
                <span className="font-mono text-[8px] text-muted-foreground max-w-[44px] truncate">@{u.username}</span>
                <span className={`font-bebas text-xs ${i === 0 ? "text-amber-400" : "text-muted-foreground"}`}>{u.count}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 h-px bg-border" />
        </div>
      )}

      <div className="mx-auto max-w-md space-y-3 px-4 py-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-pulse">
            <RefreshCw className="mb-4 h-8 w-8 animate-spin text-spot-lime" />
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Sincronizando canal...</p>
          </div>
        ) : drops.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-spot-lime/10 text-5xl">
              🎤
            </div>
            <h2 className="font-bebas text-3xl text-foreground uppercase tracking-wider">Silencio en el campus</h2>
            <p className="mt-2 font-mono text-xs text-muted-foreground uppercase tracking-widest opacity-60">
              Sé el primero en romper el hielo
            </p>
            <button
              onClick={() => setShowRecorder(true)}
              className="mt-8 flex items-center gap-2 rounded-xl bg-spot-lime px-6 py-3 font-bebas text-lg tracking-wider text-black shadow-[0_0_20px_rgba(200,255,0,0.3)] transition-all hover:brightness-110"
            >
              <Mic size={20} />
              GRABA EL PRIMER DROP
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
            />
          ))
        )}
      </div>

      {!showRecorder && (
        <button
          onClick={() => setShowRecorder(true)}
          className="fixed bottom-24 right-4 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-spot-lime text-black shadow-[0_0_25px_rgba(200,255,0,0.5)] transition-transform hover:scale-110 active:scale-95"
          aria-label="Grabar drop"
        >
          <Mic size={28} fill="currentColor" />
        </button>
      )}

      <AnimatePresence>
        {showRecorder && (
          <VoiceRecorder
            maxDuration={60}
            onRecorded={handleRecorded}
            onCancel={() => setShowRecorder(false)}
          />
        )}
      </AnimatePresence>

      <BottomNav />

      {/* SOS UI */}
      <SosButton onClick={() => setIsSosOpen(true)} />

      <SosModal
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
        onTriggerAction={handleSosTrigger}
      />
    </div>
  );
};

export default FeedPage;
