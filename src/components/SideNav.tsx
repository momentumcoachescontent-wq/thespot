import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Mic, MapPin, Headphones, CalendarDays, User, LayoutDashboard, Shield, AlertTriangle, LogOut, Crown, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/contexts/AuthContext";

const NAV_ITEMS = [
  { path: "/home",     icon: LayoutDashboard, label: "Dashboard" },
  { path: "/feed",     icon: Mic,             label: "Canal" },
  { path: "/map",      icon: MapPin,           label: "Mapa" },
  { path: "/podcast",  icon: Headphones,       label: "Podcast" },
  { path: "/messages", icon: MessageSquare,    label: "Mensajes" },
  { path: "/events",   icon: CalendarDays,     label: "Eventos" },
  { path: "/profile",  icon: User,             label: "Perfil" },
];

interface SideNavProps {
  onSosClick: () => void;
}

const SideNav = ({ onSosClick }: SideNavProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, user, isAdmin, signOut } = useAuth();

  const userEmail = user?.email || "";
  const username = profile?.username || "";
  const displayName = username || userEmail.split("@")[0] || "Usuario";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full z-50 border-r border-border bg-card/95 backdrop-blur-xl md:w-16 lg:w-64 transition-all duration-300">
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 py-5 lg:px-5 border-b border-border">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-spot-lime shadow-[0_0_15px_rgba(200,255,0,0.3)]">
          <Mic size={18} className="text-black" />
        </div>
        <div className="hidden lg:block overflow-hidden">
          <p className="font-bebas text-xl leading-none tracking-widest text-spot-lime drop-shadow-[0_0_8px_rgba(200,255,0,0.4)]">THE SPOT</p>
          <p className="font-mono text-[8px] uppercase tracking-[3px] text-muted-foreground/70">Tu campus, tu voz</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-2 py-4 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`group relative flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 transition-all ${isActive
                ? "bg-spot-lime/10 text-spot-lime"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidenav-indicator"
                  className="absolute left-0 h-6 w-0.5 rounded-full bg-spot-lime"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <item.icon size={19} className="shrink-0" />
              <span className="hidden lg:block font-mono text-[11px] uppercase tracking-widest truncate">
                {item.label}
              </span>
              {/* Tooltip for icon-only mode */}
              <span className="lg:hidden absolute left-14 z-50 hidden group-hover:block whitespace-nowrap rounded-lg bg-card border border-border px-2 py-1 font-mono text-[10px] text-foreground shadow-lg">
                {item.label}
              </span>
            </button>
          );
        })}

        {isAdmin && (
          <button
            onClick={() => navigate("/admin")}
            className={`group relative flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 transition-all ${location.pathname === "/admin"
              ? "bg-amber-400/10 text-amber-400"
              : "text-muted-foreground hover:bg-white/5 hover:text-amber-400/70"
              }`}
          >
            <Crown size={19} className="shrink-0" />
            <span className="hidden lg:block font-mono text-[11px] uppercase tracking-widest">Portal Arquitecto</span>
          </button>
        )}
      </nav>

      {/* WhatsApp Check-in Button */}
      <div className="px-2 pb-1">
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent("¡Me dirijo al Spot! 🎙️ Espero verte ahí 🔥")}`, "_blank")}
          className="flex w-full items-center gap-3 rounded-xl bg-spot-lime/15 border border-spot-lime/30 px-2.5 py-2.5 text-spot-lime transition-all hover:bg-spot-lime/25"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-spot-lime" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.858L.057 23.547a.5.5 0 0 0 .609.61l5.77-1.51A11.944 11.944 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.882a9.881 9.881 0 0 1-5.031-1.373l-.361-.214-3.733.979.999-3.645-.235-.374A9.86 9.86 0 0 1 2.118 12C2.118 6.608 6.608 2.118 12 2.118c5.392 0 9.882 4.49 9.882 9.882 0 5.392-4.49 9.882-9.882 9.882z"/>
          </svg>
          <span className="hidden lg:block font-bebas text-base tracking-widest">VOY AL SPOT</span>
        </motion.button>
      </div>

      {/* SOS Button */}
      <div className="px-2 py-2">
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={onSosClick}
          className="flex w-full items-center gap-3 rounded-xl bg-spot-red/10 border border-spot-red/20 px-2.5 py-2.5 text-spot-red transition-all hover:bg-spot-red/20"
        >
          <AlertTriangle size={19} className="shrink-0 animate-pulse" />
          <span className="hidden lg:block font-bebas text-base tracking-widest">BOTÓN DE PÁNICO</span>
        </motion.button>
      </div>

      {/* User Info */}
      <div className="border-t border-border px-2 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-spot-lime/20 text-base">
            🎤
          </div>
          <div className="hidden lg:block flex-1 min-w-0">
            <p className="font-bebas text-sm leading-none text-foreground truncate">@{displayName}</p>
            <p className="font-mono text-[9px] text-muted-foreground/60 truncate mt-0.5">{userEmail}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="hidden lg:flex shrink-0 text-muted-foreground/50 hover:text-spot-red transition-colors"
            title="Cerrar sesión"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default SideNav;
