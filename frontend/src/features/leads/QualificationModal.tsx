import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';

interface QualificationModalProps {
    leadName: string;
    onClose: () => void;
    onConfirm: (status: 'qualified' | 'disqualified', reason?: string) => void;
}

const disqualificationReasons = [
    'Sem Orçamento',
    'Fora do Perfil Ideal',
    'Sem Interesse',
    'Timing Incorreto',
    'Concorrência',
    'Outro'
];

const QualificationModal: React.FC<QualificationModalProps> = ({ leadName, onClose, onConfirm }) => {
    const [decision, setDecision] = useState<'qualified' | 'disqualified' | null>(null);
    const [reason, setReason] = useState('');

    const handleConfirm = () => {
        if (decision === 'qualified') {
            onConfirm('qualified');
        } else if (decision === 'disqualified') {
            if (!reason) {
                alert('Por favor, selecione um motivo para a desqualificação.');
                return;
            }
            onConfirm('disqualified', reason);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-zinc-800 rounded-lg shadow-xl w-full max-w-md border border-zinc-700 flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 text-center">
                    <div className="mx-auto w-12 h-12 bg-violet-900/50 rounded-full flex items-center justify-center mb-4">
                        <ShieldAlert className="w-6 h-6 text-violet-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Qualificar Lead</h2>
                    <p className="text-zinc-400 text-sm">
                        O lead <span className="font-semibold text-white">{leadName}</span> está avançando. Ele atende aos critérios de qualificação?
                    </p>
                </div>

                <div className="px-6 pb-6 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => { setDecision('qualified'); setReason(''); }}
                            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${decision === 'qualified' ? 'border-green-500 bg-green-500/10' : 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700'}`}
                        >
                            <ShieldCheck className={`w-6 h-6 mb-2 ${decision === 'qualified' ? 'text-green-500' : 'text-zinc-400'}`} />
                            <span className={`text-sm font-semibold ${decision === 'qualified' ? 'text-green-400' : 'text-zinc-300'}`}>Qualificado</span>
                        </button>
                        <button
                            onClick={() => setDecision('disqualified')}
                            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${decision === 'disqualified' ? 'border-red-500 bg-red-500/10' : 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700'}`}
                        >
                            <ShieldX className={`w-6 h-6 mb-2 ${decision === 'disqualified' ? 'text-red-500' : 'text-zinc-400'}`} />
                            <span className={`text-sm font-semibold ${decision === 'disqualified' ? 'text-red-400' : 'text-zinc-300'}`}>Não Qualificado</span>
                        </button>
                    </div>

                    {decision === 'disqualified' && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
                            <label className="block text-sm font-medium text-zinc-300">Motivo da Desqualificação</label>
                            <select
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                            >
                                <option value="" disabled>Selecione um motivo...</option>
                                {disqualificationReasons.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </motion.div>
                    )}
                </div>

                <div className="p-4 bg-zinc-800/50 border-t border-zinc-700 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-zinc-300 bg-zinc-700 rounded-md hover:bg-zinc-600 transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!decision || (decision === 'disqualified' && !reason)}
                        className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-500 rounded-md hover:shadow-[0_0_18px_rgba(29,161,242,0.45)] hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Confirmar
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default QualificationModal;