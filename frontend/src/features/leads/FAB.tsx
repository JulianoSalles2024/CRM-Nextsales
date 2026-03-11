
import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, TrendingUp, User, ClipboardList } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FABProps {
    onOpenCreateLeadModal: () => void;
    onOpenCreateTaskModal: () => void;
}

const FAB: React.FC<FABProps> = ({ onOpenCreateLeadModal, onOpenCreateTaskModal }) => {
    const [isOpen, setIsOpen] = useState(false);
    const fabRef = useRef<HTMLDivElement>(null);

    const menuItems = [
        { label: 'Nova Atividade', icon: ClipboardList, action: onOpenCreateTaskModal },
        { label: 'Novo Cliente', icon: User, action: onOpenCreateLeadModal },
        { label: 'Novo Lead', icon: TrendingUp, action: onOpenCreateLeadModal },
    ];

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const containerVariants = {
        closed: { height: 64 },
        open: { height: 64 + menuItems.length * 56 },
    };
    
    const itemVariants = {
        closed: { opacity: 0, y: 10, scale: 0.9 },
        open: { opacity: 1, y: 0, scale: 1 },
    };

    return (
        <div ref={fabRef} className="fixed bottom-8 right-8 z-40">
            <motion.div
                className="relative flex flex-col items-end gap-3"
                animate={isOpen ? 'open' : 'closed'}
            >
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            className="flex flex-col items-end gap-3"
                            initial="closed"
                            animate="open"
                            exit="closed"
                            variants={{
                                open: { transition: { staggerChildren: 0.07, delayChildren: 0.2 } },
                                closed: { transition: { staggerChildren: 0.05, staggerDirection: -1 } },
                            }}
                        >
                            {menuItems.map((item, index) => (
                                <motion.div
                                    key={index}
                                    className="flex items-center gap-3 cursor-pointer group"
                                    onClick={() => { item.action(); setIsOpen(false); }}
                                    variants={itemVariants}
                                >
                                    <span className="bg-slate-900 text-white text-sm px-3 py-2 rounded-md shadow-lg border border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                        {item.label}
                                    </span>
                                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-white hover:bg-slate-700 transition-colors shadow-md">
                                        <item.icon className="w-6 h-6" />
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
                
                <button
                    onClick={() => setIsOpen(prev => !prev)}
                    className="w-16 h-16 bg-gradient-to-r from-sky-500 to-blue-500 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-[0_0_24px_rgba(29,161,242,0.5)] transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-sky-500/50"
                    aria-label={isOpen ? "Fechar menu" : "Abrir menu de criação rápida"}
                >
                    <AnimatePresence initial={false}>
                        <motion.div
                            key={isOpen ? "x" : "plus"}
                            initial={{ rotate: -45, opacity: 0, scale: 0.5 }}
                            animate={{ rotate: 0, opacity: 1, scale: 1 }}
                            exit={{ rotate: 45, opacity: 0, scale: 0.5 }}
                            transition={{ duration: 0.2 }}
                            className="absolute"
                        >
                            {isOpen ? <X className="w-8 h-8" /> : <Plus className="w-8 h-8" />}
                        </motion.div>
                    </AnimatePresence>
                </button>
            </motion.div>
        </div>
    );
};

export default FAB;
