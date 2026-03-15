import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Search, ArrowLeft, RefreshCw, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useConversations } from "@/hooks/useConversations";
import ConversationItem from "@/components/dm/ConversationItem";

const MessagesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { conversations, loading } = useConversations();

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const { data } = await (supabase as any)
      .from("profiles")
      .select("id, username, avatar_emoji")
      .ilike("username", `%${q.trim()}%`)
      .neq("id", user?.id)
      .limit(10);
    setSearchResults(data || []);
    setSearching(false);
  };

  const openConversation = async (otherUserId: string) => {
    const { data, error } = await (supabase as any).rpc("get_or_create_conversation", {
      other_user_id: otherUserId,
    });
    if (error) { console.error(error); return; }
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
    navigate(`/messages/${data}`);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="font-bebas text-2xl tracking-wider text-foreground">MENSAJES</h1>
          </div>
          <button
            onClick={() => setShowSearch(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-4 space-y-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-spot-lime" />
            <p className="mt-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">Cargando...</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-spot-lime/10 text-5xl">
              💬
            </div>
            <h2 className="font-bebas text-3xl text-foreground uppercase tracking-wider">Sin conversaciones</h2>
            <p className="mt-2 font-mono text-xs text-muted-foreground uppercase tracking-widest opacity-60">
              Inicia una conversación con alguien de tu campus
            </p>
            <button
              onClick={() => setShowSearch(true)}
              className="mt-8 flex items-center gap-2 rounded-xl bg-spot-lime px-6 py-3 font-bebas text-lg tracking-wider text-black shadow-[0_0_20px_rgba(200,255,0,0.3)] transition-all hover:brightness-110"
            >
              <Search size={18} /> BUSCAR USUARIO
            </button>
          </div>
        ) : (
          conversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              onClick={() => navigate(`/messages/${conv.id}`)}
            />
          ))
        )}
      </div>

      {/* New conversation dialog */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowSearch(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-5 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bebas text-xl tracking-widest text-white">NUEVA CONVERSACIÓN</h3>
                <button onClick={() => setShowSearch(false)} className="text-zinc-500 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Buscar por @usuario..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full rounded-lg border border-border bg-black/40 py-2 pl-8 pr-3 font-mono text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-spot-lime"
                />
              </div>

              <div className="space-y-1 max-h-64 overflow-y-auto">
                {searching && (
                  <p className="py-4 text-center font-mono text-[10px] text-muted-foreground">Buscando...</p>
                )}
                {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                  <p className="py-4 text-center font-mono text-[10px] text-muted-foreground">Sin resultados</p>
                )}
                {searchResults.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => openConversation(u.id)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/10 transition-colors"
                  >
                    <span className="text-xl">{u.avatar_emoji}</span>
                    <span className="font-mono text-[11px] text-foreground">@{u.username}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MessagesPage;
