import { useState } from "react";
import { Filter, ChevronDown, Check, Globe, GraduationCap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFilter } from "@/contexts/FilterContext";
import { ACADEMIC_DOMAINS } from "@/utils/academicDomains";

const UniversitySelector = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { selectedDomain, setSelectedDomain } = useFilter();

    const allInstitutions = [
        ...ACADEMIC_DOMAINS.universities,
        ...ACADEMIC_DOMAINS.prepas
    ].sort((a, b) => a.name.localeCompare(b.name));

    const getCurrentLabel = () => {
        if (selectedDomain === 'mine') return "Mi Universidad";
        if (selectedDomain === 'all') return "Todas las Sedes";
        const found = allInstitutions.find(i => i.domain === selectedDomain);
        return found ? found.name : selectedDomain;
    };

    return (
        <div className="relative z-40">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs font-medium text-white backdrop-blur-md transition-all hover:bg-white/5 active:scale-95"
            >
                <Filter size={14} className="text-spot-lime" />
                <span className="font-mono uppercase tracking-wider">{getCurrentLabel()}</span>
                <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 mt-2 w-64 origin-top-right overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl z-50"
                        >
                            <div className="max-h-80 overflow-y-auto p-2 scrollbar-hide">
                                <button
                                    onClick={() => { setSelectedDomain('mine'); setIsOpen(false); }}
                                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/5"
                                >
                                    <div className="flex items-center gap-3">
                                        <GraduationCap size={16} className="text-spot-lime" />
                                        <span className="font-medium text-white">Mi Universidad</span>
                                    </div>
                                    {selectedDomain === 'mine' && <Check size={14} className="text-spot-lime" />}
                                </button>

                                <button
                                    onClick={() => { setSelectedDomain('all'); setIsOpen(false); }}
                                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/5"
                                >
                                    <div className="flex items-center gap-3">
                                        <Globe size={16} className="text-blue-400" />
                                        <span className="font-medium text-white">Todas las Sedes</span>
                                    </div>
                                    {selectedDomain === 'all' && <Check size={14} className="text-spot-lime" />}
                                </button>

                                <div className="my-2 border-t border-white/5 px-3 py-2">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Explorar Otras</span>
                                </div>

                                {allInstitutions.map((inst, idx) => (
                                    <button
                                        key={`${inst.domain}-${idx}`}
                                        onClick={() => { setSelectedDomain(inst.domain); setIsOpen(false); }}
                                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-white/5"
                                    >
                                        <span className="text-zinc-300 truncate pr-2">{inst.name}</span>
                                        {selectedDomain === inst.domain && <Check size={14} className="text-spot-lime" />}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UniversitySelector;
