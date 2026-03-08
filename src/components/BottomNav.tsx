import { useLocation, useNavigate } from "react-router-dom";
import { Mic, MapPin, Headphones, CalendarDays, User } from "lucide-react";
import { motion } from "framer-motion";

const tabs = [
  { path: "/feed",    icon: Mic,          label: "Canal" },
  { path: "/map",     icon: MapPin,        label: "Mapa" },
  { path: "/podcast", icon: Headphones,    label: "Podcast" },
  { path: "/events",  icon: CalendarDays,  label: "Eventos" },
  { path: "/profile", icon: User,          label: "Perfil" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-xl safe-bottom">
      <div className="mx-auto flex max-w-md items-center justify-around px-1 pt-2 pb-1">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="relative flex min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-0.5 px-2 py-1 transition-colors"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-[1px] h-0.5 w-6 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <tab.icon
                size={20}
                className={isActive ? "text-primary" : "text-muted-foreground"}
              />
              <span className={`text-[9px] font-semibold tracking-wide ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
