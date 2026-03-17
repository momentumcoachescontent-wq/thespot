import { useState, useEffect } from "react";
import { Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFilter } from "@/contexts/FilterContext";

const TopUsersWidget = () => {
    const { resolvedDomain } = useFilter();
    const [users, setUsers] = useState<{ username: string; count: number; isMe?: boolean; rank?: number; is_premium?: boolean }[]>([]);
    const [filter, setFilter] = useState<"7d" | "30d" | "all">("all");

    useEffect(() => {
        const fetchUserAndData = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            const now = new Date();
            let startDate = null;
            if (filter === "7d") startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            if (filter === "30d") startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

            let query = (supabase as any)
                .from("drop_history")
                .select("author_id, profiles!inner(username, university_domain, is_premium)");

            if (startDate) query = query.gte("created_at", startDate);
            if (resolvedDomain) query = query.eq("profiles.university_domain", resolvedDomain);

            const { data, error } = await query;
            if (error) {
                console.error("Error fetching top users:", error);
                return;
            }

            const map: Record<string, { count: number; id: string; is_premium: boolean }> = {};
            (data || []).forEach((d: any) => {
                const username = d.profiles?.username || "anónimo";
                if (!map[username]) map[username] = { count: 0, id: d.author_id, is_premium: !!d.profiles?.is_premium };
                map[username].count++;
            });

            const sorted = Object.entries(map)
                .map(([username, info]) => ({ username, count: info.count, isMe: info.id === user?.id, id: info.id, is_premium: info.is_premium }))
                .sort((a, b) => b.count - a.count)
                .map((u, i) => ({ ...u, rank: i + 1 }));

            const top5 = sorted.slice(0, 5);
            const myEntry = sorted.find(u => u.isMe);
            const result = [...top5];

            if (myEntry && !top5.some(u => u.username === myEntry.username)) {
                result.push({ ...myEntry, rank: sorted.indexOf(myEntry) + 1 });
            }

            setUsers(result);
        };

        fetchUserAndData();
    }, [resolvedDomain, filter]);

    const getMedal = (rank: number) => {
        if (rank === 1) return "🥇";
        if (rank === 2) return "🥈";
        if (rank === 3) return "🥉";
        return rank.toString();
    };

    return (
        <div className="space-y-3">
            <div className="flex gap-2 justify-center pb-1">
                {(["7d", "30d", "all"] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`font-mono text-[9px] px-2 py-0.5 rounded-full border transition-all uppercase tracking-widest ${filter === f ? "bg-spot-lime text-black border-spot-lime shadow-[0_0_8px_rgba(200,255,0,0.2)]" : "border-border text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        {f === "all" ? "Histórico" : f}
                    </button>
                ))}
            </div>

            {users.length === 0 ? (
                <p className="py-4 text-center font-mono text-xs text-muted-foreground uppercase tracking-widest">Sin actividad</p>
            ) : (
                <div className="space-y-2">
                    {users.map((u, i) => (
                        <div
                            key={u.username}
                            className={`flex items-center gap-3 p-1.5 rounded-xl transition-colors ${u.isMe ? "bg-spot-lime/5 border border-spot-lime/20" : ""}`}
                        >
                            <span className="w-6 text-center text-sm font-bebas shrink-0">{getMedal(u.rank!)}</span>
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm shrink-0">
                                {u.isMe ? "😎" : "🎤"}
                            </div>
                            <div className="flex-1 min-w-0 flex items-center gap-1.5">
                                <p className={`font-bebas text-sm leading-none truncate ${u.isMe ? "text-spot-lime" : "text-foreground"}`}>
                                    @{u.username} {u.isMe && "(Tú)"}
                                </p>
                                {u.is_premium && (
                                    <Crown size={11} className="shrink-0 text-amber-400" style={{ filter: "drop-shadow(0 0 4px rgba(251,191,36,0.6))" }} />
                                )}
                            </div>
                            <span className={`font-mono text-xs shrink-0 ${i === 0 ? "text-amber-400" : "text-muted-foreground"}`}>
                                {u.count}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TopUsersWidget;
