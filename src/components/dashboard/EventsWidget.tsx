import { useState, useEffect } from "react";
import { CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFilter } from "@/contexts/FilterContext";

const EventsWidget = () => {
    const { resolvedDomain } = useFilter();
    const [events, setEvents] = useState<any[]>([]);

    useEffect(() => {
        let query = (supabase as any)
            .from("events")
            .select("id, title, event_date, spots!inner(name, university_domain)")
            .gt("event_date", new Date().toISOString());

        if (resolvedDomain) {
            query = query.eq("spots.university_domain", resolvedDomain);
        }

        query
            .order("event_date", { ascending: true })
            .limit(3)
            .then(({ data, error }: any) => {
                if (error) console.error("Error fetching events widget:", error);
                setEvents(data || []);
            });
    }, [resolvedDomain]);

    if (!events.length) return (
        <div className="flex flex-col items-center py-4 text-center">
            <CalendarDays size={24} className="mb-2 text-muted-foreground/30" />
            <p className="font-mono text-xs text-muted-foreground">Sin eventos próximos</p>
        </div>
    );

    return (
        <div className="space-y-2">
            {events.map(ev => (
                <div key={ev.id} className="rounded-xl border border-border bg-muted/10 px-3 py-2">
                    <p className="font-bebas text-sm leading-none text-foreground">{ev.title}</p>
                    <p className="font-mono text-[9px] text-muted-foreground mt-0.5">
                        {new Date(ev.event_date).toLocaleDateString("es-MX", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        {ev.spots?.name ? ` · ${ev.spots.name}` : ""}
                    </p>
                </div>
            ))}
        </div>
    );
};

export default EventsWidget;
