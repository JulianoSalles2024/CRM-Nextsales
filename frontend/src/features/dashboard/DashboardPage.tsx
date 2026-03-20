import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart2, Inbox, Layers, CalendarDays } from 'lucide-react';
import Dashboard from './Dashboard';
import InboxView from '@/src/features/chat/InboxView';
import type { Lead, ColumnData, Activity, Task, User, Board, Id } from '@/types';

type DashboardTab = 'overview' | 'inbox';

const PERIOD_OPTIONS = [
  'Todo o Período', 'Hoje', 'Ontem', 'Últimos 7 dias', 'Últimos 30 dias',
  'Este Mês', 'Mês Passado', 'Este Trimestre', 'Último Trimestre', 'Este Ano', 'Ano Passado',
];

interface DashboardPageProps {
  /* ── Dashboard ─────────────────────────────────── */
  leads: Lead[];
  columns: ColumnData[];
  activities: Activity[];
  tasks: Task[];
  users: User[];
  boards: Board[];
  onNavigate: (view: string) => void;
  onAnalyzePortfolio?: () => void;
  showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  onExportReport?: () => void;
  /* ── InboxView ──────────────────────────────────── */
  inboxMode?: 'standard' | 'analysis';
  inboxLeads: Lead[];
  inboxTasks: Task[];
  currentUserRole: 'admin' | 'seller';
  userId: string;
  onOpenLead: (lead: Lead) => void;
  onUpdateTaskStatus: (taskId: Id, status: 'pending' | 'completed') => void;
}

const tabVariants = {
  enter:   { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.12 } },
};

const DashboardPage: React.FC<DashboardPageProps> = (props) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [selectedBoardId, setSelectedBoardId] = useState<'all' | string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState('Este Mês');

  const tabs: { key: DashboardTab; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Visão Geral', icon: BarChart2 },
    { key: 'inbox',    label: 'Inbox',       icon: Inbox },
  ];

  return (
    <div className="flex flex-col h-full gap-0">

      {/* ── Tab bar + filtros ─────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">

        {/* Abas */}
        <div className="flex items-center gap-1">
          {tabs.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                  isActive
                    ? 'bg-blue-950/40 border-blue-500/30 text-blue-400 shadow-sm shadow-blue-900/20'
                    : 'border-transparent text-slate-500 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon className="w-4 h-4 flex-shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Filtros — visíveis só na aba Visão Geral */}
        {activeTab === 'overview' && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
              <Layers className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <select
                value={selectedBoardId}
                onChange={e => setSelectedBoardId(e.target.value)}
                className="bg-transparent text-sm text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="all">Geral (todos os pipelines)</option>
                {props.boards.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
              <CalendarDays className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <select
                value={selectedPeriod}
                onChange={e => setSelectedPeriod(e.target.value)}
                className="bg-transparent text-sm text-slate-200 focus:outline-none cursor-pointer"
              >
                {PERIOD_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ── Tab content ──────────────────────────────────────── */}
      <div className="flex-1 min-h-0 relative">
        <AnimatePresence mode="wait" initial={false}>
          {activeTab === 'overview' ? (
            <motion.div
              key="overview"
              variants={tabVariants}
              initial="enter"
              animate="visible"
              exit="exit"
              className="h-full overflow-y-auto"
            >
              <Dashboard
                leads={props.leads}
                columns={props.columns}
                activities={props.activities}
                tasks={props.tasks}
                users={props.users}
                boards={props.boards}
                onNavigate={props.onNavigate}
                onAnalyzePortfolio={props.onAnalyzePortfolio}
                showNotification={props.showNotification}
                onExportReport={props.onExportReport}
                selectedBoardId={selectedBoardId}
                selectedPeriod={selectedPeriod}
              />
            </motion.div>
          ) : (
            <motion.div
              key="inbox"
              variants={tabVariants}
              initial="enter"
              animate="visible"
              exit="exit"
              className="h-full overflow-y-auto"
            >
              <InboxView
                mode={props.inboxMode}
                tasks={props.inboxTasks}
                leads={props.inboxLeads}
                users={props.users}
                currentUserRole={props.currentUserRole}
                userId={props.userId}
                onNavigate={props.onNavigate}
                onOpenLead={props.onOpenLead}
                onUpdateTaskStatus={props.onUpdateTaskStatus}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};

export default DashboardPage;
