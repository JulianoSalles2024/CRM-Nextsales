import React, { useState } from 'react';
import { Plus, Search, SlidersHorizontal, Users } from 'lucide-react';
import { AgentCard } from './AgentCard';
import type { AIAgent, AgentFunctionType } from './hooks/useAgents';

const FUNCTION_FILTERS: { value: 'all' | AgentFunctionType; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'hunter', label: 'Hunter' },
  { value: 'sdr', label: 'SDR' },
  { value: 'closer', label: 'Closer' },
  { value: 'followup', label: 'Follow-up' },
  { value: 'curator', label: 'Curator' },
  { value: 'supervisor', label: 'Supervisor' },
];

interface Props {
  agents: AIAgent[];
  loading: boolean;
  onCreateAgent: () => void;
  onToggle: (id: string, active: boolean) => void;
  onArchive: (id: string) => void;
  onEdit: (agent: AIAgent) => void;
  onSelectAgent: (agent: AIAgent) => void;
}

export const AgentsList: React.FC<Props> = ({
  agents, loading, onCreateAgent, onToggle, onArchive, onEdit, onSelectAgent,
}) => {
  const [search, setSearch] = useState('');
  const [fnFilter, setFnFilter] = useState<'all' | AgentFunctionType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const filtered = agents.filter(a => {
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (fnFilter !== 'all' && a.function_type !== fnFilter) return false;
    if (statusFilter === 'active' && !a.is_active) return false;
    if (statusFilter === 'inactive' && a.is_active) return false;
    return true;
  });

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar agente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#0B1220] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1">
          {[
            { v: 'all', l: 'Todos' },
            { v: 'active', l: 'Ativos' },
            { v: 'inactive', l: 'Inativos' },
          ].map(opt => (
            <button
              key={opt.v}
              onClick={() => setStatusFilter(opt.v as typeof statusFilter)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg transition-all border ${
                statusFilter === opt.v
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              {opt.l}
            </button>
          ))}
        </div>

        {/* Create button */}
        <button
          onClick={onCreateAgent}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors ml-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Novo Agente
        </button>
      </div>

      {/* Function type pills */}
      <div className="flex flex-wrap gap-1.5">
        {FUNCTION_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFnFilter(f.value)}
            className={`px-3 py-1 text-xs rounded-full border transition-all ${
              fnFilter === f.value
                ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                : 'border-white/10 text-slate-500 hover:text-white hover:border-white/15'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[#0B1220] border border-white/5 rounded-xl h-40 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-600">
          <Users className="w-10 h-10 mb-3" />
          <p className="text-sm font-medium text-slate-500">
            {agents.length === 0 ? 'Nenhum agente criado ainda' : 'Nenhum agente encontrado'}
          </p>
          {agents.length === 0 && (
            <button
              onClick={onCreateAgent}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" /> Criar primeiro agente
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onToggle={onToggle}
              onArchive={onArchive}
              onEdit={onEdit}
              onClick={onSelectAgent}
            />
          ))}
        </div>
      )}
    </div>
  );
};
