import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SosModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTriggerAction: () => void;
}

const SosModal = ({ isOpen, onClose, onTriggerAction }: SosModalProps) => {
    const [countdown, setCountdown] = useState(30);
    const [pin, setPin] = useState("");
    const { toast } = useToast();
    const CORRECT_PIN = "1111"; // Placeholder for Phase 2 demo

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isOpen && countdown > 0) {
            timer = setInterval(() => {
                setCountdown((prev) => prev - 1);
            }, 1000);
        } else if (isOpen && countdown === 0) {
            // Solo disparamos si el modal sigue abierto al llegar a cero
            onTriggerAction();
            onClose();
        }
        return () => clearInterval(timer);
    }, [isOpen, countdown, onTriggerAction, onClose]);

    useEffect(() => {
        if (isOpen) {
            setCountdown(30);
            setPin("");
        }
    }, [isOpen]);

    const handlePinChange = (value: string) => {
        setPin(value);
        if (value === CORRECT_PIN) {
            toast({
                title: "Alerta Cancelada",
                description: "El PIN es correcto. Falsa alarma registrada.",
            });
            onClose();
        } else if (value.length === 4) {
            toast({
                title: "PIN Incorrecto",
                description: "Inténtalo de nuevo.",
                variant: "destructive",
            });
            setPin("");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px] bg-spot-black border-spot-red/50 text-white overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-spot-red font-bebas text-3xl uppercase tracking-widest">
                        <ShieldAlert className="animate-pulse" />
                        Alerta en Curso
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center justify-center space-y-8 py-6">
                    <div className="relative flex items-center justify-center">
                        <svg className="h-32 w-32 -rotate-90">
                            <circle
                                cx="64"
                                cy="64"
                                r="60"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                className="text-spot-grey"
                            />
                            <motion.circle
                                cx="64"
                                cy="64"
                                r="60"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                strokeDasharray="377"
                                initial={{ strokeDashoffset: 0 }}
                                animate={{ strokeDashoffset: 377 - (377 * countdown) / 30 }}
                                transition={{ duration: 1, ease: "linear" }}
                                className="text-spot-red"
                            />
                        </svg>
                        <span className="absolute font-bebas text-5xl font-bold">{countdown}</span>
                    </div>

                    <div className="text-center space-y-2">
                        <p className="font-mono text-sm text-muted-foreground uppercase tracking-tighter">
                            Notificando a contactos de confianza en 30 segundos si no ingresas tu PIN
                        </p>
                    </div>

                    <div className="space-y-4 w-full flex flex-col items-center">
                        <p className="font-mono text-xs uppercase text-spot-muted">Ingresa PIN de cancelación</p>
                        <InputOTP
                            maxLength={4}
                            value={pin}
                            onChange={handlePinChange}
                            className="gap-2"
                        >
                            <InputOTPGroup className="gap-2">
                                <InputOTPSlot index={0} className="border-spot-grey bg-spot-grey/50 text-white h-12 w-12 text-xl" />
                                <InputOTPSlot index={1} className="border-spot-grey bg-spot-grey/50 text-white h-12 w-12 text-xl" />
                                <InputOTPSlot index={2} className="border-spot-grey bg-spot-grey/50 text-white h-12 w-12 text-xl" />
                                <InputOTPSlot index={3} className="border-spot-grey bg-spot-grey/50 text-white h-12 w-12 text-xl" />
                            </InputOTPGroup>
                        </InputOTP>
                    </div>

                    <div className="flex items-start gap-2 bg-spot-red/10 p-3 rounded-lg border border-spot-red/20">
                        <AlertCircle className="text-spot-red h-5 w-5 shrink-0" />
                        <p className="text-[10px] leading-tight text-white/70 font-mono uppercase">
                            Tu ubicación GPS será compartida automáticamente al agotarse el tiempo para una respuesta colectiva inmediata.
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default SosModal;
