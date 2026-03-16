import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';

import { useAppContext } from './AppContext';
import { VIEW_PATHS } from './viewPaths';
import { AppRouter } from '@/src/app/AppRouter';
import { useAuth } from '@/src/features/auth/AuthContext';
import PipelineOnboarding from '@/src/features/onboarding/PipelineOnboarding';
import WhatsAppConnectModal from '@/src/features/onboarding/WhatsAppConnectModal';
import { useMyConnection } from '@/src/hooks/useMyConnection';

// Layout components
import Sidebar from '@/src/app/Sidebar';
import Header from '@/src/app/Header';

// Modal components
import LeadDetailSlideover from '@/src/features/activities/LeadDetailSlideover';
import CreateEditLeadModal from '@/src/features/leads/CreateEditLeadModal';
import CreateEditTaskModal from '@/src/features/tasks/CreateEditTaskModal';
import CreateEditGroupModal from '@/src/features/groups/CreateEditGroupModal';
import PlaybookModal from '@/src/features/playbooks/PlaybookModal';
import LostLeadModal from '@/src/features/leads/LostLeadModal';
import SdrBotModal from '@/src/features/ai/SdrBotModal';
import SdrAssistantChat from '@/src/features/ai/SdrAssistantChat';
import OnboardingModal from '@/src/components/onboarding/OnboardingModal';
import CreateBoardModal from '@/src/features/leads/CreateBoardModal';
import Notification from '@/src/features/notifications/Notification';

export default function RootLayout() {
    const ctx = useAppContext();
    const { currentUserRole, isRoleReady, companyId, user } = useAuth();
    const navigate = useNavigate();

    const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
    const [bannerDismissed, setBannerDismissed] = useState(false);

    const { hasConnection, loading: connLoading, refetch: refetchConn } = useMyConnection(
        user?.id ?? null,
        companyId ?? null
    );

    // Banner: usuário autenticado sem WhatsApp conectado
    const showWhatsAppBanner =
        isRoleReady &&
        !connLoading &&
        !hasConnection &&
        !bannerDismissed;

    // Seller sem pipeline → tela de onboarding gamificada
    const showPipelineOnboarding =
        isRoleReady &&
        !ctx.boardsLoading &&
        currentUserRole === 'seller' &&
        (ctx.boards ?? []).length === 0;

    // Sync URL with activeView state — preserve sub-paths (e.g. /painel360/vendedores)
    useEffect(() => {
        const base = VIEW_PATHS[ctx.activeView] ?? '/';
        const current = window.location.pathname;
        if (current !== base && !current.startsWith(base + '/')) {
            navigate(base, { replace: true });
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

    if (showPipelineOnboarding) {
        return (
            <>
                <PipelineOnboarding
                    onCreatePipeline={() => ctx.setCreateBoardModalOpen(true)}
                    userName={ctx.localUser?.name}
                />
                {/* CreateBoardModal disponível mesmo na onboarding */}
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
            </>
        );
    }

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

                {/* Banner WhatsApp — aparece para quem ainda não conectou */}
                <AnimatePresence>
                    {showWhatsAppBanner && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-center gap-3 px-6 py-2.5 bg-emerald-500/8 border-b border-emerald-500/15 overflow-hidden"
                        >
                            <div className="p-1 rounded-lg bg-emerald-500/15">
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                            </div>
                            <p className="text-xs text-emerald-300 flex-1">
                                Conecte seu WhatsApp para receber e enviar mensagens diretamente no CRM.
                            </p>
                            <button
                                onClick={() => setWhatsappModalOpen(true)}
                                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 px-3 py-1 border border-emerald-500/30 rounded-lg transition-colors whitespace-nowrap"
                            >
                                Conectar agora
                            </button>
                            <button
                                onClick={() => setBannerDismissed(true)}
                                className="text-emerald-700 hover:text-emerald-500 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <main className="flex-1 overflow-auto p-6 bg-transparent">
                    <AppRouter {...routerProps} />
                </main>
                <footer className="text-center text-xs text-slate-500 py-2">
                    © 2026 NextSales. Todos os direitos reservados.
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

            {/* Modal QR Code WhatsApp */}
            <AnimatePresence>
                {whatsappModalOpen && (
                    <WhatsAppConnectModal
                        onClose={() => setWhatsappModalOpen(false)}
                        onConnected={() => {
                            setWhatsappModalOpen(false);
                            setBannerDismissed(true);
                            refetchConn();
                        }}
                        userName={ctx.localUser?.name}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
