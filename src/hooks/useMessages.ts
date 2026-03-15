import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_type: "text" | "audio";
  content: string | null;
  audio_url: string | null;
  duration_seconds: number | null;
  read_at: string | null;
  created_at: string;
}

export function useMessages(conversationId: string | undefined) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const markRead = async () => {
    if (!conversationId || !user) return;
    await (supabase as any)
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .is("read_at", null);
  };

  const fetchMessages = async () => {
    if (!conversationId) return;
    const { data, error } = await (supabase as any)
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) { console.error("useMessages:", error); return; }
    setMessages(data || []);
    setLoading(false);
    await markRead();
  };

  useEffect(() => {
    if (!conversationId) return;
    fetchMessages();

    const channel = (supabase as any)
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload: any) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          markRead();
        }
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [conversationId, user]);

  return { messages, loading };
}
