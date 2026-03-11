import React from 'react';
import { useAuth } from '@/src/features/auth/AuthContext';
import { ProfileView } from '@/src/features/profile';
import KanbanBoard from '@/src/features/leads/KanbanBoard';
import Painel360 from '@/src/features/dashboard/Painel360';
import Dashboard from '@/src/features/dashboard/Dashboard';
import SettingsPage from '@/src/features/settings/SettingsPage';
import ActivitiesView from '@/src/features/tasks/ActivitiesView';
import CalendarPage from '@/src/features/tasks/CalendarPage';
import ReportsPage from '@/src/features/reports/ReportsPage';
import LeadListView from '@/src/features/leads/LeadListView';
import ChatView from '@/src/features/chat/ChatView';
import GroupsView from '@/src/features/groups/GroupsView';
import GroupsDashboard from '@/src/features/dashboard/GroupsDashboard';
import IntegrationsPage from '@/src/features/settings/IntegrationsPage';
import NotificationsView from '@/src/features/notifications/NotificationsView';
import PlaybookSettings from '@/src/features/playbooks/PlaybookSettings';
import PrintableLeadsReport from '@/src/features/reports/PrintableLeadsReport';
import RecoveryView from '@/src/features/leads/RecoveryView';
import InboxView from '@/src/features/chat/InboxView';

interface AppRouterProps {
  activeView: string;
  // ... all other props needed by views
  [key: string]: any; 
}

