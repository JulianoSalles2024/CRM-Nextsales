

import React, { useState } from 'react';
import { SlidersHorizontal, Columns, ChevronDown, Plus, Check, Trash2, Settings, Download, LayoutGrid, List, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import CardCustomizationPopup from './CardCustomizationPopup';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import type { CardDisplaySettings, Board, Id } from '@/types';
import { PlanGuard } from '@/src/components/PlanGuard';

interface PipelineHeaderProps {
    cardDisplaySettings: CardDisplaySettings;
    onUpdateCardSettings: (newSettings: CardDisplaySettings) => void;
    boards: Board[];
    activeBoardId: Id;
    onSelectBoard: (boardId: Id) => void;
    onCreateBoardClick: () => void;
    onDeleteBoard: (boardId: Id) => void;
    onEditBoardClick: () => void;
    onExportBoardClick: () => void;
    viewMode: 'kanban' | 'list';
    onViewModeChange: (mode: 'kanban' | 'list') => void;
    searchQuery: string;
    onSearchChange: (q: string) => void;
}

const PipelineHeader: React.FC<PipelineHeaderProps> = ({ 
    cardDisplaySettings, 
    onUpdateCardSettings, 
    boards,
    activeBoardId,
    onSelectBoard,
    onCreateBoardClick,
    onDeleteBoard,
    onEditBoardClick,
    onExportBoardClick,
    viewMode,
    onViewModeChange,
    searchQuery,
    onSearchChange,
}) => {
    const [isCustomizeOpen, setCustomizeOpen] = useState(false);
    const [isBoardMenuOpen, setBoardMenuOpen] = useState(false);
    const [boardToDelete, setBoardToDelete] = useState<Board | null>(null);

    const activeBoard = boards.find(b => b.id === activeBoardId) || boards[0];

    return (
        <div className="flex-shrink-0 flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                    <button 
                        onClick={() => setBoardMenuOpen(!isBoardMenuOpen)}
                        className="flex items-center gap-2 text-2xl font-bold text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                        {activeBoard?.name}
                        <ChevronDown className={`w-5 h-5 text-zinc-500 transition-transform ${isBoardMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                        {isBoardMenuOpen && (
                            <>
                                <div 
                                    className="fixed inset-0 z-40" 
                                    onClick={() => setBoardMenuOpen(false)}
                                ></div>
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute top-full left-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden"
                                >
                                    <div className="p-2 space-y-1">
                                        {boards.map(board => (
                                            <div key={board.id} className="flex items-center gap-1 group">
                                                <button
                                                    onClick={() => {
                                                        onSelectBoard(board.id);
                                                        setBoardMenuOpen(false);
                                                    }}
                                                    className="flex-1 flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-800 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className={`w-2 h-2 rounded-full ${board.id === activeBoardId ? 'bg-blue-500' : 'bg-slate-600 group-hover:bg-slate-500'}`}></span>
                                                        <div className="text-left">
                                                            <span className={`block text-sm font-medium ${board.id === activeBoardId ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                                                                {board.name}
                                                            </span>
                                                            <span className="block text-xs text-slate-500">Parte da jornada: Sim</span>
                                                        </div>
                                                    </div>
                                                    {board.id === activeBoardId && <Check className="w-4 h-4 text-blue-500" />}
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (boards.length > 1) {
                                                            setBoardToDelete(board);
                                                        }
                                                    }}
                                                    disabled={boards.length <= 1}
                                                    className={`p-2 transition-all rounded-lg ${
                                                        boards.length <= 1 
                                                        ? 'text-slate-700 cursor-not-allowed opacity-20' 
                                                        : 'text-slate-500 hover:text-red-400 hover:bg-slate-800'
                                                    }`}
                                                    title={boards.length <= 1 ? "Não é possível excluir o único board" : "Excluir board"}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-2 border-t border-slate-800">
                                        <PlanGuard limit="max_pipelines" current={boards.length} reason={`Limite de pipelines atingido no seu plano`}>
                                            <button
                                                onClick={() => {
                                                    onCreateBoardClick();
                                                    setBoardMenuOpen(false);
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sky-400 hover:bg-slate-800 hover:text-sky-300 transition-colors text-sm font-medium"
                                            >
                                                <Plus className="w-4 h-4" />
                                                Criar novo board
                                            </button>
                                        </PlanGuard>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={onEditBoardClick}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        title="Configurações do Board"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={onExportBoardClick}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        title="Exportar/Importar Template"
                    >
                        <Download className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-lg ml-2">
                    <button
                        onClick={() => onViewModeChange('kanban')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        title="Visualização Kanban"
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onViewModeChange('list')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        title="Visualização em Lista"
                    >
                        <List className="w-4 h-4" />
                    </button>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Buscar lead..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full sm:w-48 bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2">
                <div className="relative">
                    <button
                        onClick={() => setCustomizeOpen(prev => !prev)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-sky-500/30 text-sky-400 bg-sky-500/5 hover:bg-sky-500/10 hover:border-sky-500/50 text-sm font-semibold transition-all"
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        <span>Personalizar Cards</span>
                    </button>
                    <AnimatePresence>
                        {isCustomizeOpen && (
                            <CardCustomizationPopup
                                settings={cardDisplaySettings}
                                onUpdate={onUpdateCardSettings}
                                onClose={() => setCustomizeOpen(false)}
                            />
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {boardToDelete && (
                <ConfirmDeleteModal
                    onClose={() => setBoardToDelete(null)}
                    onConfirm={() => {
                        onDeleteBoard(boardToDelete.id);
                        setBoardToDelete(null);
                    }}
                    title="Excluir Board"
                    message={`Tem certeza que deseja excluir o board "${boardToDelete.name}"? Esta ação não pode ser desfeita.`}
                />
            )}
        </div>
    );
};

export default PipelineHeader;
