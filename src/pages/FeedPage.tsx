import { useState } from "react";
import { Mic } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import DropCard from "@/components/DropCard";
import VoiceRecorder from "@/components/VoiceRecorder";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Demo drops
const demoDrops = [
  {
    id: "1",
    username: "luna_mx",
    avatarEmoji: "🌙",
    audioUrl: "",
    createdAt: new Date(Date.now() - 3 * 60000),
    expiresAt: new Date(Date.now() + 12 * 60000),
  },
  {
    id: "2",
    username: "carlos.fire",
    avatarEmoji: "🔥",
    audioUrl: "",
    createdAt: new Date(Date.now() - 7 * 60000),
    expiresAt: new Date(Date.now() + 8 * 60000),
  },
  {
    id: "3",
    username: "vale_speaks",
    avatarEmoji: "💜",
    audioUrl: "",
    createdAt: new Date(Date.now() - 10 * 60000),
    expiresAt: new Date(Date.now() + 5 * 60000),
  },
];

const FeedPage = () => {
  const [showRecorder, setShowRecorder] = useState(false);
  const [drops, setDrops] = useState<any[]>(demoDrops);
  const { toast } = useToast();

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
          location: 'POINT(0 0)',
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

    } catch (error: any) {
      console.error(error);
      toast({ title: "Error en la transmisión", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar spotName="Campus UNAM 🎓" onlineCount={12} />

      <div className="mx-auto max-w-md space-y-3 px-4 py-4">
        {drops.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 text-5xl">🎤</div>
            <h2 className="text-lg font-bold text-foreground">No drops yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Be the first to share your voice
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
