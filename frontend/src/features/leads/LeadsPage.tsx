import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ArchiveRestore } from 'lucide-react';
import LeadListView from './LeadListView';
import RecoveryView from './RecoveryView';
import type { Lead, ColumnData, Tag, ListDisplaySettings, User, Board, Id } from '@/types';

type LeadsTab = 'list' | 'recovery';

interface LeadsPageProps {
  /* ── LeadListView ─────────────────────────────────── */
  leads: Lead[];
  columns: ColumnData[];
  users: User[];
  boards: Board[];
  onLeadClick: (lead: Lead) => void;
  onEditLead: (lead: Lead) => void;
  onDeleteLead: (id: string) => void;
  viewType: 'Leads' | 'Clientes';
  listDisplaySettings: ListDisplaySettings;
  onUpdateListSettings: (newSettings: ListDisplaySettings) => void;
  allTags: Tag[];
  selectedTags: Tag[];
  onSelectedTagsChange: React.Dispatch<React.SetStateAction<Tag[]>>;
  statusFilter: 'all' | 'Ganho' | 'Perdido';
  onStatusFilterChange: (status: 'all' | 'Ganho' | 'Perdido') => void;
  onExportPDF: () => void;
  onOpenCreateLeadModal: () => void;
  onOpenCreateTaskModal: () => void;
  /* ── RecoveryView ─────────────────────────────────── */
  recoveryLeads: Lead[];
  onReactivateLead: (leadId: Id) => void;
  onExportRecoveryPDF: (leads: Lead[]) => void;
}

const tabVariants = {
  enter: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } },
  exit:  { opacity: 0, y: -6, transition: { duration: 0.12 } },
};

const LeadsPage: React.FC<LeadsPageProps> = (props) => {
  const [activeTab, setActiveTab] = useState<LeadsTab>('list');

  const tabs: { key: LeadsTab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: 'list',     label: 'Lista de Leads', icon: Users },
    { key: 'recovery', label: 'Recuperação',    icon: ArchiveRestore, count: props.recoveryLeads.length || undefined },
  ];

  return (
    <div className="flex flex-col h-full gap-0">

      {/* ── Tab bar ──────────────────────────────────────────── */}
      <div className="flex items-center gap-1 mb-4 flex-shrink-0">
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
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1 ${
                  isActive
                    ? 'bg-blue-500/25 text-blue-300'
                    : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ──────────────────────────────────────── */}
      <div className="flex-1 min-h-0 relative">
        <AnimatePresence mode="wait" initial={false}>
          {activeTab === 'list' ? (
            <motion.div
              key="list"
              variants={tabVariants}
              initial="enter"
              animate="visible"
              exit="exit"
              className="h-full flex flex-col"
            >
              <LeadListView
                leads={props.leads}
                columns={props.columns}
                users={props.users}
                boards={props.boards}
                onLeadClick={props.onLeadClick}
                onEditLead={props.onEditLead}
                onDeleteLead={props.onDeleteLead}
                viewType={props.viewType}
                listDisplaySettings={props.listDisplaySettings}
                onUpdateListSettings={props.onUpdateListSettings}
                allTags={props.allTags}
                selectedTags={props.selectedTags}
                onSelectedTagsChange={props.onSelectedTagsChange}
                statusFilter={props.statusFilter}
                onStatusFilterChange={props.onStatusFilterChange}
                onExportPDF={props.onExportPDF}
                onOpenCreateLeadModal={props.onOpenCreateLeadModal}
                onOpenCreateTaskModal={props.onOpenCreateTaskModal}
              />
            </motion.div>
          ) : (
            <motion.div
              key="recovery"
              variants={tabVariants}
              initial="enter"
              animate="visible"
              exit="exit"
              className="overflow-y-auto h-full"
            >
              <RecoveryView
                leads={props.recoveryLeads}
                onReactivateLead={props.onReactivateLead}
                onExportPDF={props.onExportRecoveryPDF}
                onDeleteLead={props.onDeleteLead}
                onLeadClick={props.onLeadClick}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};

export default LeadsPage;
