
import React, { useState, FormEvent, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Archive, RefreshCw, Calendar } from 'lucide-react';
import type { Lead } from '@/types';

interface LostLeadModalProps {
  lead: Lead;
  onClose: () => void;
  onSubmit: (reason: string, reactivationDate: string | null) => void;
}

const lossReasons = ['Preço', 'Timing', 'Concorrência', 'Sem Resposta', 'Outro'];

const LostLeadModal: React.FC<LostLeadModalProps> = ({ lead, onClose, onSubmit }) => {
  const [reason, setReason] = useState(lossReasons[0]);
  const [customReason, setCustomReason] = useState('');
  const [actionType, setActionType] = useState<'archive' | 'recovery'>('archive');
  const [reactivationDate, setReactivationDate] = useState('');

  // Set default reactivation date to 30 days from now
  useEffect(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    setReactivationDate(date.toISOString().split('T')[0]);
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const finalReason = reason === 'Outro' ? customReason : reason;
    if (!finalReason) {
        alert('Por favor, especifique o motivo da perda.');
        return;
    }

    // If recovery is selected, pass the date. If archive, pass null.
    onSubmit(finalReason, actionType === 'recovery' ? reactivationDate : null);
  };

  const inputCls = 'w-full bg-[#0B1220] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors [color-scheme:dark]';

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0B1220] rounded-2xl shadow-xl w-full max-w-lg border border-slate-800 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-800 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-white">Processar Lead Perdido</h2>
            <p className="text-sm text-slate-400 mt-1">{lead.name} - {lead.company}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5">

            {/* Motivo da Perda */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Motivo da Perda <span className="text-red-500">*</span>
              </label>
              <select value={reason} onChange={e => setReason(e.target.value)} className={inputCls}>
                {lossReasons.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              {reason === 'Outro' && (
                <input
                  type="text"
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  placeholder="Especifique o motivo..."
                  className={`mt-2 ${inputCls}`}
                />
              )}
            </div>

            {/* Próximo Passo */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">Próximo Passo</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setActionType('archive')}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                    actionType === 'archive'
                      ? 'border-sky-500 bg-sky-500/10 text-white'
                      : 'border-white/10 bg-[#0F172A] text-slate-400 hover:border-sky-500/40'
                  }`}
                >
                  <Archive className="w-6 h-6 mb-2" />
                  <span className="text-sm font-semibold">Encerrar</span>
                  <span className="text-xs opacity-70 mt-1">Sem contato futuro</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActionType('recovery')}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                    actionType === 'recovery'
                      ? 'border-sky-500 bg-sky-500/10 text-white'
                      : 'border-white/10 bg-[#0F172A] text-slate-400 hover:border-sky-500/40'
                  }`}
                >
                  <RefreshCw className="w-6 h-6 mb-2" />
                  <span className="text-sm font-semibold">Recuperação</span>
                  <span className="text-xs opacity-70 mt-1">Tentar novamente</span>
                </button>
              </div>
            </div>

            {/* Data de Reativação */}
            {actionType === 'recovery' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-[#0F172A] border border-white/5 rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-sky-400" />
                  <label htmlFor="reactivationDate" className="block text-sm font-medium text-slate-300">
                    Data de Reativação
                  </label>
                </div>
                <input
                  type="date"
                  id="reactivationDate"
                  value={reactivationDate}
                  onChange={e => setReactivationDate(e.target.value)}
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className={inputCls}
                />
                <p className="text-xs text-slate-500 mt-2">
                  O lead aparecerá na aba "Recuperação" nesta data.
                </p>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-300 border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${
                actionType === 'recovery'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-slate-600 hover:bg-slate-500'
              }`}
            >
              {actionType === 'recovery' ? 'Salvar na Recuperação' : 'Confirmar Encerramento'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default LostLeadModal;
