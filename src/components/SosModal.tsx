import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ShieldAlert, MessageCircle, X } from "lucide-react";

interface SosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerAction: () => void;
}

const SosModal = ({ isOpen, onClose, onTriggerAction }: SosModalProps) => {
  const handleConfirm = () => {
    onTriggerAction();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[380px] bg-background border-spot-red/40 text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-bebas text-3xl uppercase tracking-widest text-spot-red">
            <ShieldAlert size={26} className="shrink-0" />
            Alerta SOS
          </DialogTitle>
          <DialogDescription className="font-mono text-xs text-muted-foreground leading-relaxed">
            Se abrirá WhatsApp con un mensaje de emergencia que incluye tu ubicación GPS.
            Selecciona a quién enviárselo desde la app.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={handleConfirm}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-spot-red py-3 font-bebas text-xl tracking-wider text-white shadow-lg shadow-spot-red/30 transition-all hover:brightness-110 active:scale-95"
          >
            <MessageCircle size={18} />
            Enviar por WhatsApp
          </button>

          <button
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 font-mono text-xs text-muted-foreground transition-all hover:text-foreground"
          >
            <X size={14} />
            Era un accidente — cancelar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SosModal;
