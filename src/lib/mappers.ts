import type { Lead, Activity, Task } from '@/types';

// Remove undefined values so Supabase ignores fields not being updated
function omitUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

// =========== LEAD ===========

export function mapLeadFromDb(row: Record<string, unknown>): Lead {
  return {
    id: row.id as string,
    columnId: row.column_id as string,
    boardId: (row.board_id as string) ?? undefined,
    name: (row.name as string) ?? '',
    company: (row.company_name as string) ?? '',
    segment: (row.segment as string) ?? undefined,
    value: Number(row.value ?? 0),
    avatarUrl: (row.avatar_url as string) ?? '',
    tags: (row.tags as Lead['tags']) ?? [],
    lastActivity: (row.last_activity as string) ?? '',
    lastActivityTimestamp: (row.last_activity_timestamp as string) ?? new Date().toISOString(),
    dueDate: (row.due_date as string) ?? undefined,
    assignedTo: (row.assigned_to as string) ?? undefined,
    description: (row.description as string) ?? undefined,
    email: (row.email as string) ?? undefined,
    phone: (row.phone as string) ?? undefined,
    probability: row.probability != null ? Number(row.probability) : undefined,
    status: (row.status as string) ?? undefined,
    clientId: (row.client_id as string) ?? undefined,
    source: (row.source as string) ?? undefined,
    createdAt: (row.created_at as string) ?? undefined,
    groupInfo: (row.group_info as Lead['groupInfo']) ?? undefined,
    activePlaybook: (row.active_playbook as Lead['activePlaybook']) ?? undefined,
    playbookHistory: (row.playbook_history as Lead['playbookHistory']) ?? undefined,
    lostReason: (row.lost_reason as string) ?? undefined,
    reactivationDate: (row.reactivation_date as string) ?? undefined,
    qualificationStatus: (row.qualification_status as Lead['qualificationStatus']) ?? undefined,
    disqualificationReason: (row.disqualification_reason as string) ?? undefined,
    isArchived: (row.is_archived as boolean) ?? false,
    ownerId: (row.owner_id as string) ?? undefined,
    wonAt: (row.won_at as string) ?? undefined,
  };
}

// Only confirmed columns of the leads table.
// company_id is added directly in createLead (INSERT only) — never sent on UPDATE.
// is_archived is also added directly in createLead to guarantee false on new leads.
export function mapLeadToDb(lead: Partial<Lead>): Record<string, unknown> {
  return omitUndefined({
    name: lead.name,
    column_id: lead.columnId || undefined,
    board_id: lead.boardId || undefined,
    owner_id: lead.ownerId || undefined,
    company_name: lead.company,
    email: lead.email,
    phone: lead.phone,
    value: lead.value,
    source: lead.source,
    status: lead.status,
    last_activity: lead.lastActivity,
    last_activity_timestamp: lead.lastActivityTimestamp,
    is_archived: lead.isArchived !== undefined ? lead.isArchived : undefined,
    won_at: 'wonAt' in lead ? (lead.wonAt ?? null) : undefined,
  });
}

// =========== ACTIVITY ===========

export function mapActivityFromDb(row: Record<string, unknown>): Activity {
  return {
    id: row.id as string,
    leadId: row.lead_id as string,
    type: row.type as Activity['type'],
    text: (row.text as string) ?? '',
    authorName: (row.author_name as string) ?? '',
    timestamp: (row.timestamp as string) ?? (row.created_at as string) ?? new Date().toISOString(),
  };
}

// company_id stamped by trigger — not sent from frontend.
// timestamp column does not exist in DB; created_at is auto-set server-side.
export function mapActivityToDb(act: Omit<Activity, 'id'>): Record<string, unknown> {
  return {
    lead_id: act.leadId,
    type: act.type,
    text: act.text,
    author_name: act.authorName,
  };
}

// =========== TASK ===========

export function mapTaskFromDb(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    type: row.type as Task['type'],
    title: (row.title as string) ?? '',
    description: (row.description as string) ?? undefined,
    dueDate: (row.due_date as string) ?? new Date().toISOString(),
    status: (row.status as Task['status']) ?? 'pending',
    leadId: row.lead_id as string,
    userId: (row.user_id as string) ?? '',
    playbookId: (row.playbook_id as string) ?? undefined,
    playbookStepIndex: row.playbook_step_index != null ? Number(row.playbook_step_index) : undefined,
  };
}

// company_id stamped by trigger — not sent from frontend.
export function mapTaskToDb(task: Partial<Task>): Record<string, unknown> {
  return omitUndefined({
    type: task.type,
    title: task.title,
    description: task.description,
    due_date: task.dueDate,
    status: task.status,
    lead_id: task.leadId,
    user_id: task.userId,
    playbook_id: task.playbookId,
    playbook_step_index: task.playbookStepIndex,
  });
}
