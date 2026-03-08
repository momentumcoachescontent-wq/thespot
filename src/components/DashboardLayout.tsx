import { useState } from "react";
import { useCallback } from "react";
import SideNav from "./SideNav";
import BottomNav from "./BottomNav";
import SosButton from "./SosButton";
import SosModal from "./SosModal";
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

      let userLat = 0, userLng = 0;
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        userLat = position.coords.latitude;
        userLng = position.coords.longitude;
      } catch { /* no GPS */ }

      const { data: incident, error: incError } = await (supabase as any)
        .from("sos_incidents")
        .insert({ user_id: user.id, location_lat: userLat, location_lng: userLng, status: "active" })
        .select()
        .single();

      if (incError) throw incError;

      const n8nUrl = import.meta.env.VITE_N8N_SOS_WEBHOOK;
      if (n8nUrl) {
        fetch(n8nUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ incident_id: incident.id, user_id: user.id, user_email: user.email, location: { lat: userLat, lng: userLng }, timestamp: new Date().toISOString() }),
        }).catch(() => {});
      }

      toast({ title: "ALERTA SOS ACTIVADA", description: "Tus contactos de confianza están siendo notificados. No estás solo.", variant: "destructive" });
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

      {/* Bottom nav — only on mobile */}
      <div className="md:hidden">
        <BottomNav />
        {/* SOS floating button only on mobile (desktop uses sidebar button) */}
        <SosButton onClick={() => setIsSosOpen(true)} />
      </div>

      {/* SOS Modal — shared across all pages */}
      <SosModal
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
        onTriggerAction={handleSosTrigger}
      />
    </div>
  );
};

export default DashboardLayout;
