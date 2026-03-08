import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { LucideIcon } from "lucide-react";

interface WidgetProps {
    title: string;
    icon: LucideIcon;
    linkTo?: string;
    children: React.ReactNode;
    span?: string;
}

const Widget = ({ title, icon: Icon, linkTo, children, span = "" }: WidgetProps) => {
    const navigate = useNavigate();
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex flex-col rounded-2xl border border-border bg-card overflow-hidden ${span}`}
        >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="flex items-center gap-2 font-bebas text-base tracking-wider text-foreground">
                    <Icon size={15} className="text-spot-lime" />
                    {title}
                </span>
                {linkTo && (
                    <button
                        onClick={() => navigate(linkTo)}
                        className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/50 hover:text-spot-lime transition-colors"
                    >
                        Ver todo →
                    </button>
                )}
            </div>
            <div className="flex-1 overflow-hidden p-4">{children}</div>
        </motion.div>
    );
};

export default Widget;
