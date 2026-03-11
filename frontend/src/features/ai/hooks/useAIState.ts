import { useState, useEffect } from 'react';
import { AIState, AIToolId, AIToolConfig } from '../types';
import { DEFAULT_AI_TOOLS, PROMPTS_VERSION } from '../constants';

const STORAGE_KEY = 'crm-ai-state';

const migrateState = (saved: AIState): AIState => {
  if (saved.promptsVersion === PROMPTS_VERSION) return saved;

  // Versão desatualizada: atualiza basePrompt de cada tool, preserva enabled e demais configs do usuário
  const migratedTools = { ...saved.tools };
  (Object.keys(DEFAULT_AI_TOOLS) as AIToolId[]).forEach(id => {
    migratedTools[id] = {
      ...saved.tools[id],
      basePrompt: DEFAULT_AI_TOOLS[id].basePrompt,
    };
  });

  return { ...saved, tools: migratedTools, promptsVersion: PROMPTS_VERSION };
};

export const useAIState = () => {
  const [state, setState] = useState<AIState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: AIState = JSON.parse(saved);
        return migrateState(parsed);
      } catch (e) {
        safeError('Failed to parse AI state', e);
      }
    }
    return {
      tools: DEFAULT_AI_TOOLS,
      promptsVersion: PROMPTS_VERSION,
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const updateTool = (id: AIToolId, updates: Partial<AIToolConfig>) => {
    setState(prev => ({
      ...prev,
      tools: {
        ...prev.tools,
        [id]: { ...prev.tools[id], ...updates }
      }
    }));
  };

  return {
    state,
    updateTool
  };
};
