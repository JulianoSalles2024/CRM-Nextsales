
import React, { useState, FormEvent, useEffect, ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { Task, CreateTaskData, UpdateTaskData, Lead, Id } from '@/types';

interface CreateEditTaskModalProps {
  task: Task | null;
  leads: Lead[];
  preselectedLeadId?: Id | null;
  preselectedDate?: string | null;
  onClose: () => void;
  onSubmit: (data: CreateTaskData | UpdateTaskData) => void;
}

type FormData = {
    type: Task['type'];
    title: string;
    description: string;
    dueDate: string;
    leadId: Id;
}

const activityTypes: { value: Task['type']; label: string }[] = [
    { value: 'task', label: 'Tarefa' },
    { value: 'email', label: 'Email' },
    { value: 'call', label: 'Ligação' },
    { value: 'meeting', label: 'Reunião' },
    { value: 'note', label: 'Nota' },
];

const CreateEditTaskModal: React.FC<CreateEditTaskModalProps> = ({ task, leads, preselectedLeadId, preselectedDate, onClose, onSubmit }) => {
    const today = new Date().toISOString().split('T')[0];

    const [formData, setFormData] = useState<FormData>({
        type: 'task',
        title: '',
        description: '',
        dueDate: preselectedDate || today,
        leadId: preselectedLeadId || (leads.length > 0 ? leads[0].id : ''),
    });

  useEffect(() => {
    if (task) {
      setFormData({
        type: task.type || 'task',
        title: task.title || '',
        description: task.description || '',
        dueDate: new Date(task.dueDate).toISOString().split('T')[0],
        leadId: task.leadId || '',
      });
    } else {
        setFormData({
            type: 'task',
            title: '',
            description: '',
            dueDate: preselectedDate || today,
            leadId: preselectedLeadId || (leads.length > 0 ? leads[0].id : ''),
        });
    }
  }, [task, preselectedLeadId, preselectedDate, leads]);

  const isEditMode = task !== null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.dueDate || !formData.leadId) {
        alert('Por favor, preencha os campos obrigatórios (*).');
        return;
    }

    const dataToSubmit = {
        ...formData,
        status: task?.status || 'pending',
    };

    onSubmit(dataToSubmit);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({...prev, [name]: value as Task['type']}));
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="bg-slate-900 rounded-lg shadow-xl w-full max-w-xl border border-slate-800 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex-shrink-0 p-6 border-b border-slate-800">
          <div className="flex items-start justify-between">
            <div>
                <h2 className="text-xl font-bold text-white">{isEditMode ? 'Editar Atividade' : 'Nova Atividade'}</h2>
                <p className="text-sm text-slate-400 mt-1">{isEditMode ? 'Atualize os detalhes da atividade' : 'Adicione uma nova atividade para acompanhar'}</p>
            </div>
            <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-5">
                 <div>
                    <label htmlFor="type" className="block text-sm font-medium text-slate-300 mb-2">Tipo <span className="text-red-500">*</span></label>
                    <select id="type" name="type" value={formData.type} onChange={handleChange} required
                            className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 appearance-none">
                        {activityTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-2">Título <span className="text-red-500">*</span></label>
                    <input type="text" id="title" name="title" value={formData.title} onChange={handleChange} required placeholder="Ex: Follow-up com cliente..."
                           className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                 <div>
                    <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-2">Descrição</label>
                    <textarea id="description" name="description" value={formData.description} onChange={handleChange} placeholder="Detalhes adicionais..." rows={3}
                              className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                 <div>
                    <label htmlFor="leadId" className="block text-sm font-medium text-slate-300 mb-2">Lead / Cliente <span className="text-red-500">*</span></label>
                    <select id="leadId" name="leadId" value={formData.leadId} onChange={handleChange} required
                            className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 appearance-none">
                        {leads.length > 0 ? (
                            leads.map(lead => <option key={lead.id} value={lead.id}>{lead.name} - {lead.company}</option>)
                        ) : (
                            <option value="" disabled>Nenhum lead disponível</option>
                        )}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">Selecione um lead ou um cliente para vincular esta atividade</p>
                </div>
                 <div>
                    <label htmlFor="dueDate" className="block text-sm font-medium text-slate-300 mb-2">Data de Vencimento <span className="text-red-500">*</span></label>
                    <input type="date" id="dueDate" name="dueDate" value={formData.dueDate} onChange={handleChange} required
                           className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
            </div>
            <div className="flex-shrink-0 p-4 bg-slate-800/50 border-t border-slate-800 flex justify-end gap-3">
                 <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-300 bg-slate-800 rounded-md hover:bg-slate-700 transition-colors">
                    Cancelar
                </button>
                <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-500 rounded-md hover:shadow-[0_0_18px_rgba(29,161,242,0.45)] hover:-translate-y-0.5 transition-all duration-200">
                    {isEditMode ? 'Salvar' : 'Criar'}
                </button>
            </div>
        </form>
      </motion.div>
    </div>
  );
};

export default CreateEditTaskModal;
