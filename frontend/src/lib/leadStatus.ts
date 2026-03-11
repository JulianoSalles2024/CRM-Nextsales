import type { Lead } from '@/types';

export type LeadComputedStatus = 'ativo' | 'inativo' | 'perdido' | 'ganho' | 'encerrado';

/**
 * Derives the lead status from board_stages.linked_lifecycle_stage (via columnType).
 * Priority: isArchived > status field 'Inativo' > columnType 'lost'/'won' > default 'ativo'
 */
export function getLeadComputedStatus(
  lead: Lead,
  columnType: string | undefined,
): LeadComputedStatus {
  if (lead.isArchived) return 'inativo';
  if (lead.status === 'Inativo') return 'inativo';
  if (columnType === 'lost') return lead.status === 'ENCERRADO' ? 'encerrado' : 'perdido';
  if (columnType === 'won' && lead.status === 'GANHO') return 'ganho';
  return 'ativo';
}

export const STATUS_DOT_COLOR: Record<LeadComputedStatus, string> = {
  ativo:      'bg-emerald-500',
  inativo:    'bg-red-500',
  perdido:    'bg-amber-400',
  ganho:      'bg-blue-500',
  encerrado:  'bg-red-600',
};

export const STATUS_BADGE: Record<LeadComputedStatus, { label: string; classes: string }> = {
  ativo:      { label: 'ATIVO',      classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  inativo:    { label: 'INATIVO',    classes: 'bg-red-500/15 text-red-400 border-red-500/30' },
  perdido:    { label: 'PERDIDO',    classes: 'bg-amber-400/15 text-amber-400 border-amber-400/30' },
  ganho:      { label: 'GANHO',      classes: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  encerrado:  { label: 'ENCERRADO', classes: 'bg-red-600/15 text-red-500 border-red-600/30' },
};
