import { useState } from "react";
import { useCallback } from "react";
import SideNav from "./SideNav";
import BottomNav from "./BottomNav";
import SosButton from "./SosButton";
import SosModal from "./SosModal";
import SpotCheckInButton from "./SpotCheckInButton";
import PodcastMiniPlayer from "./PodcastMiniPlayer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [isSosOpen, setIsSosOpen] = useState(false);
  const { toast } = useToast();

  const handleSosTrigger = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Debes estar autenticado");

      // 1. GPS (best-effort, 8s timeout)
      let userLat = 0, userLng = 0;
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
        });
        userLat = position.coords.latitude;
        userLng = position.coords.longitude;
      } catch { /* no GPS — continuar sin coordenadas */ }

      const mapsUrl = userLat && userLng
        ? `https://maps.google.com/?q=${userLat},${userLng}`
        : null;

      // 2. Perfil + registro del incidente en paralelo (fire-and-forget en DB)
      const [profileResult] = await Promise.all([
        (supabase as any).from("profiles").select("username").eq("id", user.id).single(),
        (supabase as any).from("sos_incidents").insert({
          user_id: user.id,
          location_lat: userLat,
          location_lng: userLng,
          status: "active",
        }),
      ]);

      const username = profileResult.data?.username || "usuario";

      // 3. Abrir WhatsApp con mensaje de emergencia (igual que "Voy al Spot")
      const lines = [
        `🆘 ALERTA SOS — @${username}`,
        `Necesito ayuda ahora mismo.`,
        mapsUrl ? `📍 Mi ubicación: ${mapsUrl}` : `📍 Ubicación GPS no disponible`,
        `⚠️ Por favor responde si puedes asistir.`,
      ];

      window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");

      toast({
        title: "🚨 WhatsApp abierto",
        description: "Selecciona a quién enviarle la alerta desde WhatsApp.",
        variant: "destructive",
      });
    } catch (error: any) {
      toast({ title: "Error en SOS", description: error.message, variant: "destructive" });
    }
  }, [toast]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar — hidden on mobile, icons-only on md, full on lg */}
      <SideNav onSosClick={() => setIsSosOpen(true)} />

      {/* Main content — shifts right on md/lg to make room for sidebar */}
      <main className="flex-1 md:ml-16 lg:ml-64 min-h-screen">
        {children}
      </main>

      {/* Mini-player — persiste en todas las páginas */}
      <PodcastMiniPlayer />

      {/* Bottom nav — only on mobile */}
      <div className="md:hidden">
        <BottomNav />
        <SpotCheckInButton />
        <SosButton onClick={() => setIsSosOpen(true)} />
      </div>

      {/* SOS Modal */}
      <SosModal
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
        onTriggerAction={handleSosTrigger}
      />
    </div>
  );
};

export default DashboardLayout;
