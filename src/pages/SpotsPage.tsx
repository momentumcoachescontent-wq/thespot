import { useState } from "react";
import { Plus, Search } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import SpotCard from "@/components/SpotCard";

const demoSpots = [
  { id: "1", name: "Campus UNAM 🎓", description: "Voice drops from CU. Speak your truth.", campus: "UNAM", memberCount: 128, isJoined: true },
  { id: "2", name: "Tec MTY 🏔️", description: "Monterrey campus — real talk only.", campus: "ITESM", memberCount: 87, isJoined: false },
  { id: "3", name: "Creativos MX 🎨", description: "Artists, designers, musicians. Drop your art.", campus: "Online", memberCount: 245, isJoined: false },
  { id: "4", name: "Night Owls 🦉", description: "Late night thoughts and vibes.", campus: "All", memberCount: 312, isJoined: true },
];

const SpotsPage = () => {
  const [spots] = useState(demoSpots);
  const [search, setSearch] = useState("");

  const filtered = spots.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-md px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-extrabold text-foreground">Spots</h1>
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Plus size={18} />
            </button>
          </div>
          <div className="relative mt-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search spots..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-muted py-2.5 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md space-y-3 px-4 py-4">
        {filtered.map((spot) => (
          <SpotCard
            key={spot.id}
            name={spot.name}
            description={spot.description}
            campus={spot.campus}
            memberCount={spot.memberCount}
            isJoined={spot.isJoined}
            onJoin={() => console.log("Join", spot.id)}
          />
        ))}
      </div>

      <BottomNav />
    </div>
  );
};

export default SpotsPage;
