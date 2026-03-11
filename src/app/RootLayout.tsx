import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import { useAppContext } from './AppContext';
import { VIEW_PATHS } from './viewPaths';
import { AppRouter } from '@/src/app/AppRouter';

// Layout components
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

// Modal components
import LeadDetailSlideover from '@/components/LeadDetailSlideover';
import CreateEditLeadModal from '@/components/CreateEditLeadModal';
import CreateEditTaskModal from '@/components/CreateEditTaskModal';
import CreateEditGroupModal from '@/components/CreateEditGroupModal';
import PlaybookModal from '@/components/PlaybookModal';
import LostLeadModal from '@/components/LostLeadModal';
import SdrBotModal from '@/components/SdrBotModal';
import SdrAssistantChat from '@/components/SdrAssistantChat';
import OnboardingModal from '@/src/components/onboarding/OnboardingModal';
import CreateBoardModal from '@/components/CreateBoardModal';
import Notification from '@/src/features/notifications/Notification';

export default function RootLayout() {
    const ctx = useAppContext();
    const navigate = useNavigate();

    // Sync URL with activeView state
    useEffect(() => {
        const path = VIEW_PATHS[ctx.activeView] ?? '/';
        if (window.location.pathname !== path) {
            navigate(path, { replace: true });
        }
    }, [ctx.activeView, navigate]);

    const routerProps = {
        activeView: ctx.activeView,
        leadsToPrint: ctx.leadsToPrint,
        setLeadsToPrint: ctx.setLeadsToPrint,
        tasks: ctx.tasks,
        activities: ctx.activities,
        searchedLeads: ctx.searchedLeads,
        inboxMode: ctx.inboxMode,
        notifications: ctx.notifications,
        setActiveView: ctx.setActiveView,
        setNotifications: ctx.setNotifications,
        leads: ctx.leads,
        columns: ctx.columns,
        showNotification: ctx.showNotification,
        handleExportPDF: ctx.handleExportPDF,
        handleStartAnalysis: ctx.handleStartAnalysis,
        users: ctx.users,
        cardDisplaySettings: ctx.cardDisplaySettings,
        handleUpdateLeadColumn: ctx.handleUpdateLeadColumn,
        handleCardClick: ctx.handleCardClick,
        selectedLeadForPlaybookId: ctx.selectedLeadForPlaybookId,
        setEditingLead: ctx.setEditingLead,
        setCreateLeadModalOpen: ctx.setCreateLeadModalOpen,
        setCardDisplaySettings: ctx.setCardDisplaySettings,
        minimizedLeads: ctx.minimizedLeads,
        setMinimizedLeads: ctx.setMinimizedLeads,
        minimizedColumns: ctx.minimizedColumns,
        setMinimizedColumns: ctx.setMinimizedColumns,
        selectedLeadForPlaybook: ctx.selectedLeadForPlaybook,
        setPlaybookModalOpen: ctx.setPlaybookModalOpen,
        boards: ctx.boards,
        activeBoardId: ctx.activeBoardId,
        setActiveBoardId: ctx.setActiveBoardId,
        setCreateBoardModalOpen: ctx.setCreateBoardModalOpen,
        handleDeleteBoard: ctx.handleDeleteBoard,
        playbooks: ctx.playbooks,
        setPlaybooks: ctx.setPlaybooks,
        listDisplaySettings: ctx.listDisplaySettings,
        setListDisplaySettings: ctx.setListDisplaySettings,
        tags: ctx.tags,
        listSelectedTags: ctx.listSelectedTags,
        setListSelectedTags: ctx.setListSelectedTags,
        listStatusFilter: ctx.listStatusFilter,
        setListStatusFilter: ctx.setListStatusFilter,
        setCreateTaskModalOpen: ctx.setCreateTaskModalOpen,
        setEditingTask: ctx.setEditingTask,
        handleDeleteTask: ctx.handleDeleteTask,
        handleUpdateTaskStatus: ctx.handleUpdateTaskStatus,
        handleReactivateLead: ctx.handleReactivateLead,
        handleDeleteLead: ctx.handleDeleteLead,
        conversations: ctx.conversations,
        messages: ctx.messages,
        localUser: ctx.localUser,
        setMessages: ctx.setMessages,
        setConversations: ctx.setConversations,
        selectedGroupForView: ctx.selectedGroupForView,
        setSelectedGroupForView: ctx.setSelectedGroupForView,
        analysisForGroup: ctx.analysisForGroup,
        updateLead: ctx.updateLead,
        bulkUpdateLeads: ctx.bulkUpdateLeads,
        setSelectedLead: ctx.setSelectedLead,
        createActivityLog: ctx.createActivityLog,
        selectedLead: ctx.selectedLead,
        handleCreateOrUpdateGroupAnalysis: ctx.handleCreateOrUpdateGroupAnalysis,
        handleDeleteGroupAnalysis: ctx.handleDeleteGroupAnalysis,
        groups: ctx.groups,
        setEditingGroup: ctx.setEditingGroup,
        setGroupModalOpen: ctx.setGroupModalOpen,
        handleDeleteGroup: ctx.handleDeleteGroup,
        setPreselectedDataForTask: ctx.setPreselectedDataForTask,
        settingsTab: ctx.settingsTab,
        setColumns: ctx.setColumns,
        saveBoardStages: ctx.saveBoardStages,
        calculateProbabilityForStage: ctx.calculateProbabilityForStage,
        handleUpdateBoard: ctx.handleUpdateBoard,
        handleImportBoards: ctx.handleImportBoards,
        onUpdateUsers: ctx.onUpdateUsers,
    };

    return (
        <div className="flex h-screen text-zinc-800 dark:text-gray-300">
            <Sidebar
                activeView={ctx.activeView}
                onNavigate={ctx.setActiveView}
                isCollapsed={ctx.isSidebarCollapsed}
                onToggle={() => ctx.setSidebarCollapsed((p: boolean) => !p)}
                isChatEnabled={ctx.isChatEnabled}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header
                    currentUser={ctx.localUser}
                    onLogout={ctx.logout}
                    theme={ctx.theme}
                    onThemeToggle={() => ctx.setTheme((p: 'dark' | 'light') => p === 'dark' ? 'light' : 'dark')}
                    unreadCount={ctx.unreadCount}
                    onOpenSdrBot={ctx.handleOpenSdrBot}
                    activeView={ctx.activeView}
                />
                <main className="flex-1 overflow-auto p-6 bg-transparent">
                    <AppRouter {...routerProps} />
                </main>
                <footer className="text-center text-xs text-slate-500 py-2">
                    © 2026 CRM ZENIUS. Todos os direitos reservados.
                </footer>
            </div>

            <AnimatePresence>
                {ctx.selectedLead && (
                    <LeadDetailSlideover
                        lead={ctx.leads.find((l: any) => l.id === ctx.selectedLead!.id) ?? ctx.selectedLead}
                        boards={ctx.boards}
                        activities={ctx.activities.filter((a: any) => a.leadId === ctx.selectedLead!.id)}
                        emailDrafts={ctx.emailDrafts.filter((d: any) => d.leadId === ctx.selectedLead!.id)}
                        tasks={ctx.tasks}
                        playbooks={ctx.playbooks}
                        onClose={() => ctx.setSelectedLead(null)}
                        onEdit={() => { ctx.setEditingLead(ctx.selectedLead); ctx.setCreateLeadModalOpen(true); }}
                        onDelete={() => ctx.handleDeleteLead(ctx.selectedLead!.id)}
                        onMoveStage={(columnId: any) => ctx.handleUpdateLeadColumn(ctx.selectedLead!.id, columnId)}
                        onReopen={() => ctx.handleReactivateLead(ctx.selectedLead!.id)}
                        onAddNote={(text: string) => ctx.createActivityLog(ctx.selectedLead!.id, 'note', text)}
                        onSendEmailActivity={(subject: string) => ctx.createActivityLog(ctx.selectedLead!.id, 'email_sent', `Email enviado: "${subject}"`)}
                        onAddTask={() => { ctx.setPreselectedDataForTask({ leadId: ctx.selectedLead!.id }); ctx.setCreateTaskModalOpen(true); }}
                        onSaveDraft={(data: any) => {
                            const newDraft = { ...data, id: `draft-${Date.now()}`, createdAt: new Date().toISOString() };
                            ctx.setEmailDrafts((curr: any) => [...curr, newDraft]);
                            ctx.showNotification('Rascunho salvo!', 'success');
                        }}
                        onDeleteDraft={(id: any) => {
                            ctx.setEmailDrafts((curr: any) => curr.filter((d: any) => d.id !== id));
                            ctx.showNotification('Rascunho deletado.', 'info');
                        }}
                        showNotification={ctx.showNotification}
                        onUpdateTaskStatus={ctx.handleUpdateTaskStatus}
                        onDeactivatePlaybook={() => ctx.handleDeactivatePlaybook(ctx.selectedLead!.id)}
                        onApplyPlaybook={ctx.handleApplyPlaybook}
                        allTags={ctx.tags}
                        onUpdateLead={(updated: any) => ctx.updateLead(updated.id, updated)}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {ctx.isCreateLeadModalOpen && (
                    <CreateEditLeadModal
                        lead={ctx.editingLead}
                        columns={ctx.columns}
                        allTags={ctx.tags}
                        groups={ctx.groups}
                        onClose={() => { ctx.setCreateLeadModalOpen(false); ctx.setEditingLead(null); }}
                        onSubmit={ctx.handleCreateOrUpdateLead}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {ctx.isCreateTaskModalOpen && (
                    <CreateEditTaskModal
                        task={ctx.editingTask}
                        leads={ctx.leads}
                        preselectedLeadId={ctx.preselectedDataForTask?.leadId}
                        preselectedDate={ctx.preselectedDataForTask?.date}
                        onClose={() => { ctx.setCreateTaskModalOpen(false); ctx.setEditingTask(null); ctx.setPreselectedDataForTask(null); }}
                        onSubmit={ctx.handleCreateOrUpdateTask}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {ctx.isGroupModalOpen && (
                    <CreateEditGroupModal
                        group={ctx.editingGroup}
                        onClose={() => { ctx.setGroupModalOpen(false); ctx.setEditingGroup(null); }}
                        onSubmit={ctx.handleCreateOrUpdateGroup}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {ctx.isPlaybookModalOpen && ctx.selectedLeadForPlaybook && (
                    <PlaybookModal
                        lead={ctx.selectedLeadForPlaybook}
                        playbooks={ctx.playbooks}
                        onClose={() => ctx.setPlaybookModalOpen(false)}
                        onApply={ctx.handleApplyPlaybook}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {ctx.lostLeadInfo && (
                    <LostLeadModal
                        lead={ctx.lostLeadInfo.lead}
                        onClose={() => ctx.setLostLeadInfo(null)}
                        onSubmit={ctx.handleProcessLostLead}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {ctx.isSdrBotOpen && (
                    ctx.isAiConfigured ? (
                        <SdrAssistantChat
                            onClose={() => ctx.setSdrBotOpen(false)}
                            leads={ctx.leads}
                            tasks={ctx.tasks}
                            columns={ctx.columns}
                            activities={ctx.activities}
                        />
                    ) : (
                        <SdrBotModal
                            onClose={() => ctx.setSdrBotOpen(false)}
                            onGoToSettings={() => {
                                ctx.setSdrBotOpen(false);
                                ctx.setSettingsTab('Inteligência Artificial');
                                ctx.setActiveView('Configurações');
                            }}
                        />
                    )
                )}
            </AnimatePresence>

            <OnboardingModal onOpenCreateBoard={() => ctx.setCreateBoardModalOpen(true)} />

            <CreateBoardModal
                isOpen={ctx.isCreateBoardModalOpen}
                onClose={() => ctx.setCreateBoardModalOpen(false)}
                onCreateBoard={ctx.handleCreateBoard}
            />

            <AnimatePresence>
                {ctx.notification && (
                    <Notification
                        message={ctx.notification.message}
                        type={ctx.notification.type}
                        onClose={() => ctx.setNotification(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
