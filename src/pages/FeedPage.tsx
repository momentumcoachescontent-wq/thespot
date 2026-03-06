import { useState } from "react";
import { Mic } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import DropCard from "@/components/DropCard";
import VoiceRecorder from "@/components/VoiceRecorder";

// Demo drops
const demoDrops = [
  {
    id: "1",
    username: "luna_mx",
    avatarEmoji: "🌙",
    audioUrl: "",
    createdAt: new Date(Date.now() - 3 * 60000),
    expiresAt: new Date(Date.now() + 12 * 60000),
  },
  {
    id: "2",
    username: "carlos.fire",
    avatarEmoji: "🔥",
    audioUrl: "",
    createdAt: new Date(Date.now() - 7 * 60000),
    expiresAt: new Date(Date.now() + 8 * 60000),
  },
  {
    id: "3",
    username: "vale_speaks",
    avatarEmoji: "💜",
    audioUrl: "",
    createdAt: new Date(Date.now() - 10 * 60000),
    expiresAt: new Date(Date.now() + 5 * 60000),
  },
];

const FeedPage = () => {
  const [showRecorder, setShowRecorder] = useState(false);
  const [drops] = useState(demoDrops);

  const handleRecorded = (blob: Blob) => {
    console.log("Recorded drop:", blob.size, "bytes");
    setShowRecorder(false);
    // TODO: Upload to Supabase Storage
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar spotName="Campus UNAM 🎓" onlineCount={12} />

      <div className="mx-auto max-w-md space-y-3 px-4 py-4">
        {drops.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 text-5xl">🎤</div>
            <h2 className="text-lg font-bold text-foreground">No drops yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Be the first to share your voice
            </p>
          </div>
        ) : (
          drops.map((drop) => (
            <DropCard
              key={drop.id}
              username={drop.username}
              avatarEmoji={drop.avatarEmoji}
              audioUrl={drop.audioUrl}
              createdAt={drop.createdAt}
              expiresAt={drop.expiresAt}
            />
          ))
        )}
      </div>

      {/* FAB */}
      {!showRecorder && (
        <button
          onClick={() => setShowRecorder(true)}
          className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow transition-transform hover:scale-110 active:scale-95"
        >
          <Mic size={24} />
        </button>
      )}

      <AnimatePresence>
        {showRecorder && (
          <VoiceRecorder
            maxDuration={60}
            onRecorded={handleRecorded}
            onCancel={() => setShowRecorder(false)}
          />
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default FeedPage;
