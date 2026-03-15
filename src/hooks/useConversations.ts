import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Conversation {
  id: string;
  other_user_id: string;
  other_username: string;
  other_avatar: string;
  last_message_text: string | null;
  last_message_type: "text" | "audio" | null;
  last_message_at: string;
  unread_count: number;
}

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    if (!user) return;
    const { data, error } = await (supabase as any)
      .from("conversations")
      .select(`
        id,
        participant_a,
        participant_b,
        last_message_at,
        profile_a:profiles!conversations_participant_a_fkey(id, username, avatar_emoji),
        profile_b:profiles!conversations_participant_b_fkey(id, username, avatar_emoji)
      `)
      .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
      .order("last_message_at", { ascending: false });

    if (error) { console.error("useConversations:", error); return; }

    const enriched: Conversation[] = await Promise.all(
      (data || []).map(async (c: any) => {
        const isA = c.participant_a === user.id;
        const other = isA ? c.profile_b : c.profile_a;

        // Last message
        const { data: msgs } = await (supabase as any)
          .from("messages")
          .select("content, message_type, read_at, sender_id")
          .eq("conversation_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1);

        const last = msgs?.[0] ?? null;

        // Unread count (messages not from me that are unread)
        const { count } = await (supabase as any)
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", c.id)
          .neq("sender_id", user.id)
          .is("read_at", null);

        return {
          id: c.id,
          other_user_id: other?.id ?? "",
          other_username: other?.username ?? "Usuario",
          other_avatar: other?.avatar_emoji ?? "🎤",
          last_message_text: last?.content ?? null,
          last_message_type: last?.message_type ?? null,
          last_message_at: c.last_message_at,
          unread_count: count ?? 0,
        };
      })
    );

    setConversations(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchConversations();

    const channel = (supabase as any)
      .channel("conversations-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, fetchConversations)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, fetchConversations)
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [user]);

  return { conversations, loading, refetch: fetchConversations };
}
