
import React, { useState, useEffect } from 'react';
import { X, Copy, Check, GripVertical, Trash2, Plus, Settings2 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Board, Id, ColumnData } from '@/types';

interface EditBoardModalProps {
    board: Board;
    boards: Board[];
    onClose: () => void;
    onSave: (boardId: Id, updates: Partial<Board>) => void;
    onSwitchBoard: (boardId: Id) => void;
}

const PROMOTE_OPTIONS = [
    'Sem automação',
    'Lead',
    'MQL',
    'Oportunidade',
    'Cliente',
    'Outros / Perdidos'
];

const inputCls = 'w-full bg-[#0B1220] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500 outline-none transition-all';
const selectCls = 'w-full bg-[#0B1220] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all';

const EditBoardModal: React.FC<EditBoardModalProps> = ({ board, boards, onClose, onSave, onSwitchBoard }) => {
    const [name, setName] = useState(board.name);
    const [slug, setSlug] = useState(board.slug || '');
    const [description, setDescription] = useState(board.description || '');
    const [suggestedProductId, setSuggestedProductId] = useState(board.suggestedProductId || '');
    const [onWinBoardId, setOnWinBoardId] = useState(board.onWinBoardId || '');
    const [wonStageId, setWonStageId] = useState(board.wonStageId || '');
    const [lostStageId, setLostStageId] = useState(board.lostStageId || '');
    const [columns, setColumns] = useState<ColumnData[]>(board.columns || []);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setName(board.name);
        setSlug(board.slug || '');
        setDescription(board.description || '');
        setSuggestedProductId(board.suggestedProductId || '');
        setOnWinBoardId(board.onWinBoardId || '');
        setWonStageId(board.wonStageId || '');
        setLostStageId(board.lostStageId || '');
        setColumns(board.columns || []);
    }, [board]);

    const handleSave = () => {
        onSave(board.id, {
            name,
            slug,
            description,
            suggestedProductId,
            onWinBoardId,
            wonStageId,
            lostStageId,
            columns
        });
        onClose();
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(slug);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleAddStage = () => {
        const newStage: ColumnData = {
            id: `col-${Date.now()}`,
            title: 'Nova Etapa',
            color: '#3b82f6',
            type: 'open',
            promoteTo: 'Sem automação'
        };
        setColumns([...columns, newStage]);
    };

    const handleUpdateStage = (id: Id, updates: Partial<ColumnData>) => {
        setColumns(columns.map(col => col.id === id ? { ...col, ...updates } : col));
    };

    const handleDeleteStage = (id: Id) => {
        setColumns(columns.filter(col => col.id !== id));
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#0B1220] border border-slate-800 rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]"
            >
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">Editar Board</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                    {/* Board Switcher */}
                    <div className="bg-[#0F172A] border border-white/5 rounded-xl p-4 space-y-4">
                        <label className="block text-sm font-medium text-slate-400 mb-2">Editando board</label>
                        <select
                            value={board.id}
                            onChange={(e) => onSwitchBoard(e.target.value)}
                            className={selectCls}
                        >
                            {boards.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Basic Info */}
                    <div className="bg-[#0F172A] border border-white/5 rounded-xl p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Nome do Board *</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Chave (slug)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={slug}
                                        onChange={(e) => setSlug(e.target.value)}
                                        className={inputCls}
                                    />
                                    <button
                                        onClick={copyToClipboard}
                                        className="p-2 bg-[#0B1220] border border-white/10 rounded-lg text-slate-400 hover:text-white transition-colors shrink-0"
                                    >
                                        {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Descrição</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={2}
                                className={`${inputCls} resize-none`}
                            />
                        </div>
                    </div>

                    {/* Product Suggestion */}
                    <div className="bg-[#0F172A] border border-white/5 rounded-xl p-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Produto sugerido</label>
                            <select
                                value={suggestedProductId}
                                onChange={(e) => setSuggestedProductId(e.target.value)}
                                className={selectCls}
                            >
                                <option value="">Nenhum</option>
                                {/* Products would go here */}
                            </select>
                            <p className="text-xs text-slate-500 mt-2">Sugere (ou pré-seleciona) um produto ao adicionar itens em deals desse board.</p>
                        </div>
                    </div>

                    {/* Win Automation */}
                    <div className="bg-[#0F172A] border border-white/5 rounded-xl p-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Ao Ganhar, enviar para...</label>
                            <select
                                value={onWinBoardId}
                                onChange={(e) => setOnWinBoardId(e.target.value)}
                                className={selectCls}
                            >
                                <option value="">Nenhum</option>
                                {boards.filter(b => b.id !== board.id).map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-500 mt-2">Cria automaticamente um card no próximo board quando o negócio é ganho.</p>
                        </div>

                        {/* Win/Loss Stages */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">🏆 Estágio Ganho (Won)</label>
                                <select
                                    value={wonStageId}
                                    onChange={(e) => setWonStageId(e.target.value)}
                                    className={selectCls}
                                >
                                    <option value="">Selecione...</option>
                                    {columns.map(col => (
                                        <option key={col.id} value={col.id}>{col.title}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-500 mt-2">O botão "Ganho" moverá o card para cá.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">❌ Estágio Perdido (Lost)</label>
                                <select
                                    value={lostStageId}
                                    onChange={(e) => setLostStageId(e.target.value)}
                                    className={selectCls}
                                >
                                    <option value="">Selecione...</option>
                                    {columns.map(col => (
                                        <option key={col.id} value={col.id}>{col.title}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-500 mt-2">O botão "Perdido" moverá o card para cá.</p>
                            </div>
                        </div>
                    </div>

                    {/* Kanban Stages */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Etapas do Kanban</h4>
                            <div className="flex gap-4">
                                <button
                                    onClick={handleAddStage}
                                    className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Adicionar etapa
                                </button>
                                <button className="text-xs font-bold text-slate-400 hover:text-slate-300 flex items-center gap-1 transition-colors">
                                    <Settings2 className="w-3.5 h-3.5" /> Gerenciar Estágios
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {columns.map((col) => (
                                <div key={col.id} className="bg-[#0F172A] border border-white/5 rounded-xl p-4 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="cursor-grab text-slate-600 hover:text-slate-400">
                                            <GripVertical className="w-5 h-5" />
                                        </div>
                                        <div
                                            className="w-4 h-4 rounded-full shrink-0"
                                            style={{ backgroundColor: col.color }}
                                        />
                                        <input
                                            type="text"
                                            value={col.title}
                                            onChange={(e) => handleUpdateStage(col.id, { title: e.target.value })}
                                            className="flex-1 bg-[#0B1220] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                                        />
                                        <button
                                            onClick={() => handleDeleteStage(col.id)}
                                            className="text-slate-500 hover:text-red-400 transition-colors shrink-0"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="pl-8">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Promove contato para:</label>
                                        <select
                                            value={col.promoteTo || 'Sem automação'}
                                            onChange={(e) => handleUpdateStage(col.id, { promoteTo: e.target.value })}
                                            className="w-full bg-[#0B1220] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                                        >
                                            {PROMOTE_OPTIONS.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-300 border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                        Salvar Alterações
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default EditBoardModal;
