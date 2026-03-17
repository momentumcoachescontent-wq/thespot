import { useState, useEffect } from "react";
import { Shield, LogOut, Plus, Trash2, Phone, User, X, Pencil, School, AtSign, Bell } from "lucide-react";
import PushNotificationToggle from "@/components/PushNotificationToggle";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface SOSContact {
  id: string;
  name: string;
  phone: string;
  is_spot_contact: boolean;
  is_emergency_contact: boolean;
}

const ProfilePage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { profile, updateProfile, signOut: authSignOut } = useAuth();

  const [contacts, setContacts] = useState<SOSContact[]>([]);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [newContact, setNewContact] = useState({
    name: "",
    phone: "",
    is_spot_contact: true,
    is_emergency_contact: false,
  });
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    username: "",
    institution_name: "",
    phone: "",
    avatar_emoji: "🎤"
  });

  const EMOJI_OPTIONS = ["🎤", "🔥", "😎", "👾", "🦊", "🎧", "🤘", "👽", "🚀", "💀"];
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    fetchContacts();
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || "",
        username: profile.username || "",
        institution_name: profile.institution_name || "",
        phone: profile.phone || "",
        avatar_emoji: profile.avatar_emoji || "🎤"
      });
    }
  }, [profile]);

  const fetchContacts = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("sos_contacts")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: "No pudimos cargar tus contactos.", variant: "destructive" });
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profileForm.username.trim()) {
      toast({ title: "Error", description: "El alias es obligatorio.", variant: "destructive" });
      return;
    }

    setIsSavingProfile(true);
    try {
      await updateProfile({
        full_name: profileForm.full_name.trim(),
        username: profileForm.username.trim().toLowerCase().replace(/\s/g, ""),
        institution_name: profileForm.institution_name.trim(),
        phone: profileForm.phone.trim(),
        avatar_emoji: profileForm.avatar_emoji
      });

      setIsEditingProfile(false);
      toast({ title: "Perfil actualizado", description: "Tus cambios se han guardado correctamente." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo actualizar el perfil.", variant: "destructive" });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name || !newContact.phone) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await (supabase as any).from("sos_contacts").insert([{
        user_id: user.id,
        name: newContact.name,
        phone: newContact.phone,
        is_spot_contact: newContact.is_spot_contact,
        is_emergency_contact: newContact.is_emergency_contact,
      }]);

      if (error) throw error;

      toast({ title: "Contacto guardado", description: `${newContact.name} ha sido añadido.` });
      setNewContact({ name: "", phone: "", is_spot_contact: true, is_emergency_contact: false });
      setIsAddingMode(false);
      fetchContacts();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const deleteContact = async (id: string) => {
    try {
      const { error } = await (supabase as any).from("sos_contacts").delete().eq("id", id);
      if (error) throw error;
      setContacts(contacts.filter(c => c.id !== id));
      toast({ title: "Contacto eliminado" });
    } catch (error: any) {
      toast({ title: "Error", description: "No se pudo eliminar el contacto.", variant: "destructive" });
    }
  };

  const handleSignOut = async () => {
    await authSignOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <h1 className="font-bebas text-2xl tracking-wider text-foreground">PERFIL</h1>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 py-8">
        {/* Profile Card */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-spot-lime text-5xl shadow-[0_0_30px_rgba(200,255,0,0.3)]">
              {profileForm.avatar_emoji}
            </div>
            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="absolute -right-2 -bottom-2 rounded-full bg-zinc-900 border border-white/10 p-2 text-spot-lime shadow-lg"
            >
              {isEditingProfile ? <X size={16} /> : <Pencil size={16} />}
            </button>
          </div>

          {!isEditingProfile ? (
            <div className="space-y-1">
              <h2 className="font-bebas text-3xl text-white tracking-tight">
                {profile?.full_name || "Sin Nombre"}
              </h2>
              <div className="flex items-center justify-center gap-2">
                <AtSign size={12} className="text-spot-lime" />
                <span className="font-mono text-sm text-zinc-400">@{profile?.username || "usuario"}</span>
              </div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <School size={12} className="text-muted-foreground" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {profile?.institution_name || "Institución no definida"}
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full space-y-4 mt-2">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 px-1 scrollbar-hide">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setProfileForm({ ...profileForm, avatar_emoji: emoji })}
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl transition-all ${profileForm.avatar_emoji === emoji
                      ? "bg-spot-lime shadow-[0_0_15px_rgba(200,255,0,0.4)] scale-110"
                      : "bg-white/5 opacity-50 hover:opacity-100"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                <div className="relative">
                  <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    placeholder="Nombre Completo"
                    value={profileForm.full_name}
                    onChange={e => setProfileForm({ ...profileForm, full_name: e.target.value })}
                    className="w-full rounded-xl border border-white/5 bg-white/5 py-3 pl-11 pr-4 font-mono text-xs text-white focus:border-spot-lime/50 focus:outline-none"
                  />
                </div>
                <div className="relative">
                  <AtSign size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    placeholder="Alias"
                    value={profileForm.username}
                    onChange={e => setProfileForm({ ...profileForm, username: e.target.value })}
                    className="w-full rounded-xl border border-white/5 bg-white/5 py-3 pl-11 pr-4 font-mono text-xs text-white focus:border-spot-lime/50 focus:outline-none"
                  />
                </div>
                <div className="relative">
                  <School size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    placeholder="Institución"
                    value={profileForm.institution_name}
                    onChange={e => setProfileForm({ ...profileForm, institution_name: e.target.value })}
                    className="w-full rounded-xl border border-white/5 bg-white/5 py-3 pl-11 pr-4 font-mono text-xs text-white focus:border-spot-lime/50 focus:outline-none"
                  />
                </div>
                <div className="relative">
                  <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    placeholder="Teléfono"
                    value={profileForm.phone}
                    onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full rounded-xl border border-white/5 bg-white/5 py-3 pl-11 pr-4 font-mono text-xs text-white focus:border-spot-lime/50 focus:outline-none"
                  />
                </div>
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="w-full rounded-xl bg-spot-lime py-3 font-bebas text-lg text-black shadow-lg transition-all hover:brightness-110 disabled:opacity-50"
              >
                {isSavingProfile ? "GUARDANDO..." : "GUARDAR CAMBIOS"}
              </button>
            </div>
          )}
        </div>

        {/* Notifications Section */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 flex items-center gap-2 font-bebas text-xl text-foreground">
            <Bell size={18} className="text-spot-lime" />
            NOTIFICACIONES
          </h3>
          <PushNotificationToggle />
        </div>

        {/* SOS Contacts Section */}
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bebas text-2xl text-foreground">
              <Shield size={20} className="text-spot-lime" />
              RED DE SEGURIDAD
            </h3>
            {contacts.length < 5 && !isAddingMode && (
              <button
                onClick={() => setIsAddingMode(true)}
                className="rounded-xl bg-spot-lime/10 p-2 text-spot-lime border border-spot-lime/20 hover:bg-spot-lime/20 transition-colors"
              >
                <Plus size={20} />
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {isAddingMode && (
              <motion.form
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleAddContact}
                className="space-y-4 rounded-2xl border border-spot-lime/20 bg-spot-lime/5 p-5 shadow-xl"
              >
                {/* Name + phone */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={12} />
                    <input
                      placeholder="Nombre"
                      className="w-full rounded-xl bg-black/40 py-3 pl-9 pr-3 font-mono text-[10px] focus:outline-none focus:ring-1 focus:ring-spot-lime"
                      value={newContact.name}
                      onChange={e => setNewContact({ ...newContact, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={12} />
                    <input
                      placeholder="Teléfono"
                      className="w-full rounded-xl bg-black/40 py-3 pl-9 pr-3 font-mono text-[10px] focus:outline-none focus:ring-1 focus:ring-spot-lime"
                      value={newContact.phone}
                      onChange={e => setNewContact({ ...newContact, phone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Category checkboxes */}
                <div className="space-y-2 rounded-xl bg-black/20 p-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newContact.is_spot_contact}
                      onChange={e => setNewContact({ ...newContact, is_spot_contact: e.target.checked })}
                      className="h-4 w-4 rounded accent-spot-lime"
                    />
                    <div>
                      <span className="font-mono text-[11px] text-spot-lime">🎙️ Contacto de Spot</span>
                      <p className="font-mono text-[9px] text-muted-foreground">Recibe tu aviso de "Voy al Spot"</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newContact.is_emergency_contact}
                      onChange={e => setNewContact({ ...newContact, is_emergency_contact: e.target.checked })}
                      className="h-4 w-4 rounded accent-spot-red"
                    />
                    <div>
                      <span className="font-mono text-[11px] text-spot-red">🆘 Contacto de emergencia</span>
                      <p className="font-mono text-[9px] text-muted-foreground">Recibe alertas SOS tuyas</p>
                    </div>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <button type="submit" className="flex-1 rounded-xl bg-spot-lime px-6 py-3 text-xs font-bebas tracking-widest text-black shadow-lg">
                    AÑADIR
                  </button>
                  <button type="button" onClick={() => setIsAddingMode(false)} className="rounded-xl bg-white/5 border border-white/10 p-3">
                    <X size={14} />
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="space-y-3">
            {contacts.length === 0 && !isLoadingContacts && !isAddingMode && (
              <div className="py-10 text-center border border-white/5 bg-white/5 rounded-2xl">
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[3px]">Sin contactos configurados</p>
              </div>
            )}
            {contacts.map((contact) => (
              <motion.div
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                key={contact.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-zinc-900/50 p-4 shadow-sm group hover:border-white/20 transition-all"
              >
                <div className="space-y-1">
                  <h4 className="font-bebas text-xl leading-none text-white tracking-wide">{contact.name}</h4>
                  <p className="font-mono text-[9px] text-zinc-400">{contact.phone}</p>
                  <div className="flex gap-1.5 mt-1">
                    {contact.is_spot_contact && (
                      <span className="rounded-full bg-spot-lime/10 border border-spot-lime/20 px-2 py-0.5 font-mono text-[8px] text-spot-lime uppercase tracking-widest">
                        🎙️ Spot
                      </span>
                    )}
                    {contact.is_emergency_contact && (
                      <span className="rounded-full bg-spot-red/10 border border-spot-red/20 px-2 py-0.5 font-mono text-[8px] text-spot-red uppercase tracking-widest">
                        🆘 SOS
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => deleteContact(contact.id)}
                  className="rounded-xl p-2.5 text-zinc-600 hover:text-spot-red hover:bg-spot-red/10 transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* User Account Info (Read-only) */}
        <div className="mt-12 space-y-3 border-t border-white/5 pt-8">
          <div className="flex items-center justify-between px-2">
            <span className="font-mono text-[9px] uppercase tracking-[3px] text-muted-foreground">CUENTA DE ACCESO</span>
            <span className="font-mono text-[9px] text-zinc-600 uppercase">{profile?.role === 'admin' ? 'ARQUITECTO' : 'ESTUDIANTE'}</span>
          </div>
          <div className="rounded-2xl border border-white/5 bg-black/20 p-5 flex items-center justify-between">
            <span className="font-mono text-[11px] text-zinc-300">{profile?.university_domain || "spot.edu"}</span>
            <Shield size={14} className="text-zinc-700" />
          </div>
        </div>

        {/* Logout Action */}
        <div className="mt-8">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-spot-red/20 bg-spot-red/5 py-5 font-bebas text-xl text-spot-red tracking-[2px] transition-all hover:bg-spot-red/10 group shadow-lg"
          >
            <LogOut size={22} className="group-hover:translate-x-1 transition-transform" />
            CERRAR SESIÓN
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
