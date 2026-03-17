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
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // ── 1. Fetch conversations (no embedded join — avoids FK constraint names) ──
      const { data: convData, error } = await (supabase as any)
        .from("conversations")
        .select("id, participant_a, participant_b, last_message_at")
        .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
        .order("last_message_at", { ascending: false });

      if (error) {
        console.error("useConversations:", error);
        setConversations([]);
        return;
      }

      const rows = convData || [];

      // ── 2. Batch-fetch all other-user profiles in one query ──
      const otherIds: string[] = [
        ...new Set<string>(
          rows.map((c: any) =>
            c.participant_a === user.id ? c.participant_b : c.participant_a
          )
        ),
      ];

      let profileMap: Record<string, { id: string; username: string; avatar_emoji: string }> = {};
      if (otherIds.length > 0) {
        const { data: profiles } = await (supabase as any)
          .from("profiles")
          .select("id, username, avatar_emoji")
          .in("id", otherIds);
        (profiles || []).forEach((p: any) => {
          profileMap[p.id] = p;
        });
      }

      // ── 3. Last message + unread count per conversation (parallel) ──
      const enriched: Conversation[] = await Promise.all(
        rows.map(async (c: any) => {
          const otherId =
            c.participant_a === user.id ? c.participant_b : c.participant_a;
          const other = profileMap[otherId];

          const [msgRes, countRes] = await Promise.all([
            (supabase as any)
              .from("messages")
              .select("content, message_type, sender_id")
              .eq("conversation_id", c.id)
              .order("created_at", { ascending: false })
              .limit(1),
            (supabase as any)
              .from("messages")
              .select("id", { count: "exact", head: true })
              .eq("conversation_id", c.id)
              .neq("sender_id", user.id)
              .is("read_at", null),
          ]);

          const last = msgRes.data?.[0] ?? null;

          return {
            id: c.id,
            other_user_id: otherId,
            other_username: other?.username ?? "Usuario",
            other_avatar: other?.avatar_emoji ?? "🎤",
            last_message_text: last?.content ?? null,
            last_message_type: last?.message_type ?? null,
            last_message_at: c.last_message_at,
            unread_count: countRes.count ?? 0,
          };
        })
      );

      setConversations(enriched);
    } catch (e) {
      console.error("useConversations unexpected:", e);
      setConversations([]);
    } finally {
      setLoading(false);
    }
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
