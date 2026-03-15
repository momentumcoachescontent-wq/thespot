import { useState } from "react";
import { useCallback } from "react";
import SideNav from "./SideNav";
import BottomNav from "./BottomNav";
import SosButton from "./SosButton";
import SosModal from "./SosModal";
import SpotCheckInButton from "./SpotCheckInButton";
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

      // 1. Obtener GPS
      let userLat = 0, userLng = 0;
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
        });
        userLat = position.coords.latitude;
        userLng = position.coords.longitude;
      } catch { /* no GPS — continuar sin coordenadas */ }

      // 2. Obtener perfil + contactos de confianza en paralelo
      const [profileResult, contactsResult] = await Promise.all([
        (supabase as any).from("profiles").select("username, phone").eq("id", user.id).single(),
        (supabase as any).from("sos_contacts").select("name, phone, relationship").eq("user_id", user.id),
      ]);

      const profile = profileResult.data;
      const contacts: { name: string; phone: string; relationship: string }[] = contactsResult.data || [];

      // 3. Registrar incidente en Supabase
      const { data: incident, error: incError } = await (supabase as any)
        .from("sos_incidents")
        .insert({ user_id: user.id, location_lat: userLat, location_lng: userLng, status: "active" })
        .select()
        .single();

      if (incError) throw incError;

      // 4. Disparar webhook n8n con payload completo (contactos incluidos)
      const n8nUrl = import.meta.env.VITE_N8N_SOS_WEBHOOK
        || "https://n8n-n8n.z3tydl.easypanel.host/webhook/thespot-sos-alert";
      if (n8nUrl) {
        const mapsUrl = userLat && userLng
          ? `https://maps.google.com/?q=${userLat},${userLng}`
          : null;

        fetch(n8nUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            incident_id: incident.id,
            user_id: user.id,
            user_email: user.email,
            user_name: profile?.username || user.email,
            user_phone: profile?.phone || null,
            location: { lat: userLat, lng: userLng },
            maps_url: mapsUrl,
            contacts,
            timestamp: new Date().toISOString(),
          }),
        }).catch(() => {});
      }

      const contactCount = contacts.length;
      toast({
        title: "🚨 ALERTA SOS ACTIVADA",
        description: contactCount > 0
          ? `Notificando a ${contactCount} contacto${contactCount > 1 ? "s" : ""} de confianza. No estás solo.`
          : "Alerta registrada. Agrega contactos de confianza en tu perfil para notificaciones WhatsApp.",
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

      {/* Bottom nav — only on mobile */}
      <div className="md:hidden">
        <BottomNav />
        {/* Floating buttons (mobile only) */}
        <SpotCheckInButton />
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
