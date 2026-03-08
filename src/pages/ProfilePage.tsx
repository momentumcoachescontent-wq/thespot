import { useState, useEffect } from "react";
import { Settings, Shield, LogOut, Plus, Trash2, Phone, User, X } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface SOSContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

const ProfilePage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<SOSContact[]>([]);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", phone: "", relationship: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    fetchContacts();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email);
    });
  }, []);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from("sos_contacts")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: "No pudimos cargar tus contactos.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name || !newContact.phone) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("sos_contacts").insert([
        { ...newContact, user_id: user.id }
      ]);

      if (error) throw error;

      toast({ title: "Contacto guardado", description: `${newContact.name} ha sido añadido.` });
      setNewContact({ name: "", phone: "", relationship: "" });
      setIsAddingMode(false);
      fetchContacts();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const deleteContact = async (id: string) => {
    try {
      const { error } = await supabase.from("sos_contacts").delete().eq("id", id);
      if (error) throw error;
      setContacts(contacts.filter(c => c.id !== id));
      toast({ title: "Contacto eliminado" });
    } catch (error: any) {
      toast({ title: "Error", description: "No se pudo eliminar el contacto.", variant: "destructive" });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <h1 className="font-bebas text-2xl tracking-wider text-foreground">PERFIL</h1>
          <button className="text-muted-foreground hover:text-foreground">
            <Settings size={20} />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 py-8">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-spot-lime text-4xl shadow-[0_0_20px_rgba(200,255,0,0.3)]">
            🎤
          </div>
          <div className="text-center">
            <h2 className="font-bebas text-2xl text-foreground">
              {userEmail ? userEmail.split("@")[0] : "Mi Spot"}
            </h2>
            {userEmail && (
              <p className="font-mono text-[9px] text-muted-foreground/60">{userEmail}</p>
            )}
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Tu voz tiene poder.</p>
          </div>
        </div>

        {/* SOS Contacts Section */}
        <div className="mt-10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bebas text-xl text-foreground">
              <Shield size={18} className="text-spot-lime" />
              CONTACTOS DE CONFIANZA
            </h3>
            {contacts.length < 3 && !isAddingMode && (
              <button
                onClick={() => setIsAddingMode(true)}
                className="rounded-full bg-spot-lime/10 p-2 text-spot-lime hover:bg-spot-lime/20"
              >
                <Plus size={18} />
              </button>
            )}
          </div>

          <AnimatePresence>
            {isAddingMode && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleAddContact}
                className="space-y-3 overflow-hidden rounded-2xl border border-spot-lime/20 bg-spot-lime/5 p-4"
              >
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                    <input
                      placeholder="Nombre"
                      className="w-full rounded-lg bg-black/40 py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-spot-lime"
                      value={newContact.name}
                      onChange={e => setNewContact({ ...newContact, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                    <input
                      placeholder="WhatsApp"
                      className="w-full rounded-lg bg-black/40 py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-spot-lime"
                      value={newContact.phone}
                      onChange={e => setNewContact({ ...newContact, phone: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    placeholder="Relación (ej. Madre)"
                    className="flex-1 rounded-lg bg-black/40 py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-spot-lime"
                    value={newContact.relationship}
                    onChange={e => setNewContact({ ...newContact, relationship: e.target.value })}
                  />
                  <button type="submit" className="rounded-lg bg-spot-lime px-4 py-2 text-xs font-bold text-black">GUARDAR</button>
                  <button type="button" onClick={() => setIsAddingMode(false)} className="rounded-lg bg-white/5 p-2"><X size={14} /></button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            {contacts.length === 0 && !isLoading && !isAddingMode && (
              <p className="py-4 text-center font-mono text-[10px] text-muted-foreground">No tienes contactos de emergencia configurados.</p>
            )}
            {contacts.map((contact) => (
              <div key={contact.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-4">
                <div>
                  <h4 className="font-bebas text-lg leading-none text-foreground">{contact.name}</h4>
                  <p className="font-mono text-[10px] text-muted-foreground">{contact.relationship} • {contact.phone}</p>
                </div>
                <button
                  onClick={() => deleteContact(contact.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-10 space-y-2">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 py-4 font-bebas text-lg text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut size={18} />
            CERRAR SESIÓN
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfilePage;
