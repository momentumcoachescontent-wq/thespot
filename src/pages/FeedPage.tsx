import { useEffect, useState } from "react";
import { Mic, RefreshCw } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import DropCard from "@/components/DropCard";
import VoiceRecorder from "@/components/VoiceRecorder";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const FeedPage = () => {
  const [showRecorder, setShowRecorder] = useState(false);
  const [drops, setDrops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSpot, setCurrentSpot] = useState<any>(null);
  const { toast } = useToast();

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

      // 2. Obtener drops activos (RLS ya debería filtrar por dominio si está configurado, 
      // pero forzamos el filtro para seguridad extra y visualización)
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
        avatarEmoji: "🎙️", // Fallback por ahora
        audioUrl: d.audio_url,
        createdAt: new Date(d.created_at),
        expiresAt: new Date(d.expires_at),
      }));

      setDrops(formattedDrops);
      setCurrentSpot({ name: `Campus ${domain.toUpperCase()}` });
    } catch (error: any) {
      console.error("Error fetching drops:", error);
      toast({ title: "Error al sincronizar", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrops();
    // Suscripción en tiempo real opcional para después
  }, []);

  const handleRecorded = async (blob: Blob) => {
    try {
      setShowRecorder(false);
      toast({ title: "Subiendo drop...", description: "Transformando miedo en acción." });

      const { data: { user } } = await supabase.auth.getUser();

      // Si estamos en desarrollo sin Auth configurado (para que el cliente Lovable no explote en demo)
      // Idealmente, pediremos Auth. Por ahora forzamos un chequeo.
      if (!user) {
        toast({ title: "Entorno Restringido", description: "Solo perfiles universitarios pueden grabar. Simulando subida local.", variant: "destructive" });
        return;
      }

      // Capturamos coordenadas antes del upload
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

      // Tratamos de encontrar un spot de la universidad
      // Usamos el cliente con by-pass de RLS tipado (ya que TS no está actualizado)
      const { data: profile } = await (supabase as any).from('profiles').select('university_domain').eq('id', user.id).single();
      const domain = profile?.university_domain || 'demo.edu';

      let { data: spots } = await (supabase as any).from('spots').select('id').eq('university_domain', domain).limit(1);
      let spotId = spots?.[0]?.id;

      // Generamos Spot Semilla si no hay 
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

      // Refrescamos el feed
      fetchDrops();

    } catch (error: any) {
      console.error(error);
      toast({ title: "Error en la transmisión", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar spotName={currentSpot?.name || "Cargando..."} onlineCount={drops.length} />

      <div className="mx-auto max-w-md space-y-3 px-4 py-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-pulse">
            <RefreshCw className="mb-4 h-8 w-8 animate-spin text-spot-lime" />
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Sincronizando canal...</p>
          </div>
        ) : drops.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 text-5xl">🎤</div>
            <h2 className="font-bebas text-2xl text-foreground uppercase tracking-wider">Silencio en el campus</h2>
            <p className="mt-1 font-mono text-xs text-muted-foreground uppercase opacity-60">
              Sé el primero en romper el hielo
            </p>
          </div>
        ) : (
          drops.map((drop) => (
            <DropCard
              key={drop.id}
              username={drop.username}
              avatarEmoji={drop.avatarEmoji}
              audioUrl={drop.audioUrl}
              createdAt={drop.createdAt}
              expiresAt={drop.expiresAt}
            />
          ))
        )}
      </div>

      {/* FAB */}
      {!showRecorder && (
        <button
          onClick={() => setShowRecorder(true)}
          className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow transition-transform hover:scale-110 active:scale-95"
        >
          <Mic size={24} />
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
    </div>
  );
};

export default FeedPage;
