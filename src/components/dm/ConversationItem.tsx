import { Mic } from "lucide-react";
import { Conversation } from "@/hooks/useConversations";

interface Props {
  conversation: Conversation;
  onClick: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

const ConversationItem = ({ conversation, onClick }: Props) => {
  const { other_avatar, other_username, last_message_text, last_message_type, last_message_at, unread_count } = conversation;

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition-colors hover:bg-white/10 active:scale-[0.99]"
    >
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-muted text-xl">
        {other_avatar}
        {unread_count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-spot-lime text-[8px] font-bold text-black">
            {unread_count > 9 ? "9+" : unread_count}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className={`font-mono text-[11px] truncate ${unread_count > 0 ? "text-foreground font-bold" : "text-foreground"}`}>
            @{other_username}
          </p>
          <span className="font-mono text-[9px] text-muted-foreground shrink-0">{timeAgo(last_message_at)}</span>
        </div>
        <p className={`font-mono text-[10px] truncate mt-0.5 ${unread_count > 0 ? "text-spot-lime" : "text-muted-foreground"}`}>
          {last_message_type === "audio" ? (
            <span className="flex items-center gap-1"><Mic size={9} /> Mensaje de voz</span>
          ) : (
            last_message_text || "Nueva conversación"
          )}
        </p>
      </div>
    </button>
  );
};

export default ConversationItem;
