
import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface SampleDataPromptProps {
  onConfirm: () => Promise<void>;
  onDismiss: () => void;
}

const SampleDataPrompt: React.FC<SampleDataPromptProps> = ({ onConfirm, onDismiss }) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleConfirm = async () => {
        setIsLoading(true);
        await onConfirm();
        // The component will be unmounted by parent state change, so no need to setIsLoading(false)
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg"
        >
            <div className="bg-slate-900/90 backdrop-blur-lg border border-slate-800 rounded-xl shadow-2xl p-6 mx-4 flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-violet-900/50 text-violet-400 rounded-full flex items-center justify-center">
                    <Sparkles className="w-6 h-6" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-bold text-white">Bem-vindo ao seu novo CRM!</h3>
                    <p className="text-sm text-slate-400 mt-1">Gostaria de adicionar dados de exemplo para explorar as funcionalidades?</p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-3 mt-4 sm:mt-0">
                    <button
                        onClick={onDismiss}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-semibold text-slate-300 bg-slate-800 rounded-md hover:bg-slate-700 transition-colors disabled:opacity-50"
                    >
                        Não, obrigado
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-500 rounded-md hover:shadow-[0_0_18px_rgba(29,161,242,0.45)] hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sim, por favor'}
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default SampleDataPrompt;
