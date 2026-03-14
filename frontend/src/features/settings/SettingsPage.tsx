import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const SETTINGS_TAB_PATHS: Record<string, string> = {
    'Pipelines':               '/configuracoes/pipelines',
    'Estágios':                '/configuracoes/estagios',
    'Automações':              '/configuracoes/automacoes',
    'Equipe':                  '/configuracoes/equipe',
    'Inteligência Artificial': '/configuracoes/inteligencia-artificial',
    'Agente de IA':            '/configuracoes/agente-ia',
    'Credenciais de IA':       '/configuracoes/credenciais-ia',
    'Integrações':             '/configuracoes/integracoes',
};
const SETTINGS_PATH_TABS: Record<string, string> = Object.fromEntries(
    Object.entries(SETTINGS_TAB_PATHS).map(([k, v]) => [v, k])
);
import { User, ColumnData, Id, Playbook } from '@/types';
import { User as UserIcon, Settings, SlidersHorizontal, ToyBrick, GripVertical, Trash2, PlusCircle, Upload, Edit, Bell, Webhook, MessageSquare, Loader2, BookOpen, Bot, Users, Columns, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { DndContext, closestCenter, DragEndEvent, DragStartEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import CreateStageModal from './CreateStageModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import NotificationSettings from '@/src/features/notifications/NotificationSettings';
import PlaybookSettings from '@/src/features/playbooks/PlaybookSettings';
import IntegrationsPage from './IntegrationsPage';
import TeamSettings from './TeamSettings';
import SettingsInactiveActions from './SettingsInactiveActions';
import { AIHubView } from '@/src/features/ai/AIHubView';
import { AIProvidersPage } from '@/src/features/ai-credentials/AIProvidersPage';
import PipelineAIModal from '@/src/features/leads/PipelineAIModal';
import { Key } from 'lucide-react';
import FlatCard from '@/components/ui/FlatCard';
import { GlassSection } from '@/src/shared/components/GlassSection';
import type { Board } from '@/types';
import { useAuth } from '@/src/features/auth/AuthContext';

// --- Componentes para Drag-and-Drop de Estágios ---

const StageItem: React.FC<{ column: ColumnData; index: number; onEdit?: (column: ColumnData) => void; onDelete?: (id: Id) => void; listeners?: any }> = ({ column, index, onEdit, onDelete, listeners }) => {
    const typeStyles: Record<ColumnData['type'], string> = {
        open: 'bg-slate-700 text-slate-300',
        qualification: 'bg-purple-900/50 text-purple-400',
        'follow-up': 'bg-blue-900/50 text-blue-400',
        scheduling: 'bg-teal-900/50 text-teal-400',
        won: 'bg-green-900/50 text-green-400',
        lost: 'bg-red-900/50 text-red-400',
    };
    const typeLabels: Record<ColumnData['type'], string> = {
        open: 'Abertura',
        qualification: 'Qualificação',
        'follow-up': 'Follow-up',
        scheduling: 'Agendamento',
        won: 'Ganho',
        lost: 'Perda',
    };

    return (
        <GlassSection className="flex items-center gap-3 p-2 touch-none">
            <button {...listeners} className="cursor-grab p-1 touch-none">
                <GripVertical className="w-5 h-5 text-slate-500 flex-shrink-0" />
            </button>
            <div className={`w-4 h-4 rounded-sm flex-shrink-0`} style={{ backgroundColor: column.color }}></div>
            <div className="flex-1 flex items-center gap-4">
                <span className="font-medium text-white">{column.title}</span>
                <span className="text-sm text-slate-500">Posição: {index + 1}</span>
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeStyles[column.type]}`}>{typeLabels[column.type]}</span>
            {onEdit && (
                <button onClick={() => onEdit(column)} className="p-2 text-slate-400 hover:text-white rounded-md">
                    <Edit className="w-4 h-4" />
                </button>
            )}
            {onDelete && (
                <button onClick={() => onDelete(column.id)} className="p-2 text-slate-400 hover:text-red-500 rounded-md">
                    <Trash2 className="w-4 h-4" />
                </button>
            )}
        </GlassSection>
    )
}

const SortableStageItem: React.FC<{ column: ColumnData; index: number; onEdit: (column: ColumnData) => void; onDelete: (id: Id) => void }> = ({ column, index, onEdit, onDelete }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: column.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    if (isDragging) {
        return <div ref={setNodeRef} style={style} className="h-[52px] w-full bg-slate-800 rounded-lg opacity-50 border-2 border-dashed border-slate-600" />
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <StageItem column={column} index={index} onEdit={onEdit} onDelete={onDelete} listeners={listeners} />
        </div>
    );
};

// --- Subcomponente de Gerenciamento de Boards ---
interface BoardsSettingsProps {
    boards: Board[];
    activeBoardId: Id;
    onSelectBoard: (id: Id) => void;
    onDeleteBoard: (id: Id) => void;
    onCreateBoard: () => void;
}

const BoardsSettings: React.FC<BoardsSettingsProps> = ({ boards, activeBoardId, onSelectBoard, onDeleteBoard, onCreateBoard }) => {
    const [boardToDelete, setBoardToDelete] = useState<Board | null>(null);

    return (
        <>
            <FlatCard className="p-0">
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-semibold text-white">Seus Pipelines (Boards)</h2>
                        <p className="text-sm text-slate-400 mt-1">Gerencie seus diferentes fluxos de trabalho.</p>
                    </div>
                    <button onClick={onCreateBoard} className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-500 text-white px-4 py-2 rounded-md text-sm font-semibold hover:shadow-[0_0_18px_rgba(29,161,242,0.45)] hover:-translate-y-0.5 transition-all duration-200">
                        <PlusCircle className="w-4 h-4" /><span>Novo Pipeline</span>
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    {boards.map(board => (
                        <GlassSection key={board.id} className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-4">
                                <div className={`w-3 h-3 rounded-full ${board.id === activeBoardId ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-slate-600'}`}></div>
                                <div>
                                    <h3 className="font-medium text-white">{board.name}</h3>
                                    <p className="text-xs text-slate-500">{board.columns.length} estágios • {board.id === activeBoardId ? 'Ativo no momento' : 'Inativo'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {board.id !== activeBoardId && (
                                    <button
                                        onClick={() => onSelectBoard(board.id)}
                                        className="text-xs font-semibold text-blue-400 hover:text-blue-300 px-3 py-1.5 rounded-md hover:bg-blue-500/10 transition-colors"
                                    >
                                        Ativar
                                    </button>
                                )}
                                <button
                                    onClick={() => setBoardToDelete(board)}
                                    disabled={boards.length <= 1}
                                    className={`p-2 rounded-md transition-colors ${boards.length <= 1 ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-red-500 hover:bg-red-500/10'}`}
                                    title={boards.length <= 1 ? "Não é possível excluir o único board" : "Excluir pipeline"}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </GlassSection>
                    ))}
                </div>
            </FlatCard>

            <AnimatePresence>
                {boardToDelete && (
                    <ConfirmDeleteModal
                        onClose={() => setBoardToDelete(null)}
                        onConfirm={() => {
                            onDeleteBoard(boardToDelete.id);
                            setBoardToDelete(null);
                        }}
                        title="Confirmar Exclusão de Pipeline"
                        message={<><p>Tem certeza que deseja deletar o pipeline <strong>{boardToDelete.name}</strong>?</p><p className="mt-2 text-sm text-slate-500">Esta ação não pode ser desfeita. Todos os leads vinculados a este pipeline serão afetados.</p></>}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

// --- Subcomponente de Pipeline ---
interface PipelineSettingsProps {
    columns: ColumnData[];
    onUpdatePipeline: (columns: ColumnData[]) => void;
}

const PipelineSettings: React.FC<PipelineSettingsProps> = ({ columns: initialColumns, onUpdatePipeline }) => {
    const [columns, setColumns] = useState(initialColumns);
    const [isCreateStageModalOpen, setCreateStageModalOpen] = useState(false);
    const [editingStage, setEditingStage] = useState<ColumnData | null>(null);
    const [stageToDelete, setStageToDelete] = useState<Id | null>(null);
    const [activeColumn, setActiveColumn] = useState<ColumnData | null>(null);

    useEffect(() => {
        setColumns(initialColumns);
    }, [initialColumns]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    const columnIds = useMemo(() => columns.map(c => c.id), [columns]);

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveColumn(columns.find(col => col.id === active.id) || null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveColumn(null);
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = columns.findIndex(item => item.id === active.id);
            const newIndex = columns.findIndex(item => item.id === over.id);
            const newColumns = arrayMove(columns, oldIndex, newIndex);
            onUpdatePipeline(newColumns);
        }
    };

    const handleOpenEditModal = (column: ColumnData) => {
        setEditingStage(column);
        setCreateStageModalOpen(true);
    };

    const handleCreateOrUpdateStage = (stageData: { id?: Id, title: string, color: string, type: ColumnData['type'] }) => {
        let newColumns: ColumnData[] = [];
        if (stageData.id) { // Update
            newColumns = columns.map(c =>
                c.id === stageData.id ? { ...c, title: stageData.title, color: stageData.color, type: stageData.type } : c
            );
        } else { // Create
            const newColumn: ColumnData = { id: `stage-${Date.now()}`, title: stageData.title, color: stageData.color, type: stageData.type };
            newColumns = [...columns, newColumn];
        }
        onUpdatePipeline(newColumns);
        setCreateStageModalOpen(false);
        setEditingStage(null);
    };

    const handleDeleteColumn = (id: Id) => {
        if (columns.length <= 1) {
            alert("Você deve ter pelo menos um estágio no pipeline.");
            return;
        }
        setStageToDelete(id);
    };

    const confirmDeleteStage = () => {
        if (stageToDelete) {
            const newColumns = columns.filter(col => col.id !== stageToDelete);
            onUpdatePipeline(newColumns);
            setStageToDelete(null);
        }
    };

    return (
        <>
            <FlatCard className="p-0">
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-semibold text-white">Estágios do Pipeline</h2>
                        <p className="text-sm text-slate-400 mt-1">Configure os estágios do seu funil de vendas. Arraste para reordenar.</p>
                    </div>
                    <button onClick={() => { setEditingStage(null); setCreateStageModalOpen(true); }} className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-500 text-white px-4 py-2 rounded-md text-sm font-semibold hover:shadow-[0_0_18px_rgba(29,161,242,0.45)] hover:-translate-y-0.5 transition-all duration-200">
                        <PlusCircle className="w-4 h-4" /><span>Novo Estágio</span>
                    </button>
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <div className="p-6 space-y-3">
                        <SortableContext items={columnIds} strategy={verticalListSortingStrategy}>
                            {columns.map((col, index) => (
                                <SortableStageItem key={col.id} column={col} index={index} onEdit={handleOpenEditModal} onDelete={handleDeleteColumn} />
                            ))}
                        </SortableContext>
                    </div>
                    <DragOverlay>{activeColumn ? <StageItem column={activeColumn} index={columns.findIndex(c => c.id === activeColumn.id)} /> : null}</DragOverlay>
                </DndContext>
            </FlatCard>

            <AnimatePresence>
                {isCreateStageModalOpen && (
                    <CreateStageModal
                        onClose={() => {
                            setCreateStageModalOpen(false);
                            setEditingStage(null);
                        }}
                        onSubmit={handleCreateOrUpdateStage}
                        stageToEdit={editingStage}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {stageToDelete && (
                    <ConfirmDeleteModal onClose={() => setStageToDelete(null)} onConfirm={confirmDeleteStage} title="Confirmar Exclusão de Estágio"
                        message={<><p>Tem certeza que deseja deletar este estágio?</p><p className="mt-2 text-sm text-slate-500">Esta ação não pode ser desfeita. Leads neste estágio não serão excluídos, mas precisarão ser movidos.</p></>}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

// --- Agente de IA por Board (admin only) ---
const BoardsAISettings: React.FC<{ boards: Board[] }> = ({ boards }) => {
    const { companyId } = useAuth();
    const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);

    if (!companyId) return null;

    return (
        <>
            <FlatCard className="p-6 space-y-5">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <Bot className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Agente de IA por Pipeline</h2>
                        <p className="text-xs text-slate-400">Configurações globais — afetam todos os sellers da empresa</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    {boards.map(board => (
                        <div key={board.id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
                            <div className="flex items-center gap-3">
                                <Columns className="w-4 h-4 text-slate-500 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-white">{board.name}</p>
                                    <p className="text-xs text-slate-500">{board.columns.length} estágios</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedBoard(board)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-500/10 transition-colors whitespace-nowrap"
                            >
                                <Bot className="w-3.5 h-3.5" />
                                Configurar
                            </button>
                        </div>
                    ))}
                </div>
            </FlatCard>

            {selectedBoard && (
                <PipelineAIModal
                    boardId={selectedBoard.id}
                    boardName={selectedBoard.name}
                    companyId={companyId}
                    onClose={() => setSelectedBoard(null)}
                />
            )}
        </>
    );
};

// --- Placeholder ---
const PlaceholderTab: React.FC<{ title: string }> = ({ title }) => (
    <FlatCard className="text-center p-10 border-2 border-dashed border-white/10">
        <h2 className="text-lg font-semibold text-white">WIP: {title}</h2>
        <p className="text-slate-400 mt-2">Esta seção estará disponível em breve!</p>
    </FlatCard>
);


// --- Componente Principal ---
interface SettingsPageProps {
    currentUser: User;
    users: User[];
    columns: ColumnData[];
    boards: Board[];
    activeBoardId: Id;
    onUpdatePipeline: (columns: ColumnData[]) => void;
    onUpdateUsers: (users: User[]) => void;
    onSelectBoard: (id: Id) => void;
    onDeleteBoard: (id: Id) => void;
    onCreateBoard: () => void;
    onResetApplication: () => void;
    initialTab?: string;
}

const SettingsPage: React.FC<SettingsPageProps> = ({
    currentUser,
    users,
    columns,
    boards,
    activeBoardId,
    onUpdatePipeline,
    onUpdateUsers,
    onSelectBoard,
    onDeleteBoard,
    onCreateBoard,
    onResetApplication,
    initialTab
}) => {
    const { currentPermissions } = useAuth();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const activeTab = SETTINGS_PATH_TABS[pathname] ?? 'Equipe';
    const setActiveTab = (tab: string) => {
        const path = SETTINGS_TAB_PATHS[tab];
        if (path) navigate(path, { replace: true });
    };

    // Handle initialTab prop (e.g. from SdrBot navigation)
    const lastInitialTab = useRef<string | undefined>(undefined);
    useEffect(() => {
        if (initialTab && initialTab !== lastInitialTab.current) {
            lastInitialTab.current = initialTab;
            const path = SETTINGS_TAB_PATHS[initialTab];
            if (path) navigate(path, { replace: true });
        }
    }, [initialTab, navigate]);

    // Handle programmatic tab change via custom event
    useEffect(() => {
        const handleTabChange = (e: any) => {
            if (e.detail) setActiveTab(e.detail);
        };
        window.addEventListener('changeSettingsTab', handleTabChange);
        return () => window.removeEventListener('changeSettingsTab', handleTabChange);
    }, [navigate]);

    // ✅ RBAC: SELLER vê APENAS Pipelines e Estágios | ADMIN vê somente as abas administrativas
    const tabs = useMemo(() => {
        // Regra: quem NÃO pode gerenciar time => Seller
        if (!currentPermissions.canManageTeam) {
            return [
                { name: 'Pipelines',  icon: Columns },
                { name: 'Estágios',   icon: Settings },
                { name: 'Automações', icon: Zap },
            ];
        }

        // Admin (como já está correto em produção)
        return [
            ...(currentPermissions.canManageTeam ? [{ name: 'Equipe', icon: Users }] : []),
            { name: 'Inteligência Artificial', icon: Bot },
            { name: 'Agente de IA', icon: Zap },
            ...(currentPermissions.canManageCredentials ? [{ name: 'Credenciais de IA', icon: Key }] : []),
           // ...(currentPermissions.canManagePreferences ? [{ name: 'Preferências', icon: SlidersHorizontal }] : []),
            ...(currentPermissions.canManageIntegrations ? [{ name: 'Integrações', icon: Webhook }] : []),
            { name: 'Automações', icon: Zap },
           // { name: 'Notificações', icon: Bell },
        ];
    }, [currentPermissions]);

    // ✅ Segurança: se a aba ativa não existe no menu atual, cair para a primeira aba disponível
    useEffect(() => {
        if (!tabs.length) return;
        const exists = tabs.some(t => t.name === activeTab);
        if (!exists) setActiveTab(tabs[0].name);
    }, [tabs, activeTab]);

    return (
        <div className="flex flex-col gap-1">
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">
  Configurações
</h1>

<p className="text-slate-400 mt-1">
  Gerencie suas preferências e configurações da conta
</p>
            </div>
            <div>
                <div className="flex border-b border-slate-800 mb-6 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.name}
                            onClick={() => setActiveTab(tab.name)}
                            className={`whitespace-nowrap flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all relative ${activeTab === tab.name ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.name}
                            {activeTab === tab.name && (
                                <motion.div
                                    layoutId="activeTabSettings"
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                                />
                            )}
                        </button>
                    ))}
                </div>
            </div>
            <div className="space-y-6">
                {activeTab === 'Pipelines' && (
                    <BoardsSettings
                        boards={boards}
                        activeBoardId={activeBoardId}
                        onSelectBoard={onSelectBoard}
                        onDeleteBoard={onDeleteBoard}
                        onCreateBoard={onCreateBoard}
                    />
                )}
                {activeTab === 'Estágios' && <PipelineSettings columns={columns} onUpdatePipeline={onUpdatePipeline} />}
                {activeTab === 'Equipe' && <TeamSettings users={users} currentUser={currentUser} onUpdateUsers={onUpdateUsers} />}
                {activeTab === 'Inteligência Artificial' && <AIHubView />}
                {activeTab === 'Agente de IA' && <BoardsAISettings boards={boards} />}
                {activeTab === 'Credenciais de IA' && <AIProvidersPage />}
              {/*  {activeTab === 'Preferências' && <PlaceholderTab title="Preferências" />} */}
                {activeTab === 'Integrações' && <IntegrationsPage showNotification={() => { }} />}
                {activeTab === 'Automações' && <SettingsInactiveActions />}
              {/*  {activeTab === 'Notificações' && <NotificationSettings />} */}
            </div>
        </div>
    );
};

export default SettingsPage;