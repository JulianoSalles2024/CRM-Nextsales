

import React, { useState, useMemo } from 'react';
import FlatCard from '@/components/ui/FlatCard';
import {
    DndContext,
    DragEndEvent,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    closestCenter,
    DragOverlay,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import Column from './Column';
import Card from './Card';
import PipelineHeader from './PipelineHeader';
import EditBoardModal from './EditBoardModal';
import ExportImportModal from './ExportImportModal';
import type { ColumnData, Lead, Id, User, CardDisplaySettings, Task, Board } from '@/types';

interface KanbanBoardProps {
    columns: ColumnData[];
    leads: Lead[];
    users: User[];
    tasks: Task[];
    cardDisplaySettings: CardDisplaySettings;
    onUpdateLeadColumn: (leadId: Id, newColumnId: Id) => void;
    onSelectLead: (lead: Lead) => void;
    selectedLeadId: Id | null;
    onAddLead: (columnId: Id) => void;
    onUpdateCardSettings: (newSettings: CardDisplaySettings) => void;
    minimizedLeads: Id[];
    onToggleLeadMinimize: (leadId: Id) => void;
    minimizedColumns: Id[];
    onToggleColumnMinimize: (columnId: Id) => void;
    isPlaybookActionEnabled: boolean;
    onApplyPlaybookClick: () => void;
    boards: Board[];
    activeBoardId: Id;
    onSelectBoard: (boardId: Id) => void;
    onCreateBoardClick: () => void;
    onDeleteBoard: (boardId: Id) => void;
    onUpdateBoard: (boardId: Id, updates: Partial<Board>) => void;
    onImportBoards: (importedBoards: Board[]) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ 
    columns, 
    leads, 
    users,
    tasks,
    cardDisplaySettings,
    onUpdateLeadColumn, 
    onSelectLead,
    selectedLeadId,
    onAddLead,
    onUpdateCardSettings,
    minimizedLeads,
    onToggleLeadMinimize,
    minimizedColumns,
    onToggleColumnMinimize,
    isPlaybookActionEnabled,
    onApplyPlaybookClick,
    boards,
    activeBoardId,
    onSelectBoard,
    onCreateBoardClick,
    onDeleteBoard,
    onUpdateBoard,
    onImportBoards
}) => {
    const [activeLead, setActiveLead] = useState<Lead | null>(null);
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
    const [isEditBoardModalOpen, setIsEditBoardModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const columnIds = useMemo(() => columns.map(c => c.id), [columns]);

    const displayLeads = useMemo(() => {
        if (!searchQuery.trim()) return leads;
        const q = searchQuery.toLowerCase();
        return leads.filter(l =>
            l.name?.toLowerCase().includes(q) ||
            l.email?.toLowerCase().includes(q) ||
            l.company?.toLowerCase().includes(q) ||
            l.phone?.includes(q)
        );
    }, [leads, searchQuery]);
    const activeBoard = boards.find(b => b.id === activeBoardId) || boards[0];

    const sensors = useSensors(useSensor(PointerSensor, {
        activationConstraint: {
            distance: 10, // 10px threshold to start dragging
        },
    }));

    function handleDragStart(event: DragStartEvent) {
        const lead = leads.find(l => l.id === event.active.id);
        if (lead) {
            setActiveLead(lead);
        }
    }

    function handleDragEnd(event: DragEndEvent) {
        setActiveLead(null);
        const { active, over } = event;
        if (!over) return;

        const activeLeadData = leads.find(l => l.id === active.id);
        
        const overId = over.id;
        const overIsColumn = columns.some(c => c.id === overId);
        const overLead = overIsColumn ? null : leads.find(l => l.id === overId);
        const overColumnId = overIsColumn ? overId : overLead?.columnId;


        if (activeLeadData && overColumnId && activeLeadData.columnId !== overColumnId) {
            onUpdateLeadColumn(active.id, overColumnId);
        }
    }
    
    return (
        <div className="flex flex-col h-full">
            <div className="relative z-10">
                <PipelineHeader 
                    cardDisplaySettings={cardDisplaySettings} 
                    onUpdateCardSettings={onUpdateCardSettings}
                    isPlaybookActionEnabled={isPlaybookActionEnabled}
                    onApplyPlaybookClick={onApplyPlaybookClick}
                    boards={boards}
                    activeBoardId={activeBoardId}
                    onSelectBoard={onSelectBoard}
                    onCreateBoardClick={onCreateBoardClick}
                    onDeleteBoard={onDeleteBoard}
                    onEditBoardClick={() => setIsEditBoardModalOpen(true)}
                    onExportBoardClick={() => setIsExportModalOpen(true)}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                />
            </div>
            <div className="flex-1 overflow-x-auto overflow-y-hidden">
                {viewMode === 'kanban' ? (
                    <DndContext
                        sensors={sensors}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        collisionDetection={closestCenter}
                    >
                        <div className="flex gap-4 h-full pb-4">
                            {columns.map(col => (
                                <Column
                                    key={col.id}
                                    column={col}
                                    leads={displayLeads}
                                    users={users}
                                    tasks={tasks}
                                    cardDisplaySettings={cardDisplaySettings}
                                    onSelectLead={onSelectLead}
                                    selectedLeadId={selectedLeadId}
                                    onAddLead={onAddLead}
                                    minimizedLeads={minimizedLeads}
                                    onToggleLeadMinimize={onToggleLeadMinimize}
                                    minimizedColumns={minimizedColumns}
                                    onToggleColumnMinimize={onToggleColumnMinimize}
                                />
                            ))}
                        </div>
                        <DragOverlay>
                            {activeLead ? (
                                <Card 
                                    lead={activeLead} 
                                    displaySettings={cardDisplaySettings}
                                    users={users}
                                    tasks={tasks}
                                    onSelect={() => {}}
                                    isSelected={false}
                                    minimizedLeads={minimizedLeads}
                                    onToggleLeadMinimize={onToggleLeadMinimize}
                                />
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                ) : (
                    <FlatCard className="overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-950 border-b border-slate-800">
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Lead</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Empresa</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Estágio</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Valor</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Responsável</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {displayLeads.map(lead => (
                                    <tr 
                                        key={lead.id} 
                                        onClick={() => onSelectLead(lead)}
                                        className={`hover:bg-slate-800/50 cursor-pointer transition-colors ${selectedLeadId === lead.id ? 'bg-blue-900/20' : ''}`}
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <img src={lead.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                                                <span className="text-sm font-medium text-white">{lead.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-400">{lead.company}</td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                                                {columns.find(c => c.id === lead.columnId)?.title}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-white">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.value)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white">
                                                    {users.find(u => u.id === lead.assignedTo)?.name.substring(0, 2).toUpperCase() || '??'}
                                                </div>
                                                <span className="text-sm text-slate-400">
                                                    {users.find(u => u.id === lead.assignedTo)?.name || 'Não atribuído'}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </FlatCard>
                )}
            </div>

            {isEditBoardModalOpen && activeBoard && (
                <EditBoardModal
                    board={activeBoard}
                    boards={boards}
                    onClose={() => setIsEditBoardModalOpen(false)}
                    onSave={onUpdateBoard}
                    onSwitchBoard={onSelectBoard}
                />
            )}

            {isExportModalOpen && (
                <ExportImportModal
                    boards={boards}
                    onClose={() => setIsExportModalOpen(false)}
                    onImport={onImportBoards}
                />
            )}
        </div>
    );
};

export default KanbanBoard;
