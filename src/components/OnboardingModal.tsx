import React, { useState } from "react";
import { motion } from "framer-motion";
import { User, AtSign, School, Phone, Mic, MapPin, MessageSquare, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface OnboardingModalProps {
    initialInstitution: string;
    onComplete: () => void;
}

const OnboardingModal = ({ initialInstitution, onComplete }: OnboardingModalProps) => {
    const { completeOnboarding } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState({
        full_name: "",
        username: "",
        institution_name: initialInstitution,
        phone: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!data.full_name || !data.username || !data.institution_name || !data.phone) {
            toast({ title: "Campos incompletos", description: "Por favor llena todos los datos.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            await completeOnboarding(data);
            toast({ title: "Perfil completado", description: "¡Bienvenido a la comunidad!" });
            onComplete();
        } catch (err: any) {
            toast({ title: "Error al guardar", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 md:p-6 backdrop-blur-md overflow-y-auto">
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-lg rounded-3xl border border-white/10 bg-zinc-950 p-6 md:p-8 shadow-2xl my-auto"
            >
                <div className="mb-6 flex flex-col items-center text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-spot-lime text-black shadow-[0_0_20px_rgba(200,255,0,0.3)]">
                        <User size={32} />
                    </div>
                    <h1 className="font-bebas text-4xl tracking-tighter text-white">COMPLETA TU PERFIL</h1>
                    <p className="font-mono text-[10px] uppercase tracking-[4px] text-spot-lime">El Spot te espera</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input
                                type="text"
                                placeholder="Nombre Completo"
                                value={data.full_name}
                                onChange={(e) => setData({ ...data, full_name: e.target.value })}
                                className="w-full rounded-xl border border-white/5 bg-white/5 py-3.5 pl-11 pr-4 font-mono text-[10px] text-white focus:border-spot-lime/50 focus:outline-none transition-all"
                                required
                            />
                        </div>
                        <div className="relative">
                            <AtSign size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input
                                type="text"
                                placeholder="Alias / Username"
                                value={data.username}
                                onChange={(e) => setData({ ...data, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                                className="w-full rounded-xl border border-white/5 bg-white/5 py-3.5 pl-11 pr-4 font-mono text-[10px] text-white focus:border-spot-lime/50 focus:outline-none transition-all"
                                required
                            />
                        </div>
                    </div>

                    <div className="relative">
                        <School size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Preparatoria o Universidad"
                            value={data.institution_name}
                            onChange={(e) => setData({ ...data, institution_name: e.target.value })}
                            className="w-full rounded-xl border border-white/5 bg-white/5 py-3.5 pl-11 pr-4 font-mono text-[10px] text-white focus:border-spot-lime/50 focus:outline-none transition-all"
                            required
                        />
                    </div>

                    <div className="relative">
                        <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                            type="tel"
                            placeholder="+52 Número de WhatsApp"
                            value={data.phone}
                            onChange={(e) => setData({ ...data, phone: e.target.value })}
                            className="w-full rounded-xl border border-white/5 bg-white/5 py-3.5 pl-11 pr-4 font-mono text-[10px] text-white focus:border-spot-lime/50 focus:outline-none transition-all"
                            required
                        />
                    </div>

                    {/* Permisos */}
                    <div className="mt-8 rounded-2xl bg-white/5 p-4 border border-white/5">
                        <h4 className="font-bebas text-sm tracking-widest text-zinc-300 mb-4 uppercase">Para que la app funcione correctamente</h4>
                        <div className="space-y-3">
                            {[
                                { icon: Mic, title: "Micrófono", desc: "Para grabar tus drops" },
                                { icon: MapPin, title: "Ubicación", desc: "Para contenido cercano" },
                                { icon: MessageSquare, title: "WhatsApp", desc: "Notificaciones importantes" },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-spot-lime/10 text-spot-lime">
                                        <item.icon size={16} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bebas text-[11px] leading-none text-zinc-200 uppercase tracking-wider">{item.title}</p>
                                        <p className="font-mono text-[8px] text-zinc-500 uppercase">{item.desc}</p>
                                    </div>
                                    <div className="h-4 w-4 rounded-full border border-spot-lime/50 flex items-center justify-center">
                                        <Check size={8} className="text-spot-lime" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="mt-4 font-mono text-[8px] text-zinc-500 text-center uppercase">
                            Puedes aceptar o modificar estos permisos en cualquier momento desde tu teléfono.
                        </p>
                    </div>

                    <div className="pt-4">
                        <button
                            disabled={loading}
                            type="submit"
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-spot-lime py-4 font-bebas text-xl tracking-wider text-black shadow-[0_0_20px_rgba(200,255,0,0.3)] transition-all hover:brightness-110 disabled:opacity-50"
                        >
                            {loading ? "GUARDANDO..." : "ACEPTAR Y CONTINUAR"}
                        </button>
                        <p className="mt-2 font-mono text-[8px] text-center text-zinc-500 uppercase tracking-widest">
                            Al continuar aceptas los permisos solicitados por la aplicación.
                        </p>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default OnboardingModal;
