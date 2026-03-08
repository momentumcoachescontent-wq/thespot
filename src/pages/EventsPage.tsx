import { useState, useEffect } from "react";
import { CalendarDays, Plus, MapPin, Users, Clock, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SpotEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  spot_id: string;
  creator_id: string;
  attendee_count?: number;
  spots?: { name: string };
}

const EventsPage = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<SpotEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", event_date: "", spot_id: "" });
  const [spots, setSpots] = useState<{ id: string; name: string }[]>([]);
  const [attending, setAttending] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadEvents();
    loadSpots();
  }, []);

  const loadEvents = async () => {
    try {
      const { data } = await (supabase as any)
        .from("events")
        .select("*, spots:spot_id(name)")
        .gt("event_date", new Date().toISOString())
        .order("event_date", { ascending: true })
        .limit(30);
      setEvents(data || []);
    } catch (e) {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSpots = async () => {
    const { data } = await (supabase as any).from("spots").select("id, name").limit(20);
    setSpots(data || []);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.event_date) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await (supabase as any).from("events").insert({
        ...form,
        creator_id: user.id,
        spot_id: form.spot_id || null,
      });
      if (error) throw error;
      toast({ title: "Evento creado", description: `"${form.title}" publicado en el spot.` });
      setShowCreate(false);
      setForm({ title: "", description: "", event_date: "", spot_id: "" });
      loadEvents();
    } catch (e: any) {
      toast({ title: "Error", description: "No se pudo crear el evento.", variant: "destructive" });
    }
  };

  const toggleAttend = (id: string) => {
    setAttending(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("es-MX", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen bg-background pb-4">
      <div className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div>
            <h1 className="font-bebas text-2xl tracking-wider text-foreground">EVENTOS</h1>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Encuentros en tu campus</p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-spot-lime text-black shadow-[0_0_12px_rgba(200,255,0,0.3)]"
          >
            {showCreate ? <X size={18} /> : <Plus size={18} />}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 py-4">
        <AnimatePresence>
          {showCreate && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleCreate}
              className="mb-4 overflow-hidden rounded-2xl border border-spot-lime/20 bg-spot-lime/5 p-4 space-y-3"
            >
              <h3 className="font-bebas text-lg text-spot-lime">Nuevo evento</h3>
              <input
                required
                placeholder="Título del evento"
                className="w-full rounded-xl border border-border bg-black/40 px-3 py-2 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-spot-lime"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
              <textarea
                placeholder="¿De qué trata? (opcional)"
                rows={2}
                className="w-full rounded-xl border border-border bg-black/40 px-3 py-2 font-mono text-xs resize-none focus:outline-none focus:ring-1 focus:ring-spot-lime"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
              <input
                required
                type="datetime-local"
                className="w-full rounded-xl border border-border bg-black/40 px-3 py-2 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-spot-lime"
                value={form.event_date}
                onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))}
              />
              {spots.length > 0 && (
                <select
                  className="w-full rounded-xl border border-border bg-black/40 px-3 py-2 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-spot-lime"
                  value={form.spot_id}
                  onChange={e => setForm(f => ({ ...f, spot_id: e.target.value }))}
                >
                  <option value="">Sin spot específico</option>
                  {spots.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
              <button type="submit" className="w-full rounded-xl bg-spot-lime py-2 font-bebas text-lg text-black">
                PUBLICAR EVENTO
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="mb-3 h-28 animate-pulse rounded-2xl bg-muted/30" />
          ))
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 text-5xl">📅</div>
            <h2 className="font-bebas text-2xl uppercase tracking-wider text-foreground">Sin eventos próximos</h2>
            <p className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground/60">
              Sé el primero en organizar algo
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((ev, i) => (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bebas text-xl leading-none text-foreground">{ev.title}</h3>
                    {ev.description && (
                      <p className="mt-1 font-mono text-[10px] text-muted-foreground line-clamp-2">{ev.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1 font-mono text-[10px] text-spot-lime">
                        <Clock size={10} /> {formatDate(ev.event_date)}
                      </span>
                      {ev.spots?.name && (
                        <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                          <MapPin size={10} /> {ev.spots.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => toggleAttend(ev.id)}
                    className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-all ${
                      attending.has(ev.id)
                        ? "bg-spot-lime/20 border border-spot-lime/50 text-spot-lime"
                        : "border border-border text-muted-foreground hover:border-spot-lime/50 hover:text-spot-lime"
                    }`}
                  >
                    {attending.has(ev.id) ? <><Check size={10} /> Voy</> : <><Plus size={10} /> Asistir</>}
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      
    </div>
  );
};

export default EventsPage;
