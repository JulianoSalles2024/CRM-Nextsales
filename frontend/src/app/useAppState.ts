import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { safeLog } from '@/src/utils/logger';
import { getLeadComputedStatus } from '@/src/lib/leadStatus';

// Auth
import { useAuth } from '@/src/features/auth/AuthContext';

// Supabase hooks
import { useLeads } from '@/src/hooks/useLeads';
import { useTasks } from '@/src/hooks/useTasks';
import { useActivities } from '@/src/hooks/useActivities';
import { useBoards } from '@/src/hooks/useBoards';
import { useUsers } from '@/src/hooks/useUsers';
import { useGroups } from '@/src/hooks/useGroups';
import { usePlaybooks } from '@/src/hooks/usePlaybooks';
import { useGroupAnalyses } from '@/src/hooks/useGroupAnalyses';
import { useTags } from '@/src/hooks/useTags';

// Feature hooks
import { useNotificationActions } from '@/src/features/notifications/useNotificationActions';
import { useNotifications } from '@/src/features/notifications/useNotifications';
import { useAIProviders } from '@/src/features/ai-credentials/useAIProviders';

// Types
import type {
    User, ColumnData, Lead, Activity, Task, Id,
    CreateLeadData, UpdateLeadData, CreateTaskData, UpdateTaskData,
    CardDisplaySettings, ListDisplaySettings, Tag, EmailDraft,
    ChatConversation, ChatMessage,
    Group, CreateGroupData, UpdateGroupData,
    GroupAnalysis, CreateGroupAnalysisData, UpdateGroupAnalysisData,
    Playbook, PlaybookHistoryEntry, Board,
} from '@/types';

// View path mapping
import { PATH_VIEWS } from './viewPaths';

const safeError = (...args: unknown[]) => console.error(...args);

function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            safeError(error);
            return initialValue;
        }
    });

    const valueRef = useRef(storedValue);
    valueRef.current = storedValue;

    useEffect(() => {
        const handler = setTimeout(() => {
            try {
                window.localStorage.setItem(key, JSON.stringify(valueRef.current));
            } catch (error) {
                safeError('Error saving to localStorage:', error);
            }
        }, 500);
        return () => clearTimeout(handler);
    }, [key, storedValue]);

    return [storedValue, setStoredValue];
}

