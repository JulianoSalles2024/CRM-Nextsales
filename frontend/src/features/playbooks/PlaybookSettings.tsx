import React, { useState, useMemo } from 'react';
import { Playbook, Id, ColumnData } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle, Edit, Trash2, MoreVertical, FileText, ChevronDown } from 'lucide-react';
import CreateEditPlaybookModal from './CreateEditPlaybookModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import FlatCard from '@/components/ui/FlatCard';

interface PlaybookSettingsProps {
    initialPlaybooks: Playbook[];
    pipelineColumns: ColumnData[];
    onSave: (playbooks: Playbook[]) => void;
}

const PlaybookSettings: React.FC<PlaybookSettingsProps> = ({ initialPlaybooks, pipelineColumns, onSave }) => {
    const [playbooks, setPlaybooks] = useState(initialPlaybooks);
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingPlaybook, setEditingPlaybook] = useState<Playbook | null>(null);
    const [playbookToDelete, setPlaybookToDelete] = useState<Id | null>(null);
    const [expandedPlaybookId, setExpandedPlaybookId] = useState<Id | null>(null);

    const columnMap = useMemo(() => new Map(pipelineColumns.map(c => [c.id, c])), [pipelineColumns]);

    const handleOpenModal = (playbook: Playbook | null = null) => {
        setEditingPlaybook(playbook);
        setModalOpen(true);
    };

    const handleSavePlaybook = (playbookData: Playbook) => {
        let updatedPlaybooks;
        if (editingPlaybook) {
            updatedPlaybooks = playbooks.map(p => p.id === playbookData.id ? playbookData : p);
        } else {
            updatedPlaybooks = [...playbooks, { ...playbookData, id: `playbook-${Date.now()}` }];
        }
        setPlaybooks(updatedPlaybooks);
        onSave(updatedPlaybooks);
        setModalOpen(false);
        setEditingPlaybook(null);
    };

    const handleDeletePlaybook = () => {
        if (!playbookToDelete) return;
        const updatedPlaybooks = playbooks.filter(p => p.id !== playbookToDelete);
        setPlaybooks(updatedPlaybooks);
        onSave(updatedPlaybooks);
        setPlaybookToDelete(null);
    };

    return (
        <>
            <FlatCard>
                <div className="px-6 py-4 border-b border-slate-800">
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-1 mb-2">
                                <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border bg-blue-950/40 border-blue-500/30 text-blue-400 shadow-sm shadow-blue-900/20 cursor-default">
                                    <FileText className="w-4 h-4 flex-shrink-0" />
                                    <span>Playbooks</span>
                                </button>
                            </div>
                            <p className="text-sm text-slate-400">Crie e gerencie sequências de tarefas automatizadas para seus leads.</p>
                        </div>
                        <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-500 text-white px-4 py-2 rounded-md text-sm font-semibold hover:shadow-[0_0_18px_rgba(29,161,242,0.45)] hover:-translate-y-0.5 transition-all duration-200">
                            <PlusCircle className="w-4 h-4" />
                            <span>Novo Playbook</span>
                        </button>
                    </div>
                </div>
                <div className="p-6">
                <div className="space-y-3">
                    {playbooks.length > 0 ? (
                        playbooks.map(playbook => (
                            <FlatCard key={playbook.id} className="p-0 overflow-hidden">
                                <div className="p-4 flex items-center gap-4">
                                    <button onClick={() => setExpandedPlaybookId(expandedPlaybookId === playbook.id ? null : playbook.id)} className="p-1 text-slate-400 hover:text-white">
                                        <ChevronDown className={`w-5 h-5 transition-transform ${expandedPlaybookId === playbook.id ? 'rotate-180' : ''}`} />
                                    </button>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-white">{playbook.name}</h3>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            {playbook.stages.map(stageId => {
                                                const column = columnMap.get(stageId);
                                                return column ? (
                                                    <span key={stageId} className="px-2 py-0.5 text-xs font-medium rounded-full" style={{ color: column.color, backgroundColor: `${column.color}20`}}>
                                                        {column.title}
                                                    </span>
                                                ) : null;
                                            })}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleOpenModal(playbook)} className="p-2 text-slate-400 hover:text-white"><Edit className="w-4 h-4" /></button>
                                        <button onClick={() => setPlaybookToDelete(playbook.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                                <AnimatePresence>
                                    {expandedPlaybookId === playbook.id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-6 pb-4 border-t border-slate-700/50">
                                                <ul className="mt-4 space-y-2">
                                                    {playbook.steps.map((step, index) => (
                                                        <li key={index} className="flex items-center gap-3 text-sm">
                                                            <span className="font-bold text-blue-400 w-10">D+{step.day}</span>
                                                            <span className="font-semibold text-slate-300 w-20">{step.type}</span>
                                                            <span className="text-slate-400 flex-1">{step.instructions}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </FlatCard>
                        ))
                    ) : (
                        <div className="text-center py-10 border-2 border-dashed border-slate-800 rounded-lg">
                            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                            <h3 className="font-semibold text-white">Nenhum Playbook criado</h3>
                            <p className="text-sm text-slate-500 mt-1">Crie seu primeiro playbook para automatizar suas cadências.</p>
                        </div>
                    )}
                </div>
                </div>
            </FlatCard>

            <AnimatePresence>
                {isModalOpen && (
                    <CreateEditPlaybookModal
                        playbook={editingPlaybook}
                        pipelineColumns={pipelineColumns}
                        onClose={() => { setModalOpen(false); setEditingPlaybook(null); }}
                        onSubmit={handleSavePlaybook}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {playbookToDelete && (
                    <ConfirmDeleteModal
                        onClose={() => setPlaybookToDelete(null)}
                        onConfirm={handleDeletePlaybook}
                        title="Deletar Playbook?"
                        message="Tem certeza que deseja deletar este playbook? Esta ação não pode ser desfeita."
                    />
                )}
            </AnimatePresence>
        </>
    );
};

export default PlaybookSettings;