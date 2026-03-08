import { Mic, MapPin, CalendarDays, Trophy, Headphones } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

// Modular Widgets
import Widget from "@/components/dashboard/Widget";
import DropsWidget from "@/components/dashboard/DropsWidget";
import MapWidget from "@/components/dashboard/MapWidget";
import TopUsersWidget from "@/components/dashboard/TopUsersWidget";
import EventsWidget from "@/components/dashboard/EventsWidget";
import PodcastWidget from "@/components/dashboard/PodcastWidget";

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
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