export function useAppState() {
    const { user: authUser, logout, companyId, currentUserRole } = useAuth();

    const localUser: User = {
        id: authUser?.id ?? 'local-user',
        name: authUser?.user_metadata?.full_name ?? authUser?.user_metadata?.name ?? (authUser?.email ? authUser.email.split('@')[0] : 'Usuário'),
        email: authUser?.email ?? '',
        role: 'Admin',
        joinedAt: authUser?.created_at ?? new Date().toISOString(),
    };

    // --- SUPABASE STATE ---
    const { leads, createLead, updateLead, deleteLead, bulkUpdateLeads } = useLeads(companyId);
    const { activities, createActivity } = useActivities(companyId);
    const { tasks, createTask, createManyTasks, updateTask: updateTaskInDb, deleteTask: deleteTaskInDb, deleteManyTasks } = useTasks(companyId);
    const { users, refetch: refetchUsers } = useUsers(companyId);
    const { boards, setBoards, activeBoardId, setActiveBoardId, createBoard, saveBoardStages, deleteBoard, loading: boardsLoading } = useBoards(companyId);

    const activeBoard = useMemo(() => boards.find(b => b.id === activeBoardId) ?? boards[0], [boards, activeBoardId]);
    const columns = activeBoard?.columns ?? [];

    const setColumns = useCallback((newColumnsOrUpdater: ColumnData[] | ((prev: ColumnData[]) => ColumnData[])) => {
        setBoards(currentBoards => currentBoards.map(board => {
            if (board.id === activeBoardId) {
                const newColumns = typeof newColumnsOrUpdater === 'function'
                    ? newColumnsOrUpdater(board.columns)
                    : newColumnsOrUpdater;
                return { ...board, columns: newColumns };
            }
            return board;
        }));
    }, [activeBoardId, setBoards]);

    // --- LOCALSTORAGE STATE ---
    const [emailDrafts, setEmailDrafts] = useLocalStorage<EmailDraft[]>('crm-emailDrafts', []);
    const [conversations, setConversations] = useState<ChatConversation[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const { groups, createGroup, updateGroup: updateGroupInDb, deleteGroup: deleteGroupInDb } = useGroups(companyId);
    const { groupAnalyses, createOrUpdateAnalysis: createOrUpdateAnalysisInDb, deleteAnalysis: deleteAnalysisInDb } = useGroupAnalyses(companyId);
    const { tags, createTag, updateTag: updateTagInDb, deleteTag } = useTags(companyId);
    const { playbooks, replacePlaybooks } = usePlaybooks(companyId, authUser?.id ?? null);

    // --- NOTIFICATIONS (Supabase) ---
    const { unreadCount: notifUnreadCount } = useNotifications(authUser?.id ?? null);

    // --- UI STATE ---
    const [activeView, setActiveView] = useState<string>(() => {
        const path = window.location.pathname;
        if (PATH_VIEWS[path]) return PATH_VIEWS[path];
        if (path.startsWith('/painel360/')) return 'Painel 360';
        if (path.startsWith('/configuracoes/')) return 'Configurações';
        if (path.startsWith('/agentes/')) return 'Agentes';
        return 'Inbox';
    });
    const [inboxMode, setInboxMode] = useState<'standard' | 'analysis'>('standard');
    const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('crm-theme') as 'dark' | 'light') || 'dark');
    const [isChatEnabled] = useState(false);

    // Modal & Slideover States
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isCreateLeadModalOpen, setCreateLeadModalOpen] = useState(false);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [isCreateTaskModalOpen, setCreateTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [preselectedDataForTask, setPreselectedDataForTask] = useState<{ leadId: Id; date?: string } | null>(null);
    const [isGroupModalOpen, setGroupModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<Group | null>(null);
    const [lostLeadInfo, setLostLeadInfo] = useState<{ lead: Lead; columnId: Id } | null>(null);
    const [isSdrBotOpen, setSdrBotOpen] = useState(false);
    const [isCreateBoardModalOpen, setCreateBoardModalOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState<string | undefined>(undefined);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

    // Playbook states
    const [selectedLeadForPlaybookId, setSelectedLeadForPlaybookId] = useState<Id | null>(null);
    const [isPlaybookModalOpen, setPlaybookModalOpen] = useState(false);
    const selectedLeadForPlaybook = useMemo(() => leads.find(l => l.id === selectedLeadForPlaybookId), [leads, selectedLeadForPlaybookId]);

    // Printing state
    const [leadsToPrint, setLeadsToPrint] = useState<Lead[] | null>(null);

    // Display Settings (UI preferences — stay in localStorage)
    const [cardDisplaySettings, setCardDisplaySettings] = useLocalStorage<CardDisplaySettings>('crm-cardSettings', {
        showValue: true, showTags: true, showProbability: true, showAssignedTo: false, showEmail: false, showPhone: false, showCreatedAt: false,
    });
    const [listDisplaySettings, setListDisplaySettings] = useLocalStorage<ListDisplaySettings>('crm-listSettings', {
        showStatus: true, showValue: true, showTags: true, showLastActivity: true, showEmail: true, showPhone: false, showCreatedAt: true, showAssignedTo: false,
    });
    const [minimizedLeads, setMinimizedLeads] = useLocalStorage<Id[]>('crm-minimizedLeads', []);
    const [minimizedColumns, setMinimizedColumns] = useLocalStorage<Id[]>('crm-minimizedColumns', []);
    const [listSelectedTags, setListSelectedTags] = useState<Tag[]>([]);
    const [listStatusFilter, setListStatusFilter] = useState<'all' | 'Ganho' | 'Perdido'>('all');
    const [selectedGroupForView, setSelectedGroupForView] = useState<Id | null>(null);

    const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => setNotification({ message, type }), []);

    // Theme effect
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            localStorage.setItem('crm-theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('crm-theme', 'light');
        }
    }, [theme]);

    // Switch to standard inbox mode when leaving Inbox view
    useEffect(() => {
        if (activeView !== 'Inbox') {
            setInboxMode('standard');
        }
    }, [activeView]);

    const isSeller = currentUserRole === 'seller';
    const { notifyLeadCreated, notifyLeadWon, notifyLeadLost, notifyLeadReactivation } =
        useNotificationActions(isSeller ? companyId : null, isSeller ? authUser?.id ?? null : null);

    const { credentials } = useAIProviders();
    const isAiConfigured =
        credentials.gemini.status === 'connected' ||
        credentials.openai.status === 'connected' ||
        credentials.anthropic.status === 'connected';

    const handleOpenSdrBot = () => { setSdrBotOpen(true); };

    // Reactivation Task/Notification Effect
    useEffect(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        leads.forEach(lead => {
            if (!lead.reactivationDate) return;
            const reactivationDate = new Date(lead.reactivationDate);
            reactivationDate.setHours(0, 0, 0, 0);
            if (reactivationDate > today) return;

            const taskExists = tasks.some(task => task.leadId === lead.id && task.title.includes('Reativar contato'));
            if (taskExists) return;

            const newTask: Omit<Task, 'id'> = {
                userId: localUser.id,
                leadId: lead.id,
                type: 'task',
                title: `Reativar contato: ${lead.name}`,
                description: `Lead perdido por "${lead.lostReason}". Hora de tentar um novo contato.`,
                dueDate: new Date().toISOString(),
                status: 'pending',
            };
            createTask(newTask).then(() => {
                notifyLeadReactivation(lead.name, String(lead.id)).catch(safeError);
                showNotification(`Você tem leads para reativar hoje.`, 'info');
            }).catch(safeError);
        });
    }, [leads, tasks, createTask, notifyLeadReactivation, showNotification]);

    // --- COMPUTED DATA ---
    const unreadCount = notifUnreadCount;

    const calculateProbabilityForStage = useCallback((stageId: Id, allColumns: ColumnData[]): number => {
        const stage = allColumns.find(c => c.id === stageId);
        if (!stage) return 0;
        if (stage.type === 'lost') return 0;
        if (stage.type === 'won') return 100;

        const openStages = allColumns.filter(c => c.type === 'open' || c.type === 'qualification');
        const followUpStages = allColumns.filter(c => c.type === 'follow-up');
        const schedulingStages = allColumns.filter(c => c.type === 'scheduling');

        if (stage.type === 'open' || stage.type === 'qualification') {
            const currentIndex = openStages.findIndex(c => c.id === stageId);
            const total = openStages.length;
            if (total <= 1) return 25;
            return Math.round(10 + (currentIndex / (total - 1)) * 40);
        }
        if (stage.type === 'follow-up') {
            const currentIndex = followUpStages.findIndex(c => c.id === stageId);
            const total = followUpStages.length;
            if (total <= 1) return 60;
            return Math.round(41 + (currentIndex / (total - 1)) * 39);
        }
        if (stage.type === 'scheduling') {
            const currentIndex = schedulingStages.findIndex(c => c.id === stageId);
            const total = schedulingStages.length;
            if (total <= 1) return 90;
            return Math.round(81 + (currentIndex / (total - 1)) * 18);
        }
        return 0;
    }, []);

    const searchedLeads = useMemo(() => {
        const isAdmin = currentUserRole === 'admin';
        const isListView = activeView === 'Leads' || activeView === 'Clientes';

        safeLog('DEBUG activeView:', activeView);
        safeLog('DEBUG currentUserRole:', currentUserRole);
        safeLog('DEBUG isListView:', isListView);

        let baseLeads: Lead[];
        if (isAdmin && isListView) {
            baseLeads = leads;
        } else if (isAdmin) {
            baseLeads = leads.filter(l => l.boardId === activeBoardId);
        } else {
            baseLeads = leads.filter(l => l.boardId === activeBoardId && l.ownerId === authUser?.id);
        }

        if (isListView) {
            return baseLeads.filter(lead => {
                const statusMatch = listStatusFilter === 'all' ||
                    (listStatusFilter === 'Perdido'
                        ? getLeadComputedStatus(lead, columns.find(c => c.id === lead.columnId)?.type) === 'perdido'
                        : lead.status === 'GANHO');
                const tagMatch = listSelectedTags.length === 0 || listSelectedTags.every(st => lead.tags.some(lt => lt.id === st.id));
                return statusMatch && tagMatch;
            });
        }
        return baseLeads;
    }, [leads, columns, activeView, listStatusFilter, listSelectedTags, activeBoardId, currentUserRole, authUser?.id]);

    const analysisForGroup = useMemo(
        () => (selectedGroupForView ? groupAnalyses.find(a => a.groupId === selectedGroupForView) || null : null),
        [groupAnalyses, selectedGroupForView]
    );

    // --- HANDLERS ---

    const createActivityLog = useCallback(async (leadId: Id, type: Activity['type'], text: string) => {
        try {
            await createActivity({
                leadId,
                type,
                text,
                authorName: localUser.name || 'Sistema',
                timestamp: new Date().toISOString(),
            });
        } catch (err) {
            safeError('Failed to log activity:', err);
        }
    }, [createActivity, localUser.name]);

    const handleCreateOrUpdateLead = async (data: CreateLeadData | UpdateLeadData) => {
        const now = new Date().toISOString();
        try {
            if (editingLead && editingLead.id) {
                const oldLead = leads.find(l => l.id === editingLead.id)!;
                const newColumnId = data.columnId || oldLead.columnId;
                const newProbability = calculateProbabilityForStage(newColumnId, columns);
                const updates: Partial<Lead> = {
                    ...data,
                    probability: newProbability,
                    lastActivityTimestamp: now,
                    lastActivityType: 'edited',
                };
                await updateLead(editingLead.id, updates);
                showNotification(`Lead "${data.name || oldLead.name}" atualizado.`, 'info');
                await createActivityLog(editingLead.id, 'note', 'Lead atualizado.');
            } else {
                if (!activeBoardId) {
                    showNotification('Nenhum pipeline carregado. Aguarde e tente novamente.', 'warning');
                    return;
                }
                const defaultColumn = columns.find(c => c.type === 'open') ?? columns[0];
                if (!defaultColumn) {
                    showNotification('Nenhuma coluna disponível. Aguarde carregar o pipeline.', 'warning');
                    return;
                }
                const newColumnId = data.columnId || defaultColumn.id;
                const newLead: Omit<Lead, 'id'> = {
                    ...data,
                    boardId: activeBoardId,
                    columnId: newColumnId,
                    name: data.name || 'Novo Lead',
                    company: data.company || '',
                    value: data.value || 0,
                    avatarUrl: data.avatarUrl || `https://i.pravatar.cc/150?u=${Date.now()}`,
                    tags: data.tags || [],
                    lastActivityTimestamp: now,
                    lastActivityType: 'created',
                    createdAt: now,
                    qualificationStatus: 'pending',
                    probability: calculateProbabilityForStage(newColumnId, columns),
                };
                const created = await createLead(newLead);
                showNotification(`Lead "${created.name}" criado.`, 'info');
                notifyLeadCreated(localUser.name, created.name).catch(() => {});
            }
        } catch (err) {
            safeError('Failed to save lead:', err);
            showNotification('Erro ao salvar lead.', 'error');
        }
        setCreateLeadModalOpen(false);
        setEditingLead(null);
    };

    const handleDeleteLead = async (leadId: Id) => {
        try {
            await deleteLead(leadId);
            setSelectedLead(null);
            showNotification('Lead deletado.', 'success');
        } catch (err) {
            safeError('Failed to delete lead:', err);
            showNotification('Erro ao deletar lead.', 'error');
        }
    };

    const handleUpdateLeadColumn = async (leadId: Id, newColumnId: Id, isAutomated: boolean = false) => {
        const leadToMove = leads.find(l => l.id === leadId);
        const newColumn = columns.find(c => c.id === newColumnId);
        const oldColumn = columns.find(c => c.id === leadToMove?.columnId)
            ?? boards.flatMap(b => b.columns).find(c => c.id === leadToMove?.columnId);

        if (!leadToMove || !newColumn) return;

        if (newColumn.type === 'lost' && leadToMove.columnId !== newColumn.id) {
            setLostLeadInfo({ lead: leadToMove, columnId: newColumnId });
            return;
        }

        const now = new Date().toISOString();
        const newProbability = calculateProbabilityForStage(newColumnId, columns);
        const isWon = newColumn.type === 'won' && oldColumn?.type !== 'won';
        const isLeavingWon = oldColumn?.type === 'won' && newColumn.type !== 'won';

        let updates: Partial<Lead> = {
            columnId: newColumnId,
            lastActivityTimestamp: now,
            lastActivityType: 'move_stage',
            probability: newProbability,
            ...(isWon ? { status: 'GANHO', wonAt: now } : {}),
            ...(isLeavingWon ? { status: 'ATIVO', wonAt: null } : {}),
        };

        if (leadToMove.activePlaybook && !leadToMove.playbookHistory?.some(h => h.playbookId === leadToMove.activePlaybook?.playbookId)) {
            const playbookDef = playbooks.find(p => p.id === leadToMove.activePlaybook?.playbookId);
            if (playbookDef && !playbookDef.stages.includes(newColumnId)) {
                const historyEntry: PlaybookHistoryEntry = {
                    playbookId: leadToMove.activePlaybook.playbookId,
                    playbookName: leadToMove.activePlaybook.playbookName,
                    startedAt: leadToMove.activePlaybook.startedAt,
                    completedAt: now,
                };
                updates.playbookHistory = [...(leadToMove.playbookHistory || []), historyEntry];
                updates.activePlaybook = undefined;
                const tasksToDelete = tasks.filter(t => t.leadId === leadId && t.playbookId === historyEntry.playbookId && t.status === 'pending');
                await deleteManyTasks(tasksToDelete.map(t => t.id));
            }
        }

        const lastCompletedPlaybook = (updates.playbookHistory ?? leadToMove.playbookHistory)?.[
            (updates.playbookHistory ?? leadToMove.playbookHistory ?? []).length - 1
        ];
        if (lastCompletedPlaybook) {
            const playbookDef = playbooks.find(p => p.id === lastCompletedPlaybook.playbookId);
            if (playbookDef?.stages.includes(newColumnId)) {
                updates.activePlaybook = {
                    playbookId: lastCompletedPlaybook.playbookId,
                    playbookName: lastCompletedPlaybook.playbookName,
                    startedAt: lastCompletedPlaybook.startedAt,
                };
                updates.playbookHistory = (updates.playbookHistory ?? leadToMove.playbookHistory ?? []).slice(0, -1);
                showNotification(`Playbook "${updates.activePlaybook.playbookName}" reativado.`, 'info');
            }
        }

        try {
            await updateLead(leadId, updates);
            if (isWon) {
                notifyLeadWon(localUser.name, leadToMove.name, leadToMove.value ?? 0).catch(() => {});
            }
        } catch (err) {
            safeError('Failed to move lead:', err);
            showNotification('Erro ao mover lead.', 'error');
            return;
        }

        if (newColumn.type === 'scheduling' && oldColumn?.type !== 'scheduling') {
            const newTask: Omit<Task, 'id'> = {
                userId: localUser.id,
                leadId,
                type: 'meeting',
                title: `Agendar reunião com ${leadToMove.name}`,
                description: 'Lead movido para o estágio de agendamento.',
                dueDate: new Date().toISOString(),
                status: 'pending',
            };
            createTask(newTask).catch(safeError);
            showNotification(`Tarefa de agendamento criada para ${leadToMove.name}.`, 'info');
        }

        if (oldColumn && oldColumn.id !== newColumn.id && !isAutomated) {
            createActivityLog(leadId, 'status_change', `Movido de "${oldColumn.title}" para "${newColumn.title}".`);
        }
    };

    const handleProcessLostLead = async (reason: string, reactivationDate: string | null) => {
        if (!lostLeadInfo) return;
        const { lead, columnId } = lostLeadInfo;
        const now = new Date().toISOString();
        const updates: Partial<Lead> = {
            columnId,
            lastActivityTimestamp: now,
            lastActivityType: 'lost',
            probability: calculateProbabilityForStage(columnId, columns),
            lostReason: reason,
            reactivationDate: reactivationDate ? new Date(reactivationDate).toISOString() : undefined,
            status: reactivationDate ? 'PERDIDO' : 'ENCERRADO',
        };
        try {
            await updateLead(lead.id, updates);
            createActivityLog(lead.id, 'status_change', `Lead movido para "${columns.find(c => c.id === columnId)?.title}" (Motivo: ${reason}).`);
            notifyLeadLost(localUser.name, lead.name, lead.value ?? 0).catch(() => {});
        } catch (err) {
            safeError('Failed to process lost lead:', err);
            showNotification('Erro ao processar lead perdido.', 'error');
        }
        setLostLeadInfo(null);
    };

    const handleReactivateLead = async (leadId: Id) => {
        const lead = leads.find(l => l.id === leadId);
        if (!lead) return;
        const firstColumn = columns.find(c => c.type === 'open' || c.type === 'qualification') ?? columns[0];
        if (!firstColumn) return;
        const updates: Partial<Lead> = {
            columnId: firstColumn.id,
            status: undefined,
            lostReason: undefined,
            reactivationDate: undefined,
            lastActivityTimestamp: new Date().toISOString(),
            lastActivityType: 'reactivated',
            probability: calculateProbabilityForStage(firstColumn.id, columns),
        };
        try {
            await updateLead(leadId, updates);
            showNotification(`Lead "${lead.name}" foi reativado!`, 'success');
            createActivityLog(leadId, 'status_change', 'Lead reativado da lista de recuperação.');
        } catch (err) {
            safeError('Failed to reactivate lead:', err);
            showNotification('Erro ao reativar lead.', 'error');
        }
    };

    const handleCreateOrUpdateTask = async (data: CreateTaskData | UpdateTaskData) => {
        try {
            if (editingTask && editingTask.id) {
                await updateTaskInDb(editingTask.id, data as Partial<Task>);
                showNotification(`Tarefa "${(data as any).title || editingTask.title}" atualizada.`, 'success');
            } else {
                const newTask: Omit<Task, 'id'> = { userId: localUser.id, ...(data as CreateTaskData) };
                const created = await createTask(newTask);
                showNotification(`Tarefa "${created.title}" criada.`, 'success');
            }
        } catch (err) {
            safeError('Failed to save task:', err);
            showNotification('Erro ao salvar tarefa.', 'error');
        }
        setCreateTaskModalOpen(false);
        setEditingTask(null);
        setPreselectedDataForTask(null);
    };

    const handleDeleteTask = async (taskId: Id) => {
        try {
            await deleteTaskInDb(taskId);
            showNotification('Tarefa deletada.', 'success');
        } catch (err) {
            safeError('Failed to delete task:', err);
            showNotification('Erro ao deletar tarefa.', 'error');
        }
    };

    const handleUpdateTaskStatus = async (taskId: Id, status: 'pending' | 'completed') => {
        try {
            await updateTaskInDb(taskId, { status });
        } catch (err) {
            safeError('Failed to update task status:', err);
            showNotification('Erro ao atualizar tarefa.', 'error');
            return;
        }

        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const lead = leads.find(l => l.id === task.leadId);
        if (lead?.activePlaybook && task.playbookId === lead.activePlaybook.playbookId) {
            const playbook = playbooks.find(p => p.id === task.playbookId);
            if (playbook) {
                const allPlaybookTasks = tasks.filter(t => t.leadId === lead.id && t.playbookId === playbook.id);
                const otherTasks = allPlaybookTasks.filter(t => t.id !== taskId);
                const areAllOtherTasksCompleted = otherTasks.every(t => t.status === 'completed');
                if (status === 'completed' && areAllOtherTasksCompleted) {
                    const currentStageIndex = columns.findIndex(c => c.id === lead.columnId);
                    const nextColumn = columns[currentStageIndex + 1];
                    if (nextColumn) {
                        handleUpdateLeadColumn(lead.id, nextColumn.id, true);
                    }
                }
            }
        }
    };

    const handleSelectLeadForPlaybook = (leadId: Id) => {
        setSelectedLeadForPlaybookId(prev => prev === leadId ? null : leadId);
    };

    const handleApplyPlaybook = async (playbookId: Id) => {
        if (!selectedLeadForPlaybook) return;
        const playbook = playbooks.find(p => p.id === playbookId);
        if (!playbook) return;

        const now = new Date();
        const newTasks: Array<Omit<Task, 'id'>> = playbook.steps.map((step, index) => {
            const dueDate = new Date(now);
            dueDate.setDate(now.getDate() + step.day);
            return {
                userId: localUser.id,
                leadId: selectedLeadForPlaybook.id,
                type: step.type,
                title: step.instructions,
                dueDate: dueDate.toISOString(),
                status: 'pending',
                playbookId: playbook.id,
                playbookStepIndex: index,
            };
        });

        try {
            await createManyTasks(newTasks);
            await updateLead(selectedLeadForPlaybook.id, {
                activePlaybook: {
                    playbookId: playbook.id,
                    playbookName: playbook.name,
                    startedAt: new Date().toISOString(),
                },
            });
            showNotification(`Playbook "${playbook.name}" aplicado a ${selectedLeadForPlaybook.name}.`, 'success');
        } catch (err) {
            safeError('Failed to apply playbook:', err);
            showNotification('Erro ao aplicar playbook.', 'error');
        }
        setPlaybookModalOpen(false);
        setSelectedLeadForPlaybookId(null);
    };

    const handleDeactivatePlaybook = async (leadId: Id) => {
        const lead = leads.find(l => l.id === leadId);
        if (!lead || !lead.activePlaybook) return;
        const playbookId = lead.activePlaybook.playbookId;
        const tasksToDelete = tasks.filter(t => t.leadId === leadId && t.playbookId === playbookId && t.status === 'pending');
        try {
            await deleteManyTasks(tasksToDelete.map(t => t.id));
            await updateLead(leadId, { activePlaybook: undefined });
            setSelectedLead(prev => prev?.id === leadId ? { ...prev, activePlaybook: undefined } : prev);
            showNotification(`Cadência desativada para ${lead.name}.`, 'info');
        } catch (err) {
            safeError('Failed to deactivate playbook:', err);
            showNotification('Erro ao desativar cadência.', 'error');
        }
    };

    const handleCreateOrUpdateGroup = async (data: CreateGroupData | UpdateGroupData) => {
        try {
            if (editingGroup && editingGroup.id) {
                await updateGroupInDb(editingGroup.id, { ...editingGroup, ...data });
                showNotification(`Grupo "${data.name}" atualizado.`, 'success');
            } else {
                const created = await createGroup(data as CreateGroupData);
                showNotification(`Grupo "${created.name}" criado.`, 'success');
            }
            setGroupModalOpen(false);
            setEditingGroup(null);
        } catch (err: any) {
            showNotification(err.message ?? 'Erro ao salvar grupo.', 'error');
        }
    };

    const handleDeleteGroup = async (groupId: Id) => {
        try {
            await deleteGroupInDb(groupId);
            showNotification('Grupo deletado.', 'success');
        } catch {
            showNotification('Erro ao deletar grupo.', 'error');
        }
    };

    const handleCreateOrUpdateGroupAnalysis = async (data: CreateGroupAnalysisData | UpdateGroupAnalysisData, analysisId?: Id) => {
        await createOrUpdateAnalysisInDb(data, analysisId);
        showNotification(analysisId ? 'Análise atualizada.' : 'Análise salva.', 'success');
    };

    const handleDeleteGroupAnalysis = async (analysisId: Id) => {
        await deleteAnalysisInDb(analysisId);
        showNotification('Rascunho da análise descartado.', 'info');
    };

    const handleExportPDF = (leadsToExport: Lead[]) => { setLeadsToPrint(leadsToExport); };

    const handleCreateBoard = async (newBoardData: Omit<Board, 'id'>) => {
        const newBoardId = await createBoard(newBoardData);
        if (newBoardId) {
            setActiveBoardId(newBoardId);
            setActiveView('Pipeline');
            showNotification(`Board "${newBoardData.name}" criado com sucesso!`, 'success');
        } else {
            showNotification('Erro ao criar board. Verifique as permissões e tente novamente.', 'error');
        }
    };

    const handleDeleteBoard = async (boardId: Id) => {
        if (boards.length <= 1) {
            showNotification('Não é possível excluir o único board existente.', 'warning');
            return;
        }
        const remainingBoards = boards.filter(b => b.id !== boardId);
        const needsSwitch = activeBoardId === boardId;
        const success = await deleteBoard(boardId);
        if (success) {
            if (needsSwitch && remainingBoards.length > 0) {
                setActiveBoardId(remainingBoards[0].id);
            }
            showNotification('Board excluído com sucesso.', 'success');
        } else {
            showNotification('Erro ao excluir board.', 'error');
        }
    };

    const handleUpdateBoard = (boardId: Id, updates: Partial<Board>) => {
        setBoards(prev => prev.map(b => b.id === boardId ? { ...b, ...updates } : b));
        showNotification('Board atualizado com sucesso.', 'success');
    };

    const handleImportBoards = (importedBoards: Board[]) => {
        setBoards(prev => {
            const existingIds = new Set(prev.map(b => b.id));
            const newBoards = importedBoards.filter(b => !existingIds.has(b.id));
            return [...prev, ...newBoards];
        });
        showNotification(`${importedBoards.length} board(s) importado(s) com sucesso!`, 'success');
    };

    const handleCardClick = (lead: Lead) => {
        setSelectedLead(lead);
        setSelectedLeadForPlaybookId(lead.id);
    };

    const handleStartAnalysis = () => {
        setActiveView('Inbox');
        setInboxMode('analysis');
    };

    return {
        // Auth
        authUser, logout, companyId, currentUserRole, localUser,
        // Supabase data
        leads, createLead, updateLead, deleteLead, bulkUpdateLeads,
        activities, createActivity,
        tasks, createTask, createManyTasks, updateTaskInDb, deleteTaskInDb, deleteManyTasks,
        users, refetchUsers,
        boards, setBoards, activeBoardId, setActiveBoardId, createBoard, saveBoardStages, deleteBoard, boardsLoading,
        columns, setColumns, activeBoard,
        // data
        tags, createTag, updateTag: updateTagInDb, deleteTag,
        emailDrafts, setEmailDrafts,
        conversations, setConversations,
        messages, setMessages,
        groups, createGroup, updateGroupInDb, deleteGroupInDb,
        groupAnalyses,
        playbooks, setPlaybooks: replacePlaybooks,
        // UI state
        activeView, setActiveView,
        inboxMode, setInboxMode,
        isSidebarCollapsed, setSidebarCollapsed,
        theme, setTheme,
        isChatEnabled,
        // Modal states
        selectedLead, setSelectedLead,
        isCreateLeadModalOpen, setCreateLeadModalOpen,
        editingLead, setEditingLead,
        isCreateTaskModalOpen, setCreateTaskModalOpen,
        editingTask, setEditingTask,
        preselectedDataForTask, setPreselectedDataForTask,
        isGroupModalOpen, setGroupModalOpen,
        editingGroup, setEditingGroup,
        lostLeadInfo, setLostLeadInfo,
        isSdrBotOpen, setSdrBotOpen,
        isCreateBoardModalOpen, setCreateBoardModalOpen,
        settingsTab, setSettingsTab,
        notification, setNotification,
        selectedLeadForPlaybookId, setSelectedLeadForPlaybookId,
        isPlaybookModalOpen, setPlaybookModalOpen,
        selectedLeadForPlaybook,
        leadsToPrint, setLeadsToPrint,
        // Display settings
        cardDisplaySettings, setCardDisplaySettings,
        listDisplaySettings, setListDisplaySettings,
        minimizedLeads, setMinimizedLeads,
        minimizedColumns, setMinimizedColumns,
        listSelectedTags, setListSelectedTags,
        listStatusFilter, setListStatusFilter,
        selectedGroupForView, setSelectedGroupForView,
        // Computed
        unreadCount, searchedLeads, analysisForGroup, calculateProbabilityForStage,
        isAiConfigured,
        // Handlers
        showNotification,
        handleOpenSdrBot,
        createActivityLog,
        handleCreateOrUpdateLead,
        handleDeleteLead,
        handleUpdateLeadColumn,
        handleProcessLostLead,
        handleReactivateLead,
        handleCreateOrUpdateTask,
        handleDeleteTask,
        handleUpdateTaskStatus,
        handleSelectLeadForPlaybook,
        handleApplyPlaybook,
        handleDeactivatePlaybook,
        handleCreateOrUpdateGroup,
        handleDeleteGroup,
        handleCreateOrUpdateGroupAnalysis,
        handleDeleteGroupAnalysis,
        handleExportPDF,
        handleCreateBoard,
        handleDeleteBoard,
        handleUpdateBoard,
        handleImportBoards,
        handleCardClick,
        handleStartAnalysis,
        onUpdateUsers: () => { refetchUsers(); },
    };
}
