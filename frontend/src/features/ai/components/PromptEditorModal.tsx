import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PromptEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  toolName: string;
  initialPrompt: string;
  onSave: (newPrompt: string) => void;
}

export const PromptEditorModal: React.FC<PromptEditorModalProps> = ({ 
  isOpen, 
  onClose, 
  toolName, 
  initialPrompt, 
  onSave 
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between p-6 border-b border-white/5">
            <div>
              <h2 className="text-xl font-bold text-white">Editar Prompt</h2>
              <p className="text-sm text-slate-400">{toolName}</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/5 text-slate-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-[400px] bg-black/20 border border-white/5 rounded-xl p-4 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all resize-none"
              placeholder="Digite o prompt base aqui..."
            />
            <p className="mt-3 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
              Use variáveis como {"{{variable}}"} para substituição dinâmica.
            </p>
          </div>

          <div className="flex items-center justify-end gap-4 p-6 bg-white/5 border-t border-white/5">
            <button
              onClick={onClose}
              className="px-6 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                onSave(prompt);
                onClose();
              }}
              className="flex items-center gap-2 px-6 py-2 bg-sky-500 hover:bg-sky-400 text-white text-sm font-bold rounded-xl shadow-lg shadow-sky-500/20 transition-all active:scale-[0.98]"
            >
              <Save className="w-4 h-4" />
              Salvar Alterações
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
