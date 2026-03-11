import React from 'react';
import { motion } from 'framer-motion';
import { X, Bot, Sparkles, Settings } from 'lucide-react';

interface SdrBotModalProps {
    onClose: () => void;
    onGoToSettings: () => void;
}

const SdrBotModal: React.FC<SdrBotModalProps> = ({ onClose, onGoToSettings }) => {
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm p-4" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-slate-950 w-full max-w-md rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/20">
                            <Bot className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white leading-tight">SDR Bot</h3>
                            <p className="text-xs text-slate-400">Pré-vendas e Qualificação</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body (Chat Area) */}
                <div className="flex-1 p-6 overflow-y-auto bg-slate-950 flex flex-col gap-6">
                    
                    {/* Bot Message */}
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 mt-1">
                            <Bot className="w-4 h-4 text-violet-400" />
                        </div>
                        <div>
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none p-4 text-slate-300 text-sm leading-relaxed shadow-sm">
                                <p>Olá! 👋 Para começar a usar a inteligência artificial, você precisa configurar uma chave de API.</p>
                                <p className="mt-2">Use o botão abaixo para ir às configurações.</p>
                            </div>
                            <span className="text-[10px] text-slate-600 mt-1 ml-1 block">SDR Bot</span>
                        </div>
                    </div>

                    {/* Configuration Card (CTA) */}
                    <div className="mt-auto">
                        <div className="bg-gradient-to-b from-slate-900 to-slate-900/50 border border-slate-800 rounded-xl p-5 shadow-lg">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-900/20">
                                    <Sparkles className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-base">Configure a Inteligência Artificial</h4>
                                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                        Para usar o assistente de IA, você precisa configurar uma chave de API. Suportamos <strong className="text-slate-300">Google Gemini</strong>, <strong className="text-slate-300">OpenAI</strong> e <strong className="text-slate-300">Anthropic</strong>.
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={onGoToSettings}
                                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg font-semibold text-sm transition-all shadow-md shadow-blue-900/10 active:scale-[0.98]"
                            >
                                <Settings className="w-4 h-4" />
                                Ir para Configurações
                            </button>
                        </div>
                    </div>

                </div>
            </motion.div>
        </div>
    );
};

export default SdrBotModal;