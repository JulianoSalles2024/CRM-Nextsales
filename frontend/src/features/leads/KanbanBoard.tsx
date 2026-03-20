

import React, { useState, useMemo } from 'react';
import FlatCard from '@/components/ui/FlatCard';
import { VercelAvatar } from '@/src/shared/components/VercelAvatar';
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
import MoveToBoardModal from './MoveToBoardModal';
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
    const [movingLead, setMovingLead] = useState<Lead | null>(null);
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
                                    boards={boards}
                                    onMoveToBoardClick={setMovingLead}
                                />
                            ))}
                        </div>
                        <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
                            {activeLead ? (
                                <div className="rotate-[1.5deg] scale-[1.03] drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)]">
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
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                ) : (
                    <FlatCard className="overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#050c18]/95 border-b border-white/5">
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Lead</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Empresa</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estágio</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Responsável</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.04]">
                                {displayLeads.map(lead => {
                                    const col = columns.find(c => c.id === lead.columnId);
                                    return (
                                        <tr
                                            key={lead.id}
                                            onClick={() => onSelectLead(lead)}
                                            className={`group hover:bg-white/[0.03] cursor-pointer transition-colors border-l-2 ${
                                                selectedLeadId === lead.id
                                                    ? 'bg-blue-900/10 border-l-blue-500/60'
                                                    : 'border-l-transparent hover:border-l-blue-500/30'
                                            }`}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <VercelAvatar name={lead.name ?? '?'} size={32} />
                                                    <div>
                                                        <span className="text-sm font-semibold text-white">{lead.name}</span>
                                                        {lead.company && <div className="text-xs text-slate-500 mt-0.5">{lead.company}</div>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-400">{lead.company || '—'}</td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border"
                                                    style={{
                                                        color: col?.color ?? '#94a3b8',
                                                        borderColor: `${col?.color ?? '#94a3b8'}40`,
                                                        backgroundColor: `${col?.color ?? '#94a3b8'}12`,
                                                    }}
                                                >
                                                    {col?.title ?? '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm font-bold text-emerald-400 tabular-nums">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.value)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <VercelAvatar
                                                        name={users.find(u => u.id === lead.assignedTo)?.name ?? 'Não atribuído'}
                                                        size={24}
                                                    />
                                                    <span className="text-sm text-slate-400">
                                                        {users.find(u => u.id === lead.assignedTo)?.name || 'Não atribuído'}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </FlatCard>
                )}
            </div>

            {movingLead && (
                <MoveToBoardModal
                    lead={movingLead}
                    boards={boards}
                    currentBoardId={activeBoardId as string}
                    onClose={() => setMovingLead(null)}
                />
            )}

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
