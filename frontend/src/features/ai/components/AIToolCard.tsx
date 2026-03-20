import React from 'react';
import { Settings2, Play, Power } from 'lucide-react';
import { AIToolConfig } from '../types';

interface AIToolCardProps {
  tool: AIToolConfig;
  onToggle: (enabled: boolean) => void;
  onEditPrompt: () => void;
  onTest: () => void;
}

export const AIToolCard: React.FC<AIToolCardProps> = ({ tool, onToggle, onEditPrompt, onTest }) => {
  return (
    <div
      className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/40 transition-all hover:bg-slate-800/50"
    >
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-white">{tool.name}</h3>
        <p className="text-xs text-slate-400 truncate">{tool.description}</p>
      </div>

      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
        <button
          onClick={onEditPrompt}
          className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          title="Editar Prompt"
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onTest}
          className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          title="Testar Ferramenta"
        >
          <Play className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onToggle(!tool.enabled)}
          className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
            tool.enabled
              ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
              : 'bg-white/5 text-slate-500 border border-white/5'
          }`}
        >
          <Power className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {tool.enabled ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>
    </div>
  );
};
