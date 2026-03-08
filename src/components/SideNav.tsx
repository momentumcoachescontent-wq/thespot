import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Mic, MapPin, Headphones, CalendarDays, User, LayoutDashboard, Shield, AlertTriangle, LogOut, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/contexts/AuthContext";

const NAV_ITEMS = [
  { path: "/home", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/feed", icon: Mic, label: "Canal" },
  { path: "/map", icon: MapPin, label: "Mapa" },
  { path: "/podcast", icon: Headphones, label: "Podcast" },
  { path: "/events", icon: CalendarDays, label: "Eventos" },
  { path: "/profile", icon: User, label: "Perfil" },
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
            <span className="hidden lg:block font-mono text-[11px] uppercase tracking-widest">Admin</span>
          </button>
        )}
      </nav>

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
