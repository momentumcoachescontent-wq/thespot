import { useState, useEffect } from "react";
import { CalendarDays, Plus, MapPin, Users, Clock, X, Check, Share2 } from "lucide-react";
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
  location_text?: string;
  attendee_count?: number;
  spots?: { name: string };
}

const EventsPage = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<SpotEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", event_date: "", spot_id: "", location_text: "" });
  const [spots, setSpots] = useState<{ id: string; name: string }[]>([]);
  const [attendingIds, setAttendingIds] = useState<Set<string>>(new Set());
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setMyId(user?.id || null);
    await Promise.all([loadEvents(user?.id), loadSpots()]);
  };

  const loadEvents = async (userId?: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from("events")
        .select(`
          *,
          spots:spot_id(name),
          attendees:event_attendees(count)
        `)
        .gt("event_date", new Date().toISOString())
        .order("event_date", { ascending: true })
        .limit(30);

      if (error) throw error;

      // Extract raw count from the aggregate structure
      const formattedEvents = (data || []).map((ev: any) => ({
        ...ev,
        attendee_count: ev.attendees?.[0]?.count || 0
      }));

      setEvents(formattedEvents);

      if (userId) {
        const { data: myRsvps } = await (supabase as any)
          .from("event_attendees")
          .select("event_id")
          .eq("user_id", userId);
        setAttendingIds(new Set((myRsvps || []).map((r: any) => r.event_id)));
      }
    } catch (e) {
      console.error("Error loading events:", e);
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
      if (!myId) return;
      const { error } = await (supabase as any).from("events").insert({
        title: form.title,
        description: form.description,
        event_date: form.event_date,
        location_text: form.location_text,
        creator_id: myId,
        spot_id: form.spot_id || null,
      });
      if (error) throw error;
      toast({ title: "Evento creado", description: `"${form.title}" publicado en el campus.` });
      setShowCreate(false);
      setForm({ title: "", description: "", event_date: "", spot_id: "", location_text: "" });
      loadEvents(myId);
    } catch (e: any) {
      toast({ title: "Error", description: "No se pudo crear el evento.", variant: "destructive" });
    }
  };

  const toggleAttend = async (eventId: string) => {
    if (!myId) return;
    const isAttending = attendingIds.has(eventId);
    try {
      if (isAttending) {
        await (supabase as any).from("event_attendees").delete().eq("event_id", eventId).eq("user_id", myId);
        setAttendingIds(prev => { const n = new Set(prev); n.delete(eventId); return n; });
      } else {
        await (supabase as any).from("event_attendees").insert({ event_id: eventId, user_id: myId });
        setAttendingIds(prev => { const n = new Set(prev); n.add(eventId); return n; });
      }
      loadEvents(myId); // Refresh counts
    } catch (e) {
      toast({ title: "Error", description: "Ocurrió un error al actualizar tu asistencia.", variant: "destructive" });
    }
  };

  const handleShare = (ev: SpotEvent) => {
    const date = new Date(ev.event_date).toLocaleDateString();
    const text = `¡Ey! Te invito a "${ev.title}" este ${date}.📍 Lugar: ${ev.location_text || "En el campus"}. Regístrate aquí: https://thespot.lovable.app/events`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("es-MX", { weekday: "short", month: "short", day: "numeric" });
  };

  return (
    <div className="min-h-screen bg-background pb-4">
      <div className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div>
            <h1 className="font-bebas text-2xl tracking-wider text-foreground">EVENTOS</h1>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground text-spot-lime">Conexiones Reales</p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-spot-lime text-black shadow-[0_0_12px_rgba(200,255,0,0.3)] transition-transform active:scale-95"
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
              <h3 className="font-bebas text-lg text-spot-lime">Organizar Encuentro</h3>
              <input
                required
                placeholder="Nombre del evento"
                className="w-full rounded-xl border border-border bg-black/40 px-3 py-2 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-spot-lime"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
              <textarea
                placeholder="Detalles (ej. Traer snacks)"
                rows={2}
                className="w-full rounded-xl border border-border bg-black/40 px-3 py-2 font-mono text-xs resize-none focus:outline-none focus:ring-1 focus:ring-spot-lime"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  required
                  type="date"
                  className="w-full rounded-xl border border-border bg-black/40 px-3 py-2 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-spot-lime"
                  value={form.event_date}
                  onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))}
                />
                <input
                  placeholder="Lugar exacto"
                  className="w-full rounded-xl border border-border bg-black/40 px-3 py-2 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-spot-lime"
                  value={form.location_text}
                  onChange={e => setForm(f => ({ ...f, location_text: e.target.value }))}
                />
              </div>
              <select
                className="w-full rounded-xl border border-border bg-black/40 px-3 py-2 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-spot-lime"
                value={form.spot_id}
                onChange={e => setForm(f => ({ ...f, spot_id: e.target.value }))}
              >
                <option value="">Cualquier Spot</option>
                {spots.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button type="submit" className="w-full rounded-xl bg-spot-lime py-2 font-bebas text-lg text-black shadow-[0_4px_12px_rgba(200,255,0,0.2)]">
                LANZAR INVITACIÓN
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="mb-3 h-28 animate-pulse rounded-2xl bg-muted/30" />
          ))
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
            <div className="mb-4 text-5xl">🌑</div>
            <h2 className="font-bebas text-2xl uppercase tracking-wider text-foreground">Silencio en el campus</h2>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">No hay eventos próximos hoy</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((ev, i) => (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-border bg-card p-4 hover:border-spot-lime/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bebas text-xl leading-none text-foreground tracking-wide truncate">{ev.title}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="flex items-center gap-1 font-mono text-[10px] text-spot-lime uppercase tracking-widest">
                        <Clock size={10} /> {formatDate(ev.event_date)}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground uppercase tracking-widest truncate max-w-[120px]">
                        <MapPin size={10} /> {ev.location_text || ev.spots?.name || "En el campus"}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-[10px] text-amber-400 uppercase tracking-widest">
                        <Users size={10} /> {ev.attendee_count} Confirmados
                      </span>
                    </div>
                    {ev.description && (
                      <p className="mt-2 font-mono text-[9px] text-muted-foreground/80 leading-relaxed border-l border-border pl-2 italic">
                        "{ev.description}"
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => toggleAttend(ev.id)}
                      className={`flex items-center justify-center h-8 px-3 rounded-full font-mono text-[9px] uppercase tracking-widest transition-all ${attendingIds.has(ev.id)
                          ? "bg-spot-lime text-black font-bold shadow-[0_0_10px_rgba(200,255,0,0.2)]"
                          : "border border-border text-muted-foreground hover:border-spot-lime/50 hover:text-spot-lime"
                        }`}
                    >
                      {attendingIds.has(ev.id) ? <><Check size={12} className="mr-1" /> Voy</> : <><Plus size={12} className="mr-1" /> Asistir</>}
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleShare(ev)}
                      className="flex items-center justify-center h-8 w-8 rounded-full border border-border text-muted-foreground hover:bg-muted/30"
                    >
                      <Share2 size={12} />
                    </motion.button>
                  </div>
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
