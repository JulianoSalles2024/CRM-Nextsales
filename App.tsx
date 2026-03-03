import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import KanbanBoard from './components/KanbanBoard';
import Dashboard from './components/Dashboard';
import LeadDetailSlideover from './components/LeadDetailSlideover';
import CreateEditLeadModal from './components/CreateEditLeadModal';
import CreateEditTaskModal from './components/CreateEditTaskModal';
import Notification from './components/Notification';
import SettingsPage from './components/SettingsPage';
import ActivitiesView from './components/ActivitiesView';
import CalendarPage from './components/CalendarPage';
import ReportsPage from './components/ReportsPage';
import LeadListView from './components/LeadListView';
import ChatView from './components/ChatView';
import GroupsView from './components/GroupsView';
import GroupsDashboard from './components/GroupsDashboard';
import CreateEditGroupModal from './components/CreateEditGroupModal';
import CreateBoardModal from './components/CreateBoardModal';
import IntegrationsPage from './components/IntegrationsPage';
import NotificationsView from './components/NotificationsView';
import PlaybookModal from './components/PlaybookModal';
import PlaybookSettings from './components/PlaybookSettings';
import PrintableLeadsReport from './components/PrintableLeadsReport';
import LostLeadModal from './components/LostLeadModal';
import RecoveryView from './components/RecoveryView';
import InboxView from './components/InboxView';
import SdrBotModal from './components/SdrBotModal';
import SdrAssistantChat from './components/SdrAssistantChat';

// Router
import { AppRouter } from '@/src/app/AppRouter';

// AI Credentials
import { useAIProviders } from '@/src/features/ai-credentials/useAIProviders';

// Auth
import { useAuth } from '@/src/features/auth/AuthContext';

// Supabase hooks
import { useLeads } from '@/src/hooks/useLeads';
import { useTasks } from '@/src/hooks/useTasks';
import { useActivities } from '@/src/hooks/useActivities';
import { useBoards } from '@/src/hooks/useBoards';
import { useUsers } from '@/src/hooks/useUsers';

// Types
import type { User, ColumnData, Lead, Activity, Task, Id, CreateLeadData, UpdateLeadData, CreateTaskData, UpdateTaskData, CardDisplaySettings, ListDisplaySettings, Tag, EmailDraft, CreateEmailDraftData, ChatConversation, ChatMessage, ChatConversationStatus, Group, CreateGroupData, UpdateGroupData, ChatChannel, GroupAnalysis, CreateGroupAnalysisData, UpdateGroupAnalysisData, Notification as NotificationType, Playbook, PlaybookHistoryEntry, Board } from './types';

// Data (UI-only initial values — no leads/tasks/activities)
import { initialTags, initialGroups, initialConversations, initialMessages, initialNotifications, initialPlaybooks } from './data';


// --- Local Storage Hook (for UI preferences only) ---
function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(error);
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
                console.error('Error saving to localStorage:', error);
            }
        }, 500);

        return () => clearTimeout(handler);
    }, [key, storedValue]);

    return [storedValue, setStoredValue];
}


