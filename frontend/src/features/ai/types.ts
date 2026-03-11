import { Id } from '@/src/types';

export type AIToolId =
  | 'pilot'
  | 'sales_script'
  | 'daily_briefing'
  | 'deal_coach'
  | 'email_draft'
  | 'objections'
  | 'board_structure'
  | 'board_strategy'
  | 'board_refine'
  | 'sdr_vendas';

export interface AIToolConfig {
  id: AIToolId;
  name: string;
  description: string;
  enabled: boolean;
  basePrompt: string;
}

export interface AIState {
  tools: Record<AIToolId, AIToolConfig>;
  promptsVersion?: string;
}

export interface DealCoachResult {
  action: string;
  reason: string;
  actionType: 'CALL' | 'MEETING' | 'EMAIL' | 'TASK' | 'WHATSAPP';
  urgency: 'low' | 'medium' | 'high';
  probabilityScore: number;
}
