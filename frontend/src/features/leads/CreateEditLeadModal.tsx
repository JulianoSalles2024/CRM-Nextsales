
import React, { useState, FormEvent, useEffect, ChangeEvent, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { Lead, CreateLeadData, UpdateLeadData, ColumnData, Id, Tag, Group } from '@/types';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import { ui } from '@/src/lib/uiStyles';

interface CreateEditLeadModalProps {
  lead: Lead | null;
  columns: ColumnData[];
  allTags: Tag[];
  groups: Group[];
  onClose: () => void;
  onSubmit: (data: CreateLeadData | UpdateLeadData) => void;
}

type FormData = {
    name: string;
    description: string;
    email: string;
    phone: string;
    company: string;
    segment: string;
    value: string;
    columnId: Id;
    status: string;
    clientId: string;
    source: string;
    tags: Tag[];
    groupId: Id;
}

const leadSources = [
  "Ligação",
  "Prospecção B2B",
  "Prospecção B2C",
  "Indicação",
  "WhatsApp",
  "E-mail",
  "Formulário do site",
  "Evento",
  "Redes sociais",
];

const InputField: React.FC<{ label: string; name: keyof FormData; value: string; onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void; required?: boolean; placeholder?: string; type?: string; className?: string; maxLength?: number; }> = 
({ label, name, value, onChange, required = false, placeholder, type = 'text', className = 'md:col-span-6', maxLength }) => (
    <div className={className}>
        <label htmlFor={name} className="block text-sm font-medium text-slate-300 mb-2">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        {type === 'textarea' ? (
             <textarea id={name} name={name} value={value} onChange={onChange} placeholder={placeholder} rows={3}
             className={ui.input} />
        ) : (
            <input type={type} id={name} name={name} value={value} onChange={onChange} required={required} placeholder={placeholder} maxLength={maxLength}
            className={ui.input} />
        )}
       
    </div>
);

const SelectField: React.FC<{ label: string; name: keyof FormData; value: Id; onChange: (e: ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode; required?: boolean; className?: string; customElement?: React.ReactNode }> =
({ label, name, value, onChange, children, required = false, className = 'md:col-span-3', customElement }) => (
    <div className={className}>
         <label htmlFor={name} className="block text-sm font-medium text-slate-300 mb-2">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
            {customElement}
            <select id={name} name={name} value={value} onChange={onChange} required={required}
            className={`${ui.input} appearance-none ${customElement ? 'pl-8' : ''}`}>
                {children}
            </select>
        </div>
    </div>
)


const CreateEditLeadModal: React.FC<CreateEditLeadModalProps> = ({ lead, columns, allTags, groups, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    email: '',
    phone: '',
    company: '',
    segment: '',
    value: '0,00',
    columnId: columns[0]?.id || '',
    status: 'Ativo',
    clientId: '',
    source: '',
    tags: [],
    groupId: '',
  });
  
  const [isTagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [initialDataString, setInitialDataString] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const isDirty = useMemo(() => {
    if (!initialDataString) return false;
    // Sort tags before stringifying to ensure consistent order for comparison
    const currentData = { ...formData, tags: [...formData.tags].sort((a, b) => (a.id > b.id ? 1 : -1)) };
    const currentDataString = JSON.stringify(currentData);
    return initialDataString !== currentDataString;
  }, [formData, initialDataString]);

  const applyPhoneMask = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    const len = digits.length;

    if (len === 0) return '';
    if (len <= 2) return `(${digits}`;
    if (len <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    // Branch for landline (10 digits) vs mobile (11 digits)
    if (len <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };


  useEffect(() => {
    const getInitialData = (): FormData => {
        if (lead) {
            return {
                name: lead.name || '',
                description: lead.description || '',
                email: lead.email || '',
                phone: lead.phone || '',
                company: lead.company || '',
                segment: lead.segment || '',
                value: lead.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00',
                columnId: lead.columnId || columns[0]?.id || '',
                status: lead.status || 'Ativo',
                clientId: lead.clientId?.toString() || '',
                source: lead.source || '',
                tags: lead.tags || [],
                groupId: lead.groupInfo?.groupId || '',
            };
        }
        return {
            name: '',
            description: '',
            email: '',
            phone: '',
            company: '',
            segment: '',
            value: '0,00',
            columnId: columns[0]?.id || '',
            status: 'Ativo',
            clientId: '',
            source: '',
            tags: [],
            groupId: '',
        };
    };
    
    const data = getInitialData();
    setFormData(data);
    
    // Sort tags before stringifying to have a consistent initial state for comparison
    const dataForStringify = { ...data, tags: [...data.tags].sort((a, b) => (a.id > b.id ? 1 : -1)) };
    setInitialDataString(JSON.stringify(dataForStringify));
  }, [lead, columns]);
  
   useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (isDirty) {
                event.preventDefault();
                event.returnValue = ''; // Required for Chrome
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isDirty]);

  const isEditMode = lead !== null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const leadValue = parseFloat(formData.value.replace(/\./g, '').replace(',', '.'));
    
    if (!formData.name || isNaN(leadValue) || !formData.columnId) {
        alert('Por favor, preencha os campos obrigatórios (*).');
        return;
    }
    
    const { groupId, ...restOfFormData } = formData;
    
    const dataToSubmit: Omit<UpdateLeadData, 'probability'> = {
        ...restOfFormData,
        value: leadValue,
        clientId: formData.clientId || undefined,
    };
    
    const newGroupId = groupId || undefined;
    const oldGroupInfo = lead?.groupInfo;

    // Only include groupInfo if a group is selected, or if there's history
    if (newGroupId || oldGroupInfo) {
      const isSwitchingGroup = newGroupId && newGroupId !== oldGroupInfo?.groupId;

      dataToSubmit.groupInfo = {
        ...(oldGroupInfo || { hasJoined: false, hasOnboarded: false, churned: false }), // Initial state for a lead never in a group
        hasJoined: oldGroupInfo?.hasJoined || !!newGroupId, // Once joined, always considered to have joined at some point
        groupId: newGroupId,
        isStillInGroup: !!newGroupId,
        // If switching to a new group, reset onboarding status
        hasOnboarded: isSwitchingGroup ? false : (oldGroupInfo?.hasOnboarded || false),
        onboardingCallDate: isSwitchingGroup ? undefined : oldGroupInfo?.onboardingCallDate,
      };
    }
    
    onSubmit(dataToSubmit);
  };
  
   const handleClose = () => {
        if (isDirty) {
            setShowConfirmation(true);
        } else {
            onClose();
        }
    };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'phone') {
        setFormData(prev => ({...prev, phone: applyPhoneMask(value)}));
    } else {
        setFormData(prev => ({...prev, [name]: value}));
    }
  };

  const handleAddTag = (tagToAdd: Tag) => {
    if (!formData.tags.find(t => t.id === tagToAdd.id)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tagToAdd] }));
    }
    setTagDropdownOpen(false);
  };
  
  const handleRemoveTag = (tagToRemove: Tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t.id !== tagToRemove.id),
    }));
  };

  const availableTags = allTags.filter(
    availableTag => !formData.tags.find(selectedTag => selectedTag.id === availableTag.id)
  );

  const selectedColumnColor = columns.find(c => c.id === formData.columnId)?.color || '#808080';

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm" onClick={handleClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={`${ui.modalContainer} w-full max-w-2xl`}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex-shrink-0 p-6 border-b border-slate-800">
            <div className="flex items-start justify-between">
              <div>
                  <h2 className="text-xl font-bold text-white">{isEditMode ? 'Editar Lead' : 'Novo Lead'}</h2>
                  <p className="text-sm text-slate-400 mt-1">Preencha os dados para {isEditMode ? 'editar o lead' : 'criar um novo lead'}</p>
              </div>
              <button onClick={handleClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6 grid grid-cols-1 md:grid-cols-6 gap-x-4 gap-y-5">
                  <InputField label="Nome" name="name" value={formData.name} onChange={handleChange} required placeholder="Nome do lead..." className="md:col-span-6" />

                  <InputField label="E-mail" name="email" value={formData.email} onChange={handleChange} placeholder="email@exemplo.com" type="email" className="md:col-span-3" />
                  <InputField label="Telefone" name="phone" value={formData.phone} onChange={handleChange} placeholder="(11) 99999-9999" className="md:col-span-3" maxLength={15} />

                  <div className="md:col-span-3">
                      <label htmlFor="source" className="block text-sm font-medium text-slate-300 mb-2">Origem</label>
                      <select
                          id="source"
                          name="source"
                          value={formData.source}
                          onChange={handleChange}
                          className={`${ui.input} appearance-none`}
                      >
                          <option value="">Selecione a origem do lead</option>
                          {leadSources.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                  </div>

                  <SelectField label="Grupo" name="groupId" value={formData.groupId} onChange={handleChange} className="md:col-span-3">
                      <option value="">Nenhum</option>
                      {groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
                  </SelectField>

                  <InputField label="Valor (R$)" name="value" value={formData.value} onChange={handleChange} required type="text" className="md:col-span-3" />

                  <SelectField label="Estágio" name="columnId" value={formData.columnId} onChange={handleChange} required className="md:col-span-3"
                      customElement={<div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full" style={{ backgroundColor: selectedColumnColor }} />}>
                      {columns.map(col => <option key={col.id} value={col.id}>{col.title}</option>)}
                  </SelectField>

                  <SelectField label="Status" name="status" value={formData.status} onChange={handleChange} className="md:col-span-3">
                      <option value="Ativo">Ativo</option>
                      <option value="Inativo">Inativo</option>
                  </SelectField>

                  <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-slate-300 mb-2">Tags</label>
                      <div className="flex flex-wrap gap-2 items-center p-2 bg-slate-900/50 border border-slate-800 rounded-lg min-h-[42px]">
                          {formData.tags.map(tag => (
                              <span key={tag.id} className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full text-white/90" style={{ backgroundColor: tag.color }}>
                                  {tag.name}
                                  <button type="button" onClick={() => handleRemoveTag(tag)} className="text-white/70 hover:text-white">
                                      <X className="w-3 h-3" />
                                  </button>
                              </span>
                          ))}
                          <div className="relative">
                              <button type="button" onClick={() => setTagDropdownOpen(p => !p)} className="text-sm text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-md">
                                  + Adicionar
                              </button>
                              {isTagDropdownOpen && (
                                  <div className="absolute top-full left-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                                      {availableTags.length > 0 ? availableTags.map(tag => (
                                          <button
                                              key={tag.id}
                                              type="button"
                                              onClick={() => handleAddTag(tag)}
                                              className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-2"
                                          >
                                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }}></span>
                                            <span>{tag.name}</span>
                                          </button>
                                      )) : (
                                        <div className="px-3 py-2 text-sm text-slate-400">Nenhuma tag disponível</div>
                                      )}
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
              <div className="flex-shrink-0 px-6 py-4 border-t border-slate-800 flex justify-end gap-3">
                  <button type="button" onClick={handleClose} className={ui.buttonSecondary}>
                      Cancelar
                  </button>
                  <button type="submit" className={ui.buttonPrimary}>
                      {isEditMode ? 'Salvar Alterações' : 'Criar Lead'}
                  </button>
              </div>
          </form>
        </motion.div>
      </div>
      <AnimatePresence>
        {showConfirmation && (
            <ConfirmDeleteModal
                onClose={() => setShowConfirmation(false)}
                onConfirm={onClose}
                title="Descartar alterações?"
                message="Você tem alterações não salvas. Tem certeza que deseja sair sem salvar?"
                confirmText="Descartar"
                confirmVariant="danger"
            />
        )}
      </AnimatePresence>
    </>
  );
};

export default CreateEditLeadModal;
