import React from 'react';
import {
  Target, MessageSquare, DollarSign, RefreshCw,
  Database, Eye, Power, MoreVertical, TrendingUp,
  Zap, Archive, Edit2,
} from 'lucide-react';
import type { AIAgent, AgentFunctionType } from './hooks/useAgents';

const FUNCTION_META: Record<AgentFunctionType, {
  label: string;
  color: string;
  bg: string;
  ring: string;
  icon: React.ElementType;
  desc: string;
}> = {
  hunter:     { label: 'Hunter',     color: 'text-orange-400', bg: 'bg-orange-500/10', ring: 'ring-orange-500/30', icon: Target,       desc: 'Prospecção ativa' },
  sdr:        { label: 'SDR',        color: 'text-blue-400',   bg: 'bg-blue-500/10',   ring: 'ring-blue-500/30',   icon: MessageSquare, desc: 'Qualificação' },
  closer:     { label: 'Closer',     color: 'text-emerald-400',bg: 'bg-emerald-500/10',ring: 'ring-emerald-500/30',icon: DollarSign,   desc: 'Fechamento' },
  followup:   { label: 'Follow-up',  color: 'text-violet-400', bg: 'bg-violet-500/10', ring: 'ring-violet-500/30', icon: RefreshCw,    desc: 'Retenção' },
  curator:    { label: 'Curator',    color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   ring: 'ring-cyan-500/30',   icon: Database,     desc: 'Higienização' },
  supervisor: { label: 'Supervisor', color: 'text-amber-400',  bg: 'bg-amber-500/10',  ring: 'ring-amber-500/30',  icon: Eye,          desc: 'Orquestração' },
};

const TONE_LABELS: Record<string, string> = {
  formal: 'Formal', consultivo: 'Consultivo', descontraido: 'Descontraído',
  tecnico: 'Técnico', agressivo: 'Agressivo',
};

interface AgentCardProps {
  agent: AIAgent;
  onToggle: (id: string, active: boolean) => void;
  onArchive: (id: string) => void;
  onEdit: (agent: AIAgent) => void;
  onClick: (agent: AIAgent) => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent, onToggle, onArchive, onEdit, onClick }) => {
  const meta = FUNCTION_META[agent.function_type];
  const FnIcon = meta.icon;
  const [menuOpen, setMenuOpen] = React.useState(false);

  const initials = agent.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div
      className={`relative group bg-[#0B1220] border rounded-xl overflow-hidden cursor-pointer transition-all duration-200
        hover:border-white/10 hover:-translate-y-0.5 hover:shadow-lg
        ${agent.is_active ? 'border-white/5' : 'border-white/5 opacity-60'}`}
      onClick={() => onClick(agent)}
    >
      {/* Top accent bar */}
      <div className={`h-0.5 w-full ${agent.is_active ? meta.bg.replace('/10', '') : 'bg-slate-700'}`}
        style={{ background: agent.is_active ? agent.avatar_color : undefined }}
      />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ring-2 ${meta.ring} flex-shrink-0`}
              style={{ background: `${agent.avatar_color}22`, color: agent.avatar_color }}
            >
              {initials}
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-tight">{agent.name}</p>
              <div className={`flex items-center gap-1 mt-0.5 ${meta.color}`}>
                <FnIcon className="w-3 h-3" />
                <span className="text-xs">{meta.label}</span>
              </div>
            </div>
          </div>

          {/* Menu */}
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="p-1 rounded-md text-slate-600 hover:text-slate-300 hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-6 z-20 w-40 bg-[#0F172A] border border-white/10 rounded-lg shadow-xl py-1">
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white"
                  onClick={() => { setMenuOpen(false); onEdit(agent); }}
                >
                  <Edit2 className="w-3 h-3" /> Editar agente
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white"
                  onClick={() => { setMenuOpen(false); onToggle(agent.id, !agent.is_active); }}
                >
                  <Power className="w-3 h-3" />
                  {agent.is_active ? 'Pausar' : 'Ativar'}
                </button>
                <div className="border-t border-white/5 my-1" />
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10"
                  onClick={() => { setMenuOpen(false); onArchive(agent.id); }}
                >
                  <Archive className="w-3 h-3" /> Arquivar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Status + tone */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
            agent.is_active
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-slate-700/50 text-slate-500'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${agent.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            {agent.is_active ? 'Ativo' : 'Inativo'}
          </span>
          <span className="text-xs text-slate-600 bg-slate-800/50 px-2 py-0.5 rounded-full">
            {TONE_LABELS[agent.tone] ?? agent.tone}
          </span>
        </div>

        {/* Meta info */}
        <div className="space-y-1.5">
          {agent.niche && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Zap className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{agent.niche}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <TrendingUp className="w-3 h-3 flex-shrink-0" />
            <span>Meta: {agent.monthly_goal?.toLocaleString('pt-BR') ?? '—'} {agent.goal_metric}</span>
          </div>
        </div>

        {/* Channels */}
        {agent.channels.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {agent.channels.slice(0, 3).map(ch => (
              <span key={ch} className="text-[10px] px-1.5 py-0.5 bg-slate-800/60 text-slate-500 rounded">
                {ch}
              </span>
            ))}
            {agent.channels.length > 3 && (
              <span className="text-[10px] px-1.5 py-0.5 bg-slate-800/60 text-slate-500 rounded">
                +{agent.channels.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Active pulse glow */}
      {agent.is_active && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ boxShadow: `inset 0 0 30px ${agent.avatar_color}08` }}
        />
      )}
    </div>
  );
};
