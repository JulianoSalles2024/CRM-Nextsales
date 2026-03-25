import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Zap, LayoutGrid, TrendingUp, Bot, Users,
} from 'lucide-react';
import { useAgents } from './hooks/useAgents';
import { AgentsCommandCenter } from './AgentsCommandCenter';
import { AgentsList } from './AgentsList';
import { AgentWizard } from './AgentWizard';
import { AgentDetail } from './AgentDetail';
import { AgentAnalytics } from './AgentAnalytics';
import { useAuth } from '@/src/features/auth/AuthContext';
import type { AIAgent } from './hooks/useAgents';

type Tab = 'comando' | 'agentes' | 'analytics';

const TAB_PATHS: Record<Tab, string> = {
  comando:   '/agentes/central-de-comando',
  agentes:   '/agentes/meus-agentes',
  analytics: '/agentes/analytics',
};

const PATH_TAB: Record<string, Tab> = {
  '/agentes/central-de-comando': 'comando',
  '/agentes/meus-agentes':       'agentes',
  '/agentes/analytics':          'analytics',
};

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'comando',   label: 'Central de Comando', icon: Zap },
  { id: 'agentes',   label: 'Meus Agentes',        icon: Bot },
  { id: 'analytics', label: 'Analytics',            icon: TrendingUp },
];

// ── Sliding-pill tab bar ──────────────────────────────────────────────────────
const TabBar: React.FC<{ activeTab: Tab; onTabChange: (t: Tab) => void }> = ({
  activeTab, onTabChange,
}) => {
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pill, setPill] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const idx = TABS.findIndex(t => t.id === activeTab);
    const el = btnRefs.current[idx];
    if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
  }, [activeTab]);

  // measure on first render
  useEffect(() => {
    const idx = TABS.findIndex(t => t.id === activeTab);
    const el = btnRefs.current[idx];
    if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex items-center px-6 py-2 border-b border-white/5 bg-[#0B1220]/60 flex-shrink-0">
      <div className="relative flex items-center bg-slate-900/60 border border-blue-500/10 rounded-xl p-1">
        {/* sliding pill */}
        <div
          className="absolute top-1 bottom-1 rounded-lg bg-blue-500/10 border border-blue-500/20 transition-all duration-300 ease-in-out pointer-events-none"
          style={{ left: pill.left, width: pill.width }}
        />
        {TABS.map((tab, i) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              ref={el => { btnRefs.current[i] = el; }}
              onClick={() => onTabChange(tab.id)}
              className={`relative z-10 flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg transition-colors duration-200 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-blue-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const AgentsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { companyId } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>(
    () => PATH_TAB[location.pathname] ?? 'agentes'
  );
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);

  useEffect(() => {
    navigate(TAB_PATHS[activeTab], { replace: true });
  }, [activeTab]);
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);

  const { agents, loading, createAgent, updateAgent, toggleActive, archiveAgent } = useAgents();

  const handleSaveAgent = async (data: Parameters<typeof createAgent>[0]) => {
    if (editingAgent) {
      await updateAgent(editingAgent.id, data);
    } else {
      await createAgent(data);
    }
  };

  const handleEditAgent = (agent: AIAgent) => {
    setEditingAgent(agent);
    setWizardOpen(true);
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#060d18]">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0B1220]/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border bg-blue-950/40 border-blue-500/30 text-blue-400 shadow-sm shadow-blue-900/20 cursor-default">
              <Zap className="w-4 h-4 flex-shrink-0" />
              <span>Exército Comercial de IA</span>
            </button>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500 pl-1">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {agents.length} agentes no total
            </span>
            <span className="text-slate-700">•</span>
            <span className="text-emerald-500">{agents.filter(a => a.is_active).length} ativos</span>
            <span className="text-slate-700">•</span>
            <span>{agents.length} exibidos</span>
          </div>
        </div>

        {/* Active agents pulse indicator */}
        {agents.some(a => a.is_active) && (
          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Em operação
          </div>
        )}
      </div>

      {/* Tabs */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="p-6"
          >
            {activeTab === 'comando' && (
              <AgentsCommandCenter onSelectAgent={(id) => {
                const found = agents.find(a => a.id === id);
                if (found) setSelectedAgent(found);
              }} />
            )}

            {activeTab === 'agentes' && (
              <AgentsList
                agents={agents}
                loading={loading}
                onCreateAgent={() => { setEditingAgent(null); setWizardOpen(true); }}
                onToggle={toggleActive}
                onArchive={archiveAgent}
                onEdit={handleEditAgent}
                onSelectAgent={(agent) => setSelectedAgent(agent)}
              />
            )}

            {activeTab === 'analytics' && (
              <AgentAnalytics companyId={companyId} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Agent Detail Drawer */}
      {selectedAgent && (
        <AgentDetail agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
      )}

      {/* Wizard */}
      {wizardOpen && (
        <AgentWizard
          onClose={() => { setWizardOpen(false); setEditingAgent(null); }}
          onSave={handleSaveAgent}
          editingAgent={editingAgent}
        />
      )}
    </div>
  );
};