export const AppRouter: React.FC<AppRouterProps> = (props) => {
  const { currentUserRole, isRoleReady } = useAuth();
  const {
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
    saveBoardStages,
    calculateProbabilityForStage,
    onUpdateUsers
  } = props;

  if (!isRoleReady) return null;

  if (leadsToPrint) {
    return <PrintableLeadsReport leads={leadsToPrint} tasks={tasks} activities={activities} onPrintEnd={() => setLeadsToPrint(null)} />;
  }

  const filteredLeads = searchedLeads;
  let listViewFilteredLeads: any[];

  switch (activeView) {
    case 'Meu Perfil':
      return <ProfileView />;
    case 'Inbox':
      return <InboxView
          mode={inboxMode}
          tasks={tasks}
          notifications={notifications}
          leads={leads}
          onNavigate={(view: string) => setActiveView(view)}
          onMarkNotificationRead={(id: string) => setNotifications((curr: any[]) => curr.map(n => n.id === id ? { ...n, isRead: true } : n))}
          onOpenLead={setSelectedLead}
      />;
    case 'Dashboard':
      return <Dashboard
                  leads={leads}
                  columns={columns}
                  activities={activities}
                  tasks={tasks}
                  users={users}
                  boards={boards}
                  onNavigate={setActiveView}
                  onAnalyzePortfolio={handleStartAnalysis}
                  showNotification={showNotification}
                  onExportReport={() => handleExportPDF(leads)}
             />;
    case 'Pipeline':
      return <KanbanBoard
          columns={columns}
          leads={filteredLeads}
          users={users}
          tasks={tasks}
          cardDisplaySettings={cardDisplaySettings}
          onUpdateLeadColumn={handleUpdateLeadColumn}
          onSelectLead={handleCardClick}
          selectedLeadId={selectedLeadForPlaybookId}
          onAddLead={() => { setEditingLead(null); setCreateLeadModalOpen(true); }}
          onUpdateCardSettings={setCardDisplaySettings}
          minimizedLeads={minimizedLeads}
          onToggleLeadMinimize={(leadId: any) => setMinimizedLeads((p: any[]) => (p || []).includes(leadId) ? (p || []).filter(id => id !== leadId) : [...(p || []), leadId])}
          minimizedColumns={minimizedColumns}
          onToggleColumnMinimize={(colId: any) => setMinimizedColumns((p: any[]) => (p || []).includes(colId) ? (p || []).filter(id => id !== colId) : [...(p || []), colId])}
          isPlaybookActionEnabled={!!selectedLeadForPlaybook}
          onApplyPlaybookClick={() => setPlaybookModalOpen(true)}
          boards={boards}
          activeBoardId={activeBoardId}
          onSelectBoard={setActiveBoardId}
          onCreateBoardClick={() => setCreateBoardModalOpen(true)}
          onDeleteBoard={handleDeleteBoard}
          onUpdateBoard={props.handleUpdateBoard}
          onImportBoards={props.handleImportBoards}
      />;
    case 'Playbooks':
      return <PlaybookSettings initialPlaybooks={playbooks} pipelineColumns={columns} onSave={setPlaybooks} />;
    case 'Leads': {
      listViewFilteredLeads = filteredLeads.filter((l: any) => l.columnId !== 'closed');
      return <LeadListView
                  leads={listViewFilteredLeads}
                  columns={columns}
                  users={users}
                  boards={boards}
                  onLeadClick={setSelectedLead}
                  viewType="Leads"
                  listDisplaySettings={listDisplaySettings}
                  onUpdateListSettings={setListDisplaySettings}
                  allTags={tags}
                  selectedTags={listSelectedTags}
                  onSelectedTagsChange={setListSelectedTags}
                  statusFilter={listStatusFilter}
                  onStatusFilterChange={setListStatusFilter}
                  onExportPDF={() => handleExportPDF(listViewFilteredLeads)}
                  onOpenCreateLeadModal={() => setCreateLeadModalOpen(true)}
                  onOpenCreateTaskModal={() => setCreateTaskModalOpen(true)}
             />;
    }
    case 'Clientes': {
      listViewFilteredLeads = filteredLeads.filter((l: any) => l.columnId === 'closed');
      return <LeadListView
                  leads={listViewFilteredLeads}
                  columns={columns}
                  users={users}
                  boards={boards}
                  onLeadClick={setSelectedLead}
                  viewType="Clientes"
                  listDisplaySettings={listDisplaySettings}
                  onUpdateListSettings={setListDisplaySettings}
                  allTags={tags}
                  selectedTags={listSelectedTags}
                  onSelectedTagsChange={setListSelectedTags}
                  statusFilter={listStatusFilter}
                  onStatusFilterChange={setListStatusFilter}
                  onExportPDF={() => handleExportPDF(listViewFilteredLeads)}
                  onOpenCreateLeadModal={() => setCreateLeadModalOpen(true)}
                  onOpenCreateTaskModal={() => setCreateTaskModalOpen(true)}
             />;
    }
     case 'Tarefas':
        return <ActivitiesView tasks={tasks} leads={filteredLeads}
                    onEditTask={(task: any) => { setEditingTask(task); setCreateTaskModalOpen(true); }}
                    onDeleteTask={handleDeleteTask} onUpdateTaskStatus={handleUpdateTaskStatus}
               />;
    case 'Relatórios':
        return <ReportsPage leads={leads} columns={columns} tasks={tasks} activities={activities} boards={boards} />;
    case 'Recuperação':
        const recoveryLeads = leads.filter((l: any) => l.reactivationDate);
        return <RecoveryView 
            leads={recoveryLeads} 
            onReactivateLead={handleReactivateLead} 
            onExportPDF={handleExportPDF} 
            onDeleteLead={handleDeleteLead}
            onLeadClick={handleCardClick}
        />;
    case 'Chat':
        return <ChatView
            conversations={conversations} messages={messages} leads={filteredLeads} currentUser={localUser}
            onSendMessage={(convId: string, text: string, channel: string) => {
                const newMessage = { id: `msg-${Date.now()}`, conversationId: convId, senderId: localUser.id, text, timestamp: new Date().toISOString(), channel };
                setMessages((curr: any[]) => [...curr, newMessage]);
                setConversations((curr: any[]) => curr.map(c => c.id === convId ? {...c, lastMessage: text, lastMessageTimestamp: newMessage.timestamp, lastMessageChannel: channel, unreadCount: 0 } : c));
            }}
            onUpdateConversationStatus={(convId: string, status: string) => setConversations((curr: any[]) => curr.map(c => c.id === convId ? {...c, status} : c))}
            showNotification={showNotification}
         />;
    case 'Grupos':
        if (selectedGroupForView) {
            const group = groups.find((g: any) => g.id === selectedGroupForView);
            const groupLeads = leads.filter((l: any) => l.groupInfo?.groupId === selectedGroupForView);
            if (!group) { setSelectedGroupForView(null); return null; }
            return <GroupsView
                        group={group}
                        leads={groupLeads}
                        analysis={analysisForGroup}
                        onUpdateLead={async (leadId: string, updates: any) => {
                            try {
                                await updateLead(leadId, {
                                    ...updates,
                                    lastActivityTimestamp: new Date().toISOString(),
                                    lastActivityType: 'edited',
                                });
                                if (selectedLead?.id === leadId) {
                                    setSelectedLead((prev: any) => prev ? { ...prev, ...updates } : prev);
                                }
                                createActivityLog(leadId, 'note', 'Informações de grupo do lead atualizadas.');
                                showNotification('Informações de grupo atualizadas.', 'success');
                            } catch {
                                showNotification('Erro ao atualizar lead.', 'error');
                            }
                        }}
                        onBack={() => setSelectedGroupForView(null)}
                        onCreateOrUpdateAnalysis={handleCreateOrUpdateGroupAnalysis}
                        onDeleteAnalysis={handleDeleteGroupAnalysis}
                        showNotification={showNotification}
                   />;
        }
        return <GroupsDashboard
            groups={groups}
            leads={leads}
            onSelectGroup={setSelectedGroupForView}
            onAddGroup={() => { setEditingGroup(null); setGroupModalOpen(true); }}
            onEditGroup={(group: any) => { setEditingGroup(group); setGroupModalOpen(true); }}
            onDeleteGroup={handleDeleteGroup}
         />;
    case 'Integrações':
        return <IntegrationsPage showNotification={showNotification} />;
    case 'Calendário':
        return <CalendarPage
            tasks={tasks} leads={filteredLeads}
            onNewActivity={(date: string) => { setPreselectedDataForTask({ leadId: leads[0]?.id, date }); setCreateTaskModalOpen(true); }}
            onEditActivity={(task: any) => { setEditingTask(task); setCreateTaskModalOpen(true); }}
            onDeleteTask={handleDeleteTask}
            onUpdateTaskStatus={handleUpdateTaskStatus}
         />;
    case 'Notificações':
        return <NotificationsView
            notifications={notifications}
            onMarkAsRead={(id: string) => setNotifications((curr: any[]) => curr.map(n => n.id === id ? { ...n, isRead: true } : n))}
            onMarkAllAsRead={() => setNotifications((curr: any[]) => curr.map(n => ({...n, isRead: true})))}
            onClearAll={() => setNotifications([])}
            onNavigate={(link: any) => {
                if (link) {
                    if (link.view) setActiveView(link.view);
                    if (link.leadId) {
                        const leadToSelect = leads.find((l: any) => l.id === link.leadId);
                        if (leadToSelect) setSelectedLead(leadToSelect);
                    }
                }
            }}
        />
    case 'Configurações':
        return <SettingsPage
            currentUser={localUser}
            users={users}
            columns={columns}
            boards={boards}
            activeBoardId={activeBoardId}
            onUpdateProfile={() => showNotification("Perfil atualizado!", 'success')}
            onUpdatePipeline={(newColumns: any[]) => {
                setColumns(newColumns);
                if (activeBoardId) {
                    saveBoardStages(activeBoardId, newColumns).catch(safeError);
                }
                const updates = leads.map((lead: any) => ({
                    id: lead.id,
                    data: { probability: calculateProbabilityForStage(lead.columnId, newColumns) },
                }));
                bulkUpdateLeads(updates).catch(safeError);
                showNotification("Pipeline salvo!", 'success');
            }}
            onUpdateUsers={onUpdateUsers}
            onSelectBoard={setActiveBoardId}
            onDeleteBoard={handleDeleteBoard}
            onCreateBoard={() => setCreateBoardModalOpen(true)}
            initialTab={settingsTab}
        />;
    case 'Painel 360':
        if (currentUserRole !== 'admin') {
            setActiveView('Inbox');
            return null;
        }
        return <Painel360 users={users} />;
    default:
        return <div>View not found</div>;
  }
};
