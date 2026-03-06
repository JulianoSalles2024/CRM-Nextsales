import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/features/auth/AuthContext';

interface OnboardingModalProps {
    onOpenCreateBoard: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ onOpenCreateBoard }) => {
    const { user, currentUserRole, isRoleReady } = useAuth();
    const [visible, setVisible] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isRoleReady || currentUserRole !== 'seller' || !user?.id) return;

        supabase
            .from('profiles')
            .select('has_seen_onboarding')
            .eq('id', user.id)
            .single()
            .then(({ data }) => {
                if (data && !data.has_seen_onboarding) setVisible(true);
            });
    }, [isRoleReady, currentUserRole, user?.id]);

    const markSeen = async () => {
        if (!user?.id) return;
        setSaving(true);
        await supabase
            .from('profiles')
            .update({ has_seen_onboarding: true })
            .eq('id', user.id);
        setSaving(false);
        setVisible(false);
    };

    const handleCreate = async () => {
        await markSeen();
        onOpenCreateBoard();
    };

    const handleSkip = async () => {
        await markSeen();
    };

    const steps = [
        'Criar sua pipeline',
        'Adicionar seu primeiro lead',
        'Acompanhar oportunidades no Kanban',
    ];

    return (
        <AnimatePresence>
            {visible && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 16 }}
                        transition={{ duration: 0.22 }}
                        className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-8 pb-6 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-5">
                                <Rocket className="w-7 h-7 text-blue-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Bem-vindo ao seu CRM</h2>
                            <p className="text-slate-400 mt-2 text-sm leading-relaxed">
                                Vamos configurar sua primeira pipeline de vendas em menos de 1 minuto.
                            </p>
                        </div>

                        {/* Checklist */}
                        <div className="px-8 pb-6">
                            <div className="space-y-3">
                                {steps.map((step, i) => (
                                    <div key={i} className="flex items-center gap-3 bg-slate-800/50 rounded-xl px-4 py-3 border border-slate-700/50">
                                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-bold shrink-0">
                                            {i + 1}
                                        </div>
                                        <span className="text-sm text-slate-300">{step}</span>
                                        <CheckCircle2 className="w-4 h-4 text-slate-700 ml-auto shrink-0" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="px-8 pb-8 flex flex-col gap-3">
                            <button
                                onClick={handleCreate}
                                disabled={saving}
                                className="w-full py-3 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {saving
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <Rocket className="w-4 h-4" />
                                }
                                Criar minha pipeline
                            </button>
                            <button
                                onClick={handleSkip}
                                disabled={saving}
                                className="w-full py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-300 transition-colors disabled:opacity-50"
                            >
                                Pular por enquanto
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default OnboardingModal;
