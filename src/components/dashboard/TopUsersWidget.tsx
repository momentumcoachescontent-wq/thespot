import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFilter } from "@/contexts/FilterContext";

const TopUsersWidget = () => {
    const { resolvedDomain } = useFilter();
    const [users, setUsers] = useState<{ username: string; count: number }[]>([]);

    useEffect(() => {
        let query = (supabase as any)
            .from("drops")
            .select("profiles:author_id(username), spots!inner(university_domain)")
            .gt("expires_at", new Date().toISOString());

        if (resolvedDomain) {
            query = query.eq("spots.university_domain", resolvedDomain);
        }

        query
            .limit(100)
            .then(({ data, error }: any) => {
                if (error) {
                    console.error("Error fetching top users widget:", error);
                    return;
                }
                const map: Record<string, number> = {};
                (data || []).forEach((d: any) => { const u = d.profiles?.username || "anónimo"; map[u] = (map[u] || 0) + 1; });
                setUsers(Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([username, count]) => ({ username, count })));
            });
    }, [resolvedDomain]);

    const medals = ["🥇", "🥈", "🥉", "4", "5"];

    if (!users.length) return <p className="py-4 text-center font-mono text-xs text-muted-foreground">Sin drops hoy</p>;

    return (
        <div className="space-y-2">
            {users.map((u, i) => (
                <div key={u.username} className="flex items-center gap-3">
                    <span className="w-6 text-center text-base shrink-0">{medals[i]}</span>
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm shrink-0">🎤</div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bebas text-sm leading-none truncate text-foreground">@{u.username}</p>
                    </div>
                    <span className={`font-mono text-xs shrink-0 ${i === 0 ? "text-amber-400" : "text-muted-foreground"}`}>{u.count}</span>
                </div>
            ))}
        </div>
    );
};

export default TopUsersWidget;
