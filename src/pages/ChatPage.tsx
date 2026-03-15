import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Mic, Send, RefreshCw } from "lucide-react";
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
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showVoice, setShowVoice] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const maxVoiceDuration = (isPremium || isAdmin) ? 60 : 30;

  // Load other participant's profile
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

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendText = async () => {
    const content = text.trim();
    if (!content || !user || !conversationId) return;
    setSending(true);
    setText("");
    try {
      const { error } = await (supabase as any).from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        message_type: "text",
        content,
      });
      if (error) throw error;

      // Push notification to other user
      if (otherUser) {
        supabase.functions.invoke("send-push", {
          body: {
            user_id: otherUser.id,
            title: `💬 @${profile?.username}`,
            body: content.slice(0, 80),
            url: `/messages/${conversationId}`,
            tag: `dm-${conversationId}`,
          },
        }).catch(() => {});
      }
    } catch (err) {
      console.error("Send text error:", err);
    } finally {
      setSending(false);
    }
  };

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
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="font-mono text-xs text-muted-foreground">Di algo 👋</p>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} isMine={msg.sender_id === user?.id} />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
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
            <div className="flex items-end gap-2">
              <button
                onClick={() => setShowVoice(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-spot-lime hover:border-spot-lime/40 transition-colors"
              >
                <Mic size={18} />
              </button>
              <textarea
                rows={1}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
                placeholder="Escribe un mensaje..."
                className="flex-1 resize-none rounded-xl border border-border bg-black/40 px-3 py-2 font-mono text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-spot-lime"
              />
              <button
                onClick={handleSendText}
                disabled={!text.trim() || sending}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-spot-lime text-black shadow-[0_0_15px_rgba(200,255,0,0.2)] disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:brightness-110"
              >
                <Send size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
