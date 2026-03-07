import { AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

interface SosButtonProps {
    onClick: () => void;
}

const SosButton = ({ onClick }: SosButtonProps) => {
    return (
        <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClick}
            className="fixed bottom-20 left-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-spot-red text-white shadow-[0_0_20px_rgba(255,49,49,0.5)] transition-shadow hover:shadow-[0_0_30px_rgba(255,49,49,0.8)]"
        >
            <AlertTriangle size={24} className="animate-pulse" />
        </motion.button>
    );
};

export default SosButton;
