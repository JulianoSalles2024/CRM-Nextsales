import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import Card from './Card';
import type { ColumnData, Lead, User, CardDisplaySettings, Id, Task } from '@/types';
import { PlusCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import FlatCard from '@/components/ui/FlatCard';

interface ColumnProps {
    column: ColumnData;
    leads: Lead[];
    users: User[];
    tasks: Task[];
    cardDisplaySettings: CardDisplaySettings;
    onSelectLead: (lead: Lead) => void;
    selectedLeadId: Id | null;
    onAddLead: (columnId: Id) => void;
    minimizedLeads: Id[];
    onToggleLeadMinimize: (leadId: Id) => void;
    minimizedColumns: Id[];
    onToggleColumnMinimize: (columnId: Id) => void;
}

const contentVariants = {
    hidden: { opacity: 0, transition: { duration: 0.2 } },
    visible: { opacity: 1, transition: { duration: 0.2, delay: 0.1 } },
};

const Column: React.FC<ColumnProps> = ({ column, leads, users, tasks, cardDisplaySettings, onSelectLead, selectedLeadId, onAddLead, minimizedLeads, onToggleLeadMinimize, minimizedColumns, onToggleColumnMinimize }) => {
    const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { type: 'Column', column } });
    
    const leadsInColumn = leads.filter(lead => lead.columnId === column.id && !lead.reactivationDate);
    const leadIds = React.useMemo(() => leadsInColumn.map(l => l.id), [leadsInColumn]);

    const totalValue = leadsInColumn.reduce((sum, lead) => sum + lead.value, 0);
    const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    
    const isMinimized = minimizedColumns.includes(column.id);

    return (
        <motion.div
            ref={setNodeRef}
            layout
            animate={{ width: isMinimized ? 72 : 320 }}
            transition={{ type: "spring", stiffness: 350, damping: 35 }}
            className="flex-shrink-0 h-full"
        >
            <FlatCard className={`flex flex-col h-full p-0 transition-colors ${isOver ? 'bg-slate-800/80' : ''}`}>
                <AnimatePresence initial={false}>
                    {isMinimized ? (
                        <motion.div
                            key="minimized"
                            variants={contentVariants}
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            className="flex flex-col items-center justify-between h-full p-2 overflow-hidden border-b-4"
                            style={{ borderBottomColor: column.color }}
                        >
                            <button onClick={() => onToggleColumnMinimize(column.id)} className="p-1 text-blue-400 hover:text-blue-300" title="Expandir coluna">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-4 cursor-default">
                                <h2 className="font-bold text-slate-900 dark:text-white text-lg [writing-mode:vertical-rl] transform-gpu rotate-180 whitespace-nowrap">
                                    {column.title}
                                </h2>
                                <div className="text-center">
                                    <p className="font-bold text-slate-900 dark:text-white">{leadsInColumn.length}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">leads</p>
                                </div>
                            </div>
                            <button onClick={() => onAddLead(column.id)} className="p-1 text-blue-400 hover:text-blue-300" title="Adicionar lead">
                                <PlusCircle className="w-5 h-5" />
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="expanded"
                            variants={contentVariants}
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            className="flex flex-col max-h-full"
                        >
                            {/* Expanded Column Header */}
                            <div className="p-4 flex justify-between items-center flex-shrink-0 border-b-4" style={{ borderBottomColor: column.color }}>
                                <div>
                                    <h2 className="font-bold text-slate-900 dark:text-white text-lg">{column.title}</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                        {leadsInColumn.length} {leadsInColumn.length === 1 ? 'lead' : 'leads'} • {currencyFormatter.format(totalValue)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => onAddLead(column.id)} className="text-blue-400 hover:text-blue-300 transition-colors" title="Adicionar lead a este estágio">
                                        <PlusCircle className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => onToggleColumnMinimize(column.id)} className="text-blue-400 hover:text-blue-300 transition-colors" title="Minimizar coluna">
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            
                            {/* Expanded Column Body */}
                            <div className={`p-2 flex-1 overflow-y-auto`}>
                                <SortableContext items={leadIds} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-2">
                                        {leadsInColumn.map(lead => (
                                            <Card
                                                key={lead.id}
                                                lead={lead}
                                                columnType={column.type}
                                                displaySettings={cardDisplaySettings}
                                                users={users}
                                                tasks={tasks}
                                                onSelect={() => onSelectLead(lead)}
                                                isSelected={selectedLeadId === lead.id}
                                                minimizedLeads={minimizedLeads}
                                                onToggleLeadMinimize={onToggleLeadMinimize}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </FlatCard>
        </motion.div>
    );
};

export default Column;