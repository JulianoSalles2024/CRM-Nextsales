import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export type AIProvider = 'google' | 'openai' | 'anthropic';

export interface AIConfig {
    provider: AIProvider;
    model: string;
    apiKey: string;
    thinkingMode: boolean;
    searchGrounding: boolean;
}

const STORAGE_KEY = 'crm-ai-config';

export const aiConfig = {
    load: (): AIConfig => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
        return {
            provider: 'google',
            model: 'gemini-2.0-flash-exp', // Updated default
            apiKey: '',
            thinkingMode: true,
            searchGrounding: true,
        };
    },

    save: (config: AIConfig) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    },

    clear: () => {
        localStorage.removeItem(STORAGE_KEY);
    },
    
    getModels: () => ({
        google: [
            { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Experimental) - Fastest & Smartest' },
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro - High Reasoning' },
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash - Cost Effective' },
        ],
        openai: [
            { id: 'o1', name: 'OpenAI o1 - Advanced Reasoning' },
            { id: 'o1-mini', name: 'OpenAI o1-mini - Fast Reasoning' },
            { id: 'gpt-4o', name: 'GPT-4o - Flagship Multimodal' },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini - Cost Effective' },
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
        ],
        anthropic: [
            { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet (Latest)' },
            { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku (Latest)' },
            { id: 'claude-3-opus-latest', name: 'Claude 3 Opus (Latest)' },
        ],
    })
};
