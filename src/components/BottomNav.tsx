import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Headphones, User, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { useConversations } from "@/hooks/useConversations";

const tabs = [
  { path: "/home",     icon: LayoutDashboard, label: "Inicio" },
  { path: "/podcast",  icon: Headphones,      label: "Podcast" },
  { path: "/messages", icon: MessageSquare,   label: "Mensajes" },
  { path: "/profile",  icon: User,            label: "Perfil" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { conversations } = useConversations();

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-xl safe-bottom">
      <div className="mx-auto flex max-w-md items-center justify-around px-1 pt-2 pb-1">
        {tabs.map((tab) => {
          const isActive = location.pathname.startsWith(tab.path);
          const showBadge = tab.path === "/messages" && totalUnread > 0 && !isActive;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="relative flex min-h-[48px] min-w-[44px] flex-col items-center justify-center gap-0.5 px-1 py-1 transition-colors"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-[1px] h-0.5 w-6 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <div className="relative">
                <tab.icon
                  size={20}
                  className={isActive ? "text-primary" : "text-muted-foreground"}
                />
                {showBadge && (
                  <span className="absolute -right-2 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-spot-lime text-[7px] font-bold text-black">
                    {totalUnread > 9 ? "9+" : totalUnread}
                  </span>
                )}
              </div>
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
