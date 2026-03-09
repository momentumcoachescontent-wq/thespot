import { useState, useEffect } from "react";
import { CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFilter } from "@/contexts/FilterContext";

const EventsWidget = () => {
    const { resolvedDomain } = useFilter();
    const [events, setEvents] = useState<any[]>([]);

    useEffect(() => {
        (supabase as any)
            .from("events")
            .select("id, title, event_date, spot_id, location_text, spots(name, university_domain)")
            .gt("event_date", new Date().toISOString())
            .order("event_date", { ascending: true })
            .limit(20)
            .then(({ data, error }: any) => {
                if (error) {
                    console.error("Error fetching events widget:", error);
                    setEvents([]);
                    return;
                }
                if (!data) return;

                let filtered = data;
                // If there's a domain filter, keep events that belong to that domain or have no spot (global)
                if (resolvedDomain) {
                    filtered = data.filter((ev: any) =>
                        !ev.spot_id || ev.spots?.university_domain === resolvedDomain
                    );
                }
                setEvents(filtered.slice(0, 3));
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
                        {ev.spots?.name ? ` · ${ev.spots.name}` : ev.location_text ? ` · ${ev.location_text}` : ""}
                    </p>
                </div>
            ))}
        </div>
    );
};

export default EventsWidget;
