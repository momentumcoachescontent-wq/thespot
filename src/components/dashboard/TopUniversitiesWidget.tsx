import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap } from "lucide-react";

const TopUniversitiesWidget = () => {
    const [universities, setUniversities] = useState<{ name: string; count: number; rank?: number }[]>([]);
    const [filter, setFilter] = useState<"7d" | "30d" | "all">("all");

    useEffect(() => {
        const fetchData = async () => {
            const now = new Date();
            let startDate = null;
            if (filter === "7d") startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            if (filter === "30d") startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

            let query = (supabase as any)
                .from("drop_history")
                .select("profiles!inner(university_domain)");

            if (startDate) query = query.gte("created_at", startDate);

            const { data, error } = await query;
            if (error) {
                console.error("Error fetching top universities:", error);
                return;
            }

            const map: Record<string, number> = {};
            (data || []).forEach((d: any) => {
                const uni = d.profiles?.university_domain || "Otro";
                map[uni] = (map[uni] || 0) + 1;
            });

            const sorted = Object.entries(map)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .map((u, i) => ({ ...u, rank: i + 1 }));

            setUniversities(sorted.slice(0, 5));
        };

        fetchData();
    }, [filter]);

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

            {universities.length === 0 ? (
                <p className="py-4 text-center font-mono text-xs text-muted-foreground uppercase tracking-widest">Sin actividad</p>
            ) : (
                <div className="space-y-2">
                    {universities.map((u, i) => (
                        <div
                            key={u.name}
                            className="flex items-center gap-3 p-1.5 rounded-xl transition-colors hover:bg-muted/5 border border-transparent"
                        >
                            <span className="w-6 text-center text-sm font-bebas shrink-0">{getMedal(u.rank!)}</span>
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-spot-lime/10 text-spot-lime shrink-0">
                                <GraduationCap size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bebas text-sm leading-none truncate text-foreground">
                                    {u.name.toUpperCase()}
                                </p>
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

export default TopUniversitiesWidget;
