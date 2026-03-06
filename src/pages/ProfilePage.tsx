import { Settings, Shield, LogOut } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const ProfilePage = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <h1 className="text-lg font-extrabold text-foreground">Profile</h1>
          <button className="text-muted-foreground hover:text-foreground">
            <Settings size={20} />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 py-8">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-hero text-4xl shadow-glow">
            🎤
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground">@your_voice</h2>
            <p className="text-xs text-muted-foreground">UNAM • Joined 2 spots</p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-3 gap-3">
          {[
            { label: "Drops", value: "24" },
            { label: "Reactions", value: "89" },
            { label: "Streak", value: "7🔥" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center rounded-2xl border border-border bg-card p-4">
              <span className="text-xl font-bold text-foreground">{stat.value}</span>
              <span className="text-[10px] text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Mood History */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-bold text-foreground">Recent Moods</h3>
          <div className="flex items-center gap-2">
            {["🔥", "🙂", "🙂", "😐", "🔥", "😔", "🙂"].map((emoji, i) => (
              <div key={i} className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-lg">
                {emoji}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-2">
          <button className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-sm font-semibold text-foreground transition-colors hover:border-primary/40">
            <Shield size={18} className="text-spot-safe" />
            Emergency Contacts
          </button>
          <button className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-sm font-semibold text-destructive transition-colors hover:border-destructive/40">
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfilePage;