const App: React.FC = () => {
    const { user: authUser, logout, companyId } = useAuth();

    const localUser: User = {
        id: authUser?.id ?? 'local-user',
        name: authUser?.user_metadata?.full_name ?? authUser?.email ?? 'Usuário',
        email: authUser?.email ?? '',
        role: 'Admin',
        joinedAt: authUser?.created_at ?? new Date().toISOString(),
    };

    // --- SUPABASE STATE (leads, tasks, activities) ---
    const { leads, createLead, updateLead, deleteLead, bulkUpdateLeads } = useLeads(companyId);
    const { activities, createActivity } = useActivities(companyId);
    const {
        tasks,
        createTask,
        createManyTasks,
        updateTask: updateTaskInDb,
        deleteTask: deleteTaskInDb,
        deleteManyTasks,
    } = useTasks(companyId);

    // --- LOCAL STORAGE STATE (UI preferences + non-migrated data) ---
    // users now comes from Supabase profiles (not localStorage)
    const { users, refetch: refetchUsers } = useUsers(companyId);

    // Boards + stages from Supabase (replaces localStorage crm-boards)
    const { boards, setBoards, activeBoardId, setActiveBoardId } = useBoards(companyId);

    const activeBoard = useMemo(() => boards.find(b => b.id === activeBoardId) ?? boards[0], [boards, activeBoardId]);
    const columns = activeBoard?.columns ?? [];

    const setColumns = useCallback((newColumnsOrUpdater: ColumnData[] | ((prev: ColumnData[]) => ColumnData[])) => {
        setBoards(currentBoards => {
            return currentBoards.map(board => {
                if (board.id === activeBoardId) {
                    const newColumns = typeof newColumnsOrUpdater === 'function'
                        ? newColumnsOrUpdater(board.columns)
                        : newColumnsOrUpdater;
                    return { ...board, columns: newColumns };
                }
                return board;
            });
        });
    }, [activeBoardId, setBoards]);

    const [tags, setTags] = useLocalStorage<Tag[]>('crm-tags', initialTags);
    const [emailDrafts, setEmailDrafts] = useLocalStorage<EmailDraft[]>('crm-emailDrafts', []);
    const [conversations, setConversations] = useLocalStorage<ChatConversation[]>('crm-conversations', initialConversations);
    const [messages, setMessages] = useLocalStorage<ChatMessage[]>('crm-messages', initialMessages);
    const [groups, setGroups] = useLocalStorage<Group[]>('crm-groups', initialGroups);
    const [groupAnalyses, setGroupAnalyses] = useLocalStorage<GroupAnalysis[]>('crm-groupAnalyses', []);
    const [notifications, setNotifications] = useLocalStorage<NotificationType[]>('crm-notifications', initialNotifications);
    const [playbooks, setPlaybooks] = useLocalStorage<Playbook[]>('crm-playbooks', initialPlaybooks);

    const [activeView, setActiveView] = useState('Inbox');
    const [inboxMode, setInboxMode] = useState<'standard' | 'analysis'>('standard');
    const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('crm-theme') as 'dark' | 'light') || 'dark');
    const [isChatEnabled, setIsChatEnabled] = useState(false);

    // Modal & Slideover States
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isCreateLeadModalOpen, setCreateLeadModalOpen] = useState(false);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [isCreateTaskModalOpen, setCreateTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [preselectedDataForTask, setPreselectedDataForTask] = useState<{leadId: Id, date?: string} | null>(null);
    const [isGroupModalOpen, setGroupModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<Group | null>(null);
    const [lostLeadInfo, setLostLeadInfo] = useState<{lead: Lead, columnId: Id} | null>(null);
    const [isSdrBotOpen, setSdrBotOpen] = useState(false);
    const [isCreateBoardModalOpen, setCreateBoardModalOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState<string | undefined>(undefined);

    // Notification State
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

    // Playbook states
    const [selectedLeadForPlaybookId, setSelectedLeadForPlaybookId] = useState<Id | null>(null);
    const [isPlaybookModalOpen, setPlaybookModalOpen] = useState(false);
    const selectedLeadForPlaybook = useMemo(() => leads.find(l => l.id === selectedLeadForPlaybookId), [leads, selectedLeadForPlaybookId]);

    // Printing state
    const [leadsToPrint, setLeadsToPrint] = useState<Lead[] | null>(null);

    // Display Settings (UI preferences — stay in localStorage)
    const [cardDisplaySettings, setCardDisplaySettings] = useLocalStorage<CardDisplaySettings>('crm-cardSettings', {
        showCompany: true, showSegment: true, showValue: true, showTags: true, showAssignedTo: true, showDueDate: false, showProbability: true, showEmail: false, showPhone: false, showCreatedAt: false, showStage: false,
    });
    const [listDisplaySettings, setListDisplaySettings] = useLocalStorage<ListDisplaySettings>('crm-listSettings', {
        showStatus: true, showValue: true, showTags: true, showLastActivity: true, showEmail: true, showPhone: false, showCreatedAt: true,
    });
    const [minimizedLeads, setMinimizedLeads] = useLocalStorage<Id[]>('crm-minimizedLeads', []);
    const [minimizedColumns, setMinimizedColumns] = useLocalStorage<Id[]>('crm-minimizedColumns', []);
    const [listSelectedTags, setListSelectedTags] = useState<Tag[]>([]);
    const [listStatusFilter, setListStatusFilter] = useState<'all' | 'Ativo' | 'Inativo'>('all');
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

    const { credentials } = useAIProviders();
    const isAiConfigured =
        credentials.gemini.status === 'connected' ||
        credentials.openai.status === 'connected' ||
        credentials.anthropic.status === 'connected';

    const handleOpenSdrBot = () => {
        setSdrBotOpen(true);
    };

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
                setNotifications(current => [...current, {
                    id: `notif-reactivate-${lead.id}`,
                    userId: localUser.id,
                    type: 'lead_reactivation',
                    text: `Lembrete para reativar o lead "${lead.name}" hoje.`,
                    link: { view: 'Recuperação', leadId: lead.id },
                    isRead: false,
                    createdAt: new Date().toISOString(),
                }]);
                showNotification(`Você tem leads para reativar hoje.`, 'info');
            }).catch(console.error);
        });
    }, [leads, tasks, createTask, setNotifications, showNotification]);


    // --- COMPUTED DATA ---
    const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

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
        const boardLeads = leads.filter(l => l.boardId === activeBoardId);

        if (activeView === 'Leads' || activeView === 'Clientes') {
            return boardLeads.filter(lead => {
                const statusMatch = listStatusFilter === 'all' || lead.status === listStatusFilter;
                const tagMatch = listSelectedTags.length === 0 || listSelectedTags.every(st => lead.tags.some(lt => lt.id === st.id));
                return statusMatch && tagMatch;
            });
        }
        return boardLeads;
    }, [leads, activeView, listStatusFilter, listSelectedTags, activeBoardId]);

    const analysisForGroup = useMemo(() => (selectedGroupForView ? groupAnalyses.find(a => a.groupId === selectedGroupForView) || null : null), [groupAnalyses, selectedGroupForView]);


    // --- HANDLERS ---

    // Activity Log
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
            console.error('Failed to log activity:', err);
        }
    }, [createActivity, localUser.name]);

    // Leads
    const handleCreateOrUpdateLead = async (data: CreateLeadData | UpdateLeadData) => {
        const now = new Date().toISOString();
        try {
            if (editingLead && editingLead.id) { // UPDATE
                const oldLead = leads.find(l => l.id === editingLead.id)!;
                const newColumnId = data.columnId || oldLead.columnId;
                const newProbability = calculateProbabilityForStage(newColumnId, columns);
                const updates: Partial<Lead> = {
                    ...data,
                    probability: newProbability,
                    lastActivity: 'agora',
                    lastActivityTimestamp: now,
                };
                await updateLead(editingLead.id, updates);
                showNotification(`Lead "${data.name || oldLead.name}" atualizado.`, 'success');
                await createActivityLog(editingLead.id, 'note', 'Lead atualizado.');
            } else { // CREATE
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
                    lastActivity: 'agora',
                    lastActivityTimestamp: now,
                    createdAt: now,
                    qualificationStatus: 'pending',
                    probability: calculateProbabilityForStage(newColumnId, columns),
                };
                const created = await createLead(newLead);
                showNotification(`Lead "${created.name}" criado.`, 'success');
            }
        } catch (err) {
            console.error('Failed to save lead:', err);
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
            console.error('Failed to delete lead:', err);
            showNotification('Erro ao deletar lead.', 'error');
        }
    };

    const handleUpdateLeadColumn = async (leadId: Id, newColumnId: Id, isAutomated: boolean = false) => {
        const leadToMove = leads.find(l => l.id === leadId);
        const newColumn = columns.find(c => c.id === newColumnId);
        const oldColumn = columns.find(c => c.id === leadToMove?.columnId);

        if (!leadToMove || !newColumn) return;

        // Lost lead modal
        if (newColumn.type === 'lost' && leadToMove.columnId !== newColumn.id) {
            setLostLeadInfo({ lead: leadToMove, columnId: newColumnId });
            return;
        }

        const now = new Date().toISOString();
        const newProbability = calculateProbabilityForStage(newColumnId, columns);

        const isWon = newColumn.type === 'won' && oldColumn?.type !== 'won';

        let updates: Partial<Lead> = {
            columnId: newColumnId,
            lastActivity: 'agora',
            lastActivityTimestamp: now,
            probability: newProbability,
            ...(isWon ? { status: 'GANHO', wonAt: now } : {}),
        };

        // Playbook logic — check if lead has active playbook leaving its stages
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
                updates.activePlaybook = undefined; // will be sent as null to Supabase

                // Remove pending tasks from this playbook
                const tasksToDelete = tasks.filter(t =>
                    t.leadId === leadId && t.playbookId === historyEntry.playbookId && t.status === 'pending'
                );
                await deleteManyTasks(tasksToDelete.map(t => t.id));
            }
        }

        // Re-activate playbook if moving back to its stage
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
        } catch (err) {
            console.error('Failed to move lead:', err);
            showNotification('Erro ao mover lead.', 'error');
            return;
        }

        // Automation: Create scheduling task
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
            createTask(newTask).catch(console.error);
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
            lastActivity: 'agora',
            lastActivityTimestamp: now,
            probability: calculateProbabilityForStage(columnId, columns),
            lostReason: reason,
            reactivationDate: reactivationDate ? new Date(reactivationDate).toISOString() : undefined,
        };
        try {
            await updateLead(lead.id, updates);
            createActivityLog(lead.id, 'status_change', `Lead movido para "${columns.find(c => c.id === columnId)?.title}" (Motivo: ${reason}).`);
        } catch (err) {
            console.error('Failed to process lost lead:', err);
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
            lostReason: undefined,
            reactivationDate: undefined,
            lastActivity: 'agora',
            lastActivityTimestamp: new Date().toISOString(),
            probability: calculateProbabilityForStage(firstColumn.id, columns),
        };
        try {
            await updateLead(leadId, updates);
            showNotification(`Lead "${lead.name}" foi reativado!`, 'success');
            createActivityLog(leadId, 'status_change', 'Lead reativado da lista de recuperação.');
        } catch (err) {
            console.error('Failed to reactivate lead:', err);
            showNotification('Erro ao reativar lead.', 'error');
        }
    };

    // Tasks
    const handleCreateOrUpdateTask = async (data: CreateTaskData | UpdateTaskData) => {
        try {
            if (editingTask && editingTask.id) { // Update
                await updateTaskInDb(editingTask.id, data as Partial<Task>);
                showNotification(`Tarefa "${(data as any).title || editingTask.title}" atualizada.`, 'success');
            } else { // Create
                const newTask: Omit<Task, 'id'> = {
                    userId: localUser.id,
                    ...(data as CreateTaskData),
                };
                const created = await createTask(newTask);
                showNotification(`Tarefa "${created.title}" criada.`, 'success');
            }
        } catch (err) {
            console.error('Failed to save task:', err);
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
            console.error('Failed to delete task:', err);
            showNotification('Erro ao deletar tarefa.', 'error');
        }
    };

    const handleUpdateTaskStatus = async (taskId: Id, status: 'pending' | 'completed') => {
        try {
            await updateTaskInDb(taskId, { status });
        } catch (err) {
            console.error('Failed to update task status:', err);
            showNotification('Erro ao atualizar tarefa.', 'error');
            return;
        }

        // Check for playbook completion
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

    // Playbooks
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
            console.error('Failed to apply playbook:', err);
            showNotification('Erro ao aplicar playbook.', 'error');
        }
        setPlaybookModalOpen(false);
        setSelectedLeadForPlaybookId(null);
    };

    const handleDeactivatePlaybook = async (leadId: Id) => {
        const lead = leads.find(l => l.id === leadId);
        if (!lead || !lead.activePlaybook) return;

        const playbookId = lead.activePlaybook.playbookId;

        const tasksToDelete = tasks.filter(task =>
            task.leadId === leadId && task.playbookId === playbookId && task.status === 'pending'
        );

        try {
            await deleteManyTasks(tasksToDelete.map(t => t.id));
            await updateLead(leadId, { activePlaybook: undefined });
            setSelectedLead(prev => prev?.id === leadId ? { ...prev, activePlaybook: undefined } : prev);
            showNotification(`Cadência desativada para ${lead.name}.`, 'info');
        } catch (err) {
            console.error('Failed to deactivate playbook:', err);
            showNotification('Erro ao desativar cadência.', 'error');
        }
    };

    // Groups
    const handleCreateOrUpdateGroup = (data: CreateGroupData | UpdateGroupData) => {
        if (editingGroup && editingGroup.id) {
            const updatedGroup: Group = { ...editingGroup, ...data };
            setGroups(current => current.map(g => g.id === editingGroup.id ? updatedGroup : g));
            showNotification(`Grupo "${updatedGroup.name}" atualizado.`, 'success');
        } else {
            const newGroup: Group = { id: `group-${Date.now()}`, ...data as CreateGroupData };
            setGroups(current => [newGroup, ...current]);
            showNotification(`Grupo "${newGroup.name}" criado.`, 'success');
        }
        setGroupModalOpen(false);
        setEditingGroup(null);
    };

    const handleDeleteGroup = (groupId: Id) => {
        setGroups(current => current.filter(g => g.id !== groupId));
        showNotification('Grupo deletado.', 'success');
    };

    // Group Analysis
    const handleCreateOrUpdateGroupAnalysis = (data: CreateGroupAnalysisData | UpdateGroupAnalysisData, analysisId?: Id) => {
        if (analysisId) {
            setGroupAnalyses(current => current.map(a => a.id === analysisId ? { ...a, ...data } : a));
            showNotification('Análise atualizada.', 'success');
        } else {
            const newAnalysis: GroupAnalysis = {
                id: `analysis-${Date.now()}`,
                createdAt: new Date().toISOString(),
                ...data as CreateGroupAnalysisData,
            };
            setGroupAnalyses(current => [...current.filter(a => a.groupId !== (data as CreateGroupAnalysisData).groupId), newAnalysis]);
            showNotification('Análise salva.', 'success');
        }
    };

    const handleDeleteGroupAnalysis = (analysisId: Id) => {
        setGroupAnalyses(current => current.filter(a => a.id !== analysisId));
        showNotification('Rascunho da análise descartado.', 'info');
    };

    const handleExportPDF = (leadsToExport: Lead[]) => {
        setLeadsToPrint(leadsToExport);
    };

    const handleCreateBoard = (newBoardData: Omit<Board, 'id'>) => {
        const newBoard: Board = {
            id: crypto.randomUUID(),
            ...newBoardData,
            isDefault: false,
        };
        setBoards(prev => [...prev, newBoard]);
        setActiveBoardId(newBoard.id);
        showNotification(`Board "${newBoard.name}" criado com sucesso!`, 'success');
    };

    const handleDeleteBoard = (boardId: Id) => {
        if (boards.length <= 1) {
            showNotification('Não é possível excluir o único board existente.', 'warning');
            return;
        }
        setBoards(prev => prev.filter(b => b.id !== boardId));
        if (activeBoardId === boardId) {
            const remainingBoards = boards.filter(b => b.id !== boardId);
            setActiveBoardId(remainingBoards[0].id);
        }
        showNotification('Board excluído com sucesso.', 'success');
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


    // --- RENDER LOGIC ---
    const routerProps = {
        activeView,
        leadsToPrint,
        setLeadsToPrint,
        tasks,
        activities,
        searchedLeads,
        inboxMode,
        notifications,
        setActiveView,
        setNotifications,
        leads,
        columns,
        showNotification,
        handleExportPDF,
        handleStartAnalysis,
        users,
        cardDisplaySettings,
        handleUpdateLeadColumn,
        handleCardClick,
        selectedLeadForPlaybookId,
        setEditingLead,
        setCreateLeadModalOpen,
        setCardDisplaySettings,
        minimizedLeads,
        setMinimizedLeads,
        minimizedColumns,
        setMinimizedColumns,
        selectedLeadForPlaybook,
        setPlaybookModalOpen,
        boards,
        activeBoardId,
        setActiveBoardId,
        setCreateBoardModalOpen,
        handleDeleteBoard,
        playbooks,
        setPlaybooks,
        listDisplaySettings,
        setListDisplaySettings,
        tags,
        listSelectedTags,
        setListSelectedTags,
        listStatusFilter,
        setListStatusFilter,
        setCreateTaskModalOpen,
        setEditingTask,
        handleDeleteTask,
        handleUpdateTaskStatus,
        handleReactivateLead,
        handleDeleteLead,
        conversations,
        messages,
        localUser,
        setMessages,
        setConversations,
        selectedGroupForView,
        setSelectedGroupForView,
        analysisForGroup,
        updateLead,
        bulkUpdateLeads,
        setSelectedLead,
        createActivityLog,
        selectedLead,
        handleCreateOrUpdateGroupAnalysis,
        handleDeleteGroupAnalysis,
        groups,
        setEditingGroup,
        setGroupModalOpen,
        handleDeleteGroup,
        setPreselectedDataForTask,
        settingsTab,
        setColumns,
        calculateProbabilityForStage,
        handleUpdateBoard,
        handleImportBoards,
        onUpdateUsers: () => { refetchUsers(); },
    };

    return (
      <div className="flex h-screen text-zinc-800 dark:text-gray-300">
        <Sidebar
            activeView={activeView}
            onNavigate={setActiveView}
            isCollapsed={isSidebarCollapsed}
            onToggle={() => setSidebarCollapsed(p => !p)}
            isChatEnabled={isChatEnabled}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
            <Header
                currentUser={localUser}
                onLogout={logout}
                theme={theme}
                onThemeToggle={() => setTheme(p => p === 'dark' ? 'light' : 'dark')}
                unreadCount={unreadCount}
                onOpenSdrBot={handleOpenSdrBot}
                activeView={activeView}
            />
            <main className="flex-1 overflow-auto p-6 bg-transparent">
                <AppRouter {...routerProps} />
            </main>
            <footer className="text-center text-xs text-slate-500 py-2">
                © 2026 CRM ZENIUS. Todos os direitos reservados.
            </footer>
        </div>

        <AnimatePresence>
            {selectedLead && (
                <LeadDetailSlideover
                    lead={selectedLead}
                    activities={activities.filter(a => a.leadId === selectedLead.id)}
                    emailDrafts={emailDrafts.filter(d => d.leadId === selectedLead.id)}
                    tasks={tasks}
                    playbooks={playbooks}
                    onClose={() => setSelectedLead(null)}
                    onEdit={() => { setEditingLead(selectedLead); setCreateLeadModalOpen(true); }}
                    onDelete={() => handleDeleteLead(selectedLead.id)}
                    onAddNote={(text) => createActivityLog(selectedLead.id, 'note', text)}
                    onSendEmailActivity={(subject) => createActivityLog(selectedLead.id, 'email_sent', `Email enviado: "${subject}"`)}
                    onAddTask={() => { setPreselectedDataForTask({ leadId: selectedLead.id }); setCreateTaskModalOpen(true); }}
                    onSaveDraft={(data) => {
                        const newDraft: EmailDraft = { ...data, id: `draft-${Date.now()}`, createdAt: new Date().toISOString() };
                        setEmailDrafts(curr => [...curr, newDraft]);
                        showNotification('Rascunho salvo!', 'success');
                    }}
                    onDeleteDraft={(id) => { setEmailDrafts(curr => curr.filter(d => d.id !== id)); showNotification('Rascunho deletado.', 'info'); }}
                    showNotification={showNotification}
                    onUpdateTaskStatus={handleUpdateTaskStatus}
                    onDeactivatePlaybook={() => handleDeactivatePlaybook(selectedLead.id)}
                    onApplyPlaybook={handleApplyPlaybook}
                />
            )}
        </AnimatePresence>

        <AnimatePresence>
            {isCreateLeadModalOpen && (
                <CreateEditLeadModal
                    lead={editingLead}
                    columns={columns}
                    allTags={tags}
                    groups={groups}
                    onClose={() => { setCreateLeadModalOpen(false); setEditingLead(null); }}
                    onSubmit={handleCreateOrUpdateLead}
                />
            )}
        </AnimatePresence>

        <AnimatePresence>
            {isCreateTaskModalOpen && (
                <CreateEditTaskModal
                    task={editingTask}
                    leads={leads}
                    preselectedLeadId={preselectedDataForTask?.leadId}
                    preselectedDate={preselectedDataForTask?.date}
                    onClose={() => { setCreateTaskModalOpen(false); setEditingTask(null); setPreselectedDataForTask(null); }}
                    onSubmit={handleCreateOrUpdateTask}
                />
            )}
        </AnimatePresence>

        <AnimatePresence>
            {isGroupModalOpen && (
                <CreateEditGroupModal
                    group={editingGroup}
                    onClose={() => { setGroupModalOpen(false); setEditingGroup(null); }}
                    onSubmit={handleCreateOrUpdateGroup}
                />
            )}
        </AnimatePresence>

        <AnimatePresence>
            {isPlaybookModalOpen && selectedLeadForPlaybook && (
                <PlaybookModal
                    lead={selectedLeadForPlaybook}
                    playbooks={playbooks}
                    onClose={() => setPlaybookModalOpen(false)}
                    onApply={handleApplyPlaybook}
                />
            )}
        </AnimatePresence>

        <AnimatePresence>
            {lostLeadInfo && (
                <LostLeadModal
                    lead={lostLeadInfo.lead}
                    onClose={() => setLostLeadInfo(null)}
                    onSubmit={handleProcessLostLead}
                />
            )}
        </AnimatePresence>

        <AnimatePresence>
            {isSdrBotOpen && (
                isAiConfigured ? (
                    <SdrAssistantChat
                        onClose={() => setSdrBotOpen(false)}
                        leads={leads}
                        tasks={tasks}
                        columns={columns}
                        activities={activities}
                    />
                ) : (
                    <SdrBotModal
                        onClose={() => setSdrBotOpen(false)}
                        onGoToSettings={() => {
                            setSdrBotOpen(false);
                            setSettingsTab('Inteligência Artificial');
                            setActiveView('Configurações');
                        }}
                    />
                )
            )}
        </AnimatePresence>

        <CreateBoardModal
            isOpen={isCreateBoardModalOpen}
            onClose={() => setCreateBoardModalOpen(false)}
            onCreateBoard={handleCreateBoard}
        />

        <AnimatePresence>
            {notification && (
                <Notification
                    message={notification.message}
                    type={notification.type}
                    onClose={() => setNotification(null)}
                />
            )}
        </AnimatePresence>
      </div>
    );
};

export default App;
