
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Trash2 } from 'lucide-react';
import { Playbook, PlaybookStep, ColumnData, Task, Id } from '@/types';
import { ui } from '@/src/lib/uiStyles';

interface CreateEditPlaybookModalProps {
    playbook: Playbook | null;
    pipelineColumns: ColumnData[];
    onClose: () => void;
    onSubmit: (playbook: Playbook) => void;
}

const taskTypes: Task['type'][] = ['task', 'email', 'call', 'meeting', 'note'];

const CreateEditPlaybookModal: React.FC<CreateEditPlaybookModalProps> = ({ playbook, pipelineColumns, onClose, onSubmit }) => {
    const [name, setName] = useState('');
    const [stages, setStages] = useState<Id[]>([]);
    const [steps, setSteps] = useState<PlaybookStep[]>([{ day: 1, type: 'email', instructions: '' }]);
    const isEditMode = !!playbook;

    useEffect(() => {
        if (playbook) {
            setName(playbook.name);
            setStages(playbook.stages);
            setSteps(playbook.steps.length > 0 ? playbook.steps : [{ day: 1, type: 'email', instructions: '' }]);
        }
    }, [playbook]);

    const handleStageToggle = (stageId: Id) => {
        setStages(prev => prev.includes(stageId) ? prev.filter(id => id !== stageId) : [...prev, stageId]);
    };

    const handleStepChange = (index: number, field: keyof PlaybookStep, value: string | number) => {
        const newSteps = [...steps];
        const stepToUpdate = { ...newSteps[index] };

        if (field === 'day') {
            stepToUpdate.day = Math.max(1, Number(value));
        } else if (field === 'type') {
            stepToUpdate.type = value as Task['type'];
        } else { // instructions
            stepToUpdate.instructions = value as string;
        }

        newSteps[index] = stepToUpdate;
        setSteps(newSteps);
    };

    const addStep = () => {
        const lastDay = steps.length > 0 ? steps[steps.length - 1].day : 0;
        setSteps([...steps, { day: lastDay + 1, type: 'task', instructions: '' }]);
    };

    const removeStep = (index: number) => {
        if (steps.length > 1) {
            setSteps(steps.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || stages.length === 0) {
            alert('Por favor, preencha o nome e selecione ao menos um estágio.');
            return;
        }
        onSubmit({
            id: playbook?.id || `temp-${Date.now()}`,
            name,
            stages,
            steps,
        });
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`${ui.modalContainer} w-full max-w-2xl`}
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 border-b border-slate-800">
                    <div className="flex justify-between items-start">
                        <h2 className="text-xl font-bold text-white">{isEditMode ? 'Editar Playbook' : 'Novo Playbook'}</h2>
                        <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-800"><X className="w-5 h-5" /></button>
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                    <div className="p-6 space-y-6 overflow-y-auto">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Nome do Playbook</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} required className={ui.input} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Estágios do Pipeline</label>
                            <div className="flex flex-wrap gap-2">
                                {pipelineColumns.map(col => (
                                    <button type="button" key={col.id} onClick={() => handleStageToggle(col.id)}
                                        className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${stages.includes(col.id) ? 'text-white border-violet-500' : 'text-slate-300 border-slate-600 hover:border-slate-500'}`}
                                        style={stages.includes(col.id) ? { backgroundColor: `${col.color}40`, borderColor: col.color } : {}}>
                                        {col.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Etapas da Cadência</label>
                            <div className="space-y-3">
                                {steps.map((step, index) => (
                                    <div key={index} className="flex items-center gap-2 p-2 bg-slate-900/50 rounded-lg border border-white/10">
                                        <div className="flex items-center gap-1">
                                            <span className="text-sm text-slate-400">D+</span>
                                            <input type="number" value={step.day} onChange={e => handleStepChange(index, 'day', e.target.value)} className="w-16 bg-slate-900/50 border border-white/10 rounded-lg px-2 py-1 text-sm text-white" min="1" />
                                        </div>
                                        <select value={step.type} onChange={e => handleStepChange(index, 'type', e.target.value)} className="bg-slate-900/50 border border-white/10 rounded-lg px-2 py-1 text-sm text-white">
                                            {taskTypes.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                                        </select>
                                        <input type="text" value={step.instructions} onChange={e => handleStepChange(index, 'instructions', e.target.value)} placeholder="Instruções da tarefa..." className="flex-1 bg-slate-900/50 border border-white/10 rounded-lg px-2 py-1 text-sm text-white" />
                                        <button type="button" onClick={() => removeStep(index)} disabled={steps.length <= 1} className="p-2 text-slate-500 hover:text-red-500 disabled:opacity-50"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                            <button type="button" onClick={addStep} className="mt-3 flex items-center gap-2 text-sm font-semibold text-sky-400 hover:text-sky-300">
                                <Plus className="w-4 h-4" /> Adicionar Etapa
                            </button>
                        </div>
                    </div>
                    <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-300 border border-white/10 rounded-lg hover:bg-white/5 transition-colors">Cancelar</button>
                        <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">{isEditMode ? 'Salvar Alterações' : 'Criar Playbook'}</button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default CreateEditPlaybookModal;
