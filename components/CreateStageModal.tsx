
import React, { useState, FormEvent, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { ColumnData, Id } from '../types';

interface CreateStageModalProps {
  onClose: () => void;
  onSubmit: (data: { id?: Id, title: string, color: string, type: ColumnData['type'] }) => void;
  stageToEdit?: ColumnData | null;
}

const typeOptions: { value: ColumnData['type']; label: string }[] = [
    { value: 'open', label: 'Abertura' },
    { value: 'follow-up', label: 'Follow-up' },
    { value: 'scheduling', label: 'Agendamento' },
    { value: 'won', label: 'Ganho' },
    { value: 'lost', label: 'Perda' },
];

const CreateStageModal: React.FC<CreateStageModalProps> = ({ onClose, onSubmit, stageToEdit }) => {
    const [title, setTitle] = useState('');
    const [color, setColor] = useState('#3b82f6');
    const [type, setType] = useState<ColumnData['type']>('open');
    const isEditMode = !!stageToEdit;

    useEffect(() => {
        if (stageToEdit) {
            setTitle(stageToEdit.title);
            setColor(stageToEdit.color);
            setType(stageToEdit.type || 'open');
        }
    }, [stageToEdit]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            alert('Por favor, insira um nome para o estágio.');
            return;
        }
        onSubmit({ id: stageToEdit?.id, title, color, type });
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-800 flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="px-6 py-5 border-b border-slate-800 flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-white">{isEditMode ? 'Editar Estágio' : 'Criar Novo Estágio'}</h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {isEditMode ? 'Atualize as informações do estágio.' : 'Adicione uma nova etapa ao seu funil de vendas.'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-5">
                        <div>
                            <label htmlFor="stage-name" className="block text-sm font-medium text-slate-300 mb-2">
                                Nome do Estágio
                            </label>
                            <input
                                type="text"
                                id="stage-name"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Ex: Qualificação"
                                required
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="stage-color" className="block text-sm font-medium text-slate-300 mb-2">
                                Cor
                            </label>
                            <div className="flex items-center gap-3">
                                <div className="relative w-11 h-[38px] shrink-0">
                                    <input
                                        type="color"
                                        id="stage-color"
                                        value={color}
                                        onChange={(e) => setColor(e.target.value)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div
                                        className="w-full h-full rounded-lg border-2 border-slate-700 shadow-inner"
                                        style={{ backgroundColor: color }}
                                        aria-hidden="true"
                                    />
                                </div>
                                <input
                                    type="text"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                                />
                            </div>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-slate-300 mb-2">
                                Tipo de Estágio
                            </label>
                            <div className="flex gap-1 rounded-xl bg-slate-950 p-1 border border-slate-800">
                                {typeOptions.map(option => (
                                    <button
                                        type="button"
                                        key={option.value}
                                        onClick={() => setType(option.value)}
                                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 ${
                                            type === option.value
                                                ? 'bg-slate-700 text-white shadow-sm'
                                                : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-300 border border-slate-700 rounded-xl hover:bg-slate-800 transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-500 rounded-xl hover:shadow-[0_0_18px_rgba(29,161,242,0.45)] hover:-translate-y-0.5 transition-all duration-200">
                            {isEditMode ? 'Salvar Alterações' : 'Criar Estágio'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default CreateStageModal;
