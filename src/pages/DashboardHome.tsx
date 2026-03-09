import { Mic, MapPin, CalendarDays, Trophy, Headphones } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

// Modular Widgets
import Widget from "@/components/dashboard/Widget";
import DropsWidget from "@/components/dashboard/DropsWidget";
import MapWidget from "@/components/dashboard/MapWidget";
import TopUsersWidget from "@/components/dashboard/TopUsersWidget";
import EventsWidget from "@/components/dashboard/EventsWidget";
import TopUniversitiesWidget from "@/components/dashboard/TopUniversitiesWidget";
import PodcastWidget from "@/components/dashboard/PodcastWidget";

import UniversitySelector from "@/components/UniversitySelector";

const DashboardHome = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-3 lg:px-6">
          <div>
            <h1 className="font-bebas text-2xl tracking-wider text-foreground">DASHBOARD</h1>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Vista unificada de tu campus</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground/50 mr-1">Filtro de Campus</span>
            <UniversitySelector />
          </div>
        </div>
      </div>

      {/* Grid responsivo - Usamos 12 columnas para permitir spans finos (2/3, 1/2, 1/4) */}
      <div className="p-4 lg:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">

          {/* Canal (drops) — 2/3 de 12 = 8 */}
          <Widget title="CANAL EN VIVO" icon={Mic} linkTo="/feed" span="lg:col-span-8">
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

          {/* Top Universidades — 1/3 de 12 = 4 */}
          <Widget title="TOP INSTITUCIONES" icon={Trophy} linkTo="/feed" span="lg:col-span-4">
            <TopUniversitiesWidget />
          </Widget>

          {/* Mapa — 1/2 de 12 = 6 */}
          <Widget title="MAPA DE SPOTS" icon={MapPin} linkTo="/map" span="lg:col-span-6">
            <MapWidget />
          </Widget>

          {/* Top Usuarios — 1/4 de 12 = 3 */}
          <Widget title="TOP USUARIOS" icon={Trophy} linkTo="/feed" span="lg:col-span-3">
            <TopUsersWidget />
          </Widget>

          {/* Eventos — 1/4 de 12 = 3 */}
          <Widget title="PRÓXIMOS EVENTOS" icon={CalendarDays} linkTo="/events" span="lg:col-span-3">
            <EventsWidget />
          </Widget>

          {/* Podcast — Full width */}
          <Widget title="PODCAST" icon={Headphones} linkTo="/podcast" span="lg:col-span-12">
            <PodcastWidget />
          </Widget>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
