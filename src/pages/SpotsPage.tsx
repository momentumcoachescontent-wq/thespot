import { useState, useEffect } from "react";
import { Search, RefreshCw } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import SpotCard from "@/components/SpotCard";
import { supabase } from "@/integrations/supabase/client";

interface Spot {
  id: string;
  name: string;
  university_domain: string;
  memberCount: number;
}

const SpotsPage = () => {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchSpots = async () => {
      try {
        const { data } = await (supabase as any)
          .from('spots')
          .select('id, name, university_domain')
          .order('created_at', { ascending: false });

        const formatted = (data || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          university_domain: s.university_domain || 'campus',
          memberCount: 0,
        }));
        setSpots(formatted);
      } catch (e) {
        console.error("Error cargando spots:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchSpots();
  }, []);

  const filtered = spots.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-md px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bebas text-2xl tracking-wider text-foreground">Spots</h1>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Canales de voz activos</p>
            </div>
          </div>
          <div className="relative mt-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar spots..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-muted py-2.5 pl-9 pr-4 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md space-y-3 px-4 py-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-pulse">
            <RefreshCw className="mb-4 h-8 w-8 animate-spin text-spot-lime" />
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Cargando spots...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 text-5xl">📡</div>
            <h2 className="font-bebas text-2xl text-foreground uppercase tracking-wider">
              {search ? "Sin resultados" : "Sin spots activos"}
            </h2>
            <p className="mt-1 font-mono text-xs text-muted-foreground uppercase opacity-60">
              {search ? "Intenta otra búsqueda" : "Los spots aparecen cuando alguien graba en tu campus"}
            </p>
          </div>
        ) : (
          filtered.map((spot) => (
            <SpotCard
              key={spot.id}
              name={spot.name}
              description={`Canal de voz — ${spot.university_domain}`}
              campus={spot.university_domain}
              memberCount={spot.memberCount}
            />
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default SpotsPage;
