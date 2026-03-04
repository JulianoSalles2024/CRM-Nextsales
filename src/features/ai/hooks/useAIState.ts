import { useState, useEffect } from 'react';
import { AIState, AIToolId, AIToolConfig } from '../types';
import { DEFAULT_AI_TOOLS } from '../constants';

const STORAGE_KEY = 'crm-ai-state';

export const useAIState = () => {
  const [state, setState] = useState<AIState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        safeError('Failed to parse AI state', e);
      }
    }
    return {
      tools: DEFAULT_AI_TOOLS
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
