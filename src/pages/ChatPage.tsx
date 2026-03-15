import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Mic, RefreshCw, Crown, Clock } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMessages } from "@/hooks/useMessages";
import MessageBubble from "@/components/dm/MessageBubble";
import DmVoiceRecorder from "@/components/dm/DmVoiceRecorder";

const ChatPage = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user, profile, isPremium, isAdmin } = useAuth();
  const { messages, loading } = useMessages(conversationId);

  const [otherUser, setOtherUser] = useState<{ id: string; username: string; avatar_emoji: string } | null>(null);
  const [showVoice, setShowVoice] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const maxVoiceDuration = (isPremium || isAdmin) ? 60 : 30;

  useEffect(() => {
    if (!conversationId || !user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("conversations")
        .select(`
          participant_a, participant_b,
          profile_a:profiles!conversations_participant_a_fkey(id, username, avatar_emoji),
          profile_b:profiles!conversations_participant_b_fkey(id, username, avatar_emoji)
        `)
        .eq("id", conversationId)
        .single();
      if (!data) return;
      const other = data.participant_a === user.id ? data.profile_b : data.profile_a;
      setOtherUser(other);
    })();
  }, [conversationId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleVoiceSent = () => {
    setShowVoice(false);
    if (otherUser) {
      supabase.functions.invoke("send-push", {
        body: {
          user_id: otherUser.id,
          title: `🎙️ @${profile?.username}`,
          body: "Mensaje de voz",
          url: `/messages/${conversationId}`,
          tag: `dm-${conversationId}`,
        },
      }).catch(() => {});
    }
  };

  // Premium gate
  if (!isPremium && !isAdmin) {
    return (
      <div className="flex h-screen flex-col bg-background">
        <div className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
            <button onClick={() => navigate("/messages")} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft size={20} />
            </button>
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-spot-lime/10">
            <Crown size={36} className="text-spot-lime" />
          </div>
          <div>
            <h2 className="font-bebas text-3xl text-foreground tracking-wider">FUNCIÓN SPOT+</h2>
            <p className="mt-2 font-mono text-xs text-muted-foreground max-w-xs">
              Los mensajes de voz privados son exclusivos de Spot+. Únete para hablar con cualquier persona de tu campus.
            </p>
          </div>
          <button
            onClick={() => navigate("/premium")}
            className="rounded-xl bg-spot-lime px-6 py-3 font-bebas text-lg text-black shadow-[0_0_20px_rgba(200,255,0,0.3)] transition-all hover:brightness-110"
          >
            VER PLANES SPOT+
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <button onClick={() => navigate("/messages")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft size={20} />
          </button>
          {otherUser && (
            <>
              <span className="text-xl">{otherUser.avatar_emoji}</span>
              <p className="font-mono text-[11px] text-foreground">@{otherUser.username}</p>
            </>
          )}
          <div className="ml-auto flex items-center gap-1.5 rounded-full bg-amber-400/10 border border-amber-400/20 px-2.5 py-1">
            <Clock size={10} className="text-amber-400" />
            <span className="font-mono text-[8px] text-amber-400 uppercase tracking-widest">Efímero</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-2xl space-y-2">
          {loading ? (
            <div className="flex justify-center py-20">
              <RefreshCw className="h-6 w-6 animate-spin text-spot-lime" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <span className="text-4xl">🎙️</span>
              <p className="font-mono text-xs text-muted-foreground">Graba un mensaje de voz para empezar</p>
              <p className="font-mono text-[9px] text-muted-foreground/40 max-w-[200px] leading-relaxed">
                Los audios se eliminan automáticamente a las 00:00 de cada día
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} isMine={msg.sender_id === user?.id} />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area - audio only */}
      <div className="border-t border-border bg-background/95 backdrop-blur-xl pb-safe">
        <div className="mx-auto max-w-2xl px-4 py-3 space-y-2">
          <AnimatePresence>
            {showVoice && conversationId && (
              <DmVoiceRecorder
                conversationId={conversationId}
                maxDuration={maxVoiceDuration}
                onSent={handleVoiceSent}
                onCancel={() => setShowVoice(false)}
              />
            )}
          </AnimatePresence>

          {!showVoice && (
            <div className="flex items-center gap-3">
              <p className="flex-1 font-mono text-[9px] text-muted-foreground/40 leading-relaxed">
                Solo mensajes de voz · se borran a las 00:00
              </p>
              <button
                onClick={() => setShowVoice(true)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-spot-lime text-black shadow-[0_0_15px_rgba(200,255,0,0.3)] transition-all hover:brightness-110 active:scale-95"
              >
                <Mic size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
