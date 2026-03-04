
export type Id = string | number;

export interface Tag {
  id: Id;
  name: string;
  color: string;
}

export type UserRole = 'Admin' | 'Vendedor';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role?: UserRole;
  joinedAt?: string;
}

export interface InviteLink {
    id: string;
    role: UserRole;
    expiration: '7 days' | '30 days' | 'never';
    expiresAt?: string | null;
    token: string;
    createdAt: string;
}

export type GroupStatus = 'Ativo' | 'Lotado' | 'Arquivado';

export interface Group {
  id: Id;
  name: string;
  description?: string;
  accessLink?: string;
  status: GroupStatus;
  memberGoal?: number;
}

export interface GroupInfo {
  hasJoined: boolean;
  groupId?: Id;
  isStillInGroup: boolean;
  hasOnboarded: boolean;
  onboardingCallDate?: string; // ISO String
  churned: boolean;
  exitDate?: string; // ISO String
}

export interface PlaybookHistoryEntry {
  playbookId: Id;
  playbookName: string;
  startedAt: string; // ISO string date
  completedAt: string; // ISO string date
}

export interface Lead {
  id: Id;
  columnId: Id;
  name: string;
  company: string;
  segment?: string;
  value: number;
  avatarUrl: string;
  tags: Tag[];
  lastActivity: string;
  lastActivityTimestamp: string;
  dueDate?: string; 
  assignedTo?: string;

  // New fields from modal
  description?: string;
  email?: string;
  phone?: string;
  probability?: number;
  status?: string; // e.g., 'Ativo', 'Inativo'
  clientId?: Id; 
  source?: string;
  createdAt?: string;
  groupInfo?: GroupInfo;
  activePlaybook?: {
    playbookId: Id;
    playbookName: string;
    startedAt: string; // ISO string date
  };
  playbookHistory?: PlaybookHistoryEntry[];
  lostReason?: string;
  reactivationDate?: string; // ISO String
  qualificationStatus?: 'pending' | 'qualified' | 'disqualified';
  disqualificationReason?: string;
  boardId?: Id;
  isArchived?: boolean;
  ownerId?: string;
  wonAt?: string; // ISO string — set when status changes to 'GANHO'
}

export interface Board {
  id: Id;
  name: string;
  slug?: string;        // coluna opcional: existe no banco se migration for aplicada
  description?: string;
  type: 'sdr' | 'sales' | 'onboarding' | 'cs' | 'upsell' | 'custom';
  columns: ColumnData[];
  isDefault?: boolean;
  suggestedProductId?: Id; // feature futura — não persiste no banco ainda
  onWinBoardId?: Id;       // feature futura — não persiste no banco ainda
  wonStageId?: Id;         // feature futura — não persiste no banco ainda
  lostStageId?: Id;        // feature futura — não persiste no banco ainda
}

export interface ColumnData {
  id: Id;
  title: string;
  color: string;
  type: 'open' | 'qualification' | 'follow-up' | 'scheduling' | 'won' | 'lost';
  promoteTo?: string;
}

export interface Activity {
  id: Id;
  leadId: Id;
  type: 'note' | 'status_change' | 'email_sent' | 'playbook_completed';
  text: string;
  authorName: string;
  timestamp: string; // ISO string
}

export interface Task {
    id: Id;
    type: 'task' | 'email' | 'call' | 'meeting' | 'note';
    title: string;
    description?: string;
    dueDate: string; // ISO String for date
    status: 'pending' | 'completed';
    leadId: Id;
    userId: string;
    playbookId?: Id;
    playbookStepIndex?: number;
}

export type Tone = 'Amigável' | 'Formal' | 'Urgente' | 'Persuasivo' | 'Profissional' | 'Entusiástico' | 'Educacional';

export interface EmailDraft {
  id: Id;
  leadId: Id;
  objective: string;
  tones: Tone[];
  subject: string;
  body: string;
  createdAt: string;
}

export interface CardDisplaySettings {
  showCompany: boolean;
  showSegment: boolean;
  showValue: boolean;
  showTags: boolean;
  showProbability: boolean;
  showDueDate: boolean;
  showAssignedTo: boolean;
  showEmail: boolean;
  showPhone: boolean;
  showCreatedAt: boolean;
  showStage: boolean;
}

export interface ListDisplaySettings {
  showStatus: boolean;
  showValue: boolean;
  showTags: boolean;
  showLastActivity: boolean;
  showEmail: boolean;
  showPhone: boolean;
  showCreatedAt: boolean;
}

// FIX: Added ChatChannel type to be used in ChatMessage and ChatConversation interfaces.
export type ChatChannel = 'whatsapp' | 'instagram' | 'email' | 'internal';

export interface ChatMessage {
    id: Id;
    conversationId: Id;
    // FIX: Changed senderId from string to Id to allow for lead IDs which can be numbers.
    senderId: Id; // 'user1' (current user) or leadId
    text: string;
    timestamp: string; // ISO String
    // FIX: Added channel property to ChatMessage interface.
    channel: ChatChannel;
}

export type ChatConversationStatus = 'not_started' | 'waiting' | 'open' | 'automation' | 'finished' | 'failed';

export interface ChatConversation {
    id: Id;
    leadId: Id;
    lastMessage: string;
    lastMessageTimestamp: string;
    unreadCount: number;
    status: ChatConversationStatus;
    // FIX: Added lastMessageChannel property to ChatConversation interface.
    lastMessageChannel: ChatChannel;
}

export interface GroupAnalysis {
  id: Id;
  groupId: Id;
  content: string;
  status: 'saved' | 'draft';
  createdAt: string; // ISO String
}

export type NotificationType = 'new_message' | 'task_due_soon' | 'task_overdue' | 'lead_assigned' | 'mention' | 'system_update' | 'lead_reactivation';

export interface Notification {
  id: Id;
  userId: string;
  type: NotificationType;
  text: string;
  // link allows navigation to the relevant part of the app
  link?: {
    view: string; // e.g., 'Pipeline', 'Chat', 'Tarefas'
    leadId?: Id;   // e.g., to open a specific lead slideover
    itemId?: Id;   // e.g., a specific task or conversation ID
  };
  isRead: boolean;
  createdAt: string; // ISO string
}

export interface PlaybookStep {
  day: number;
  type: Task['type'];
  instructions: string;
}

export interface Playbook {
  id: Id;
  name: string;
  stages: Id[]; // Which pipeline stages this playbook applies to
  steps: PlaybookStep[];
}


export type CreateLeadData = Partial<Omit<Lead, 'id'>>;
export type UpdateLeadData = Partial<Omit<Lead, 'id'>>;
export type CreateTaskData = Omit<Task, 'id' | 'userId'>;
export type UpdateTaskData = Partial<CreateTaskData>;
export type CreateEmailDraftData = Omit<EmailDraft, 'id' | 'createdAt'>;
export type CreateGroupData = Omit<Group, 'id'>;
export type UpdateGroupData = Partial<CreateGroupData>;
export type CreateGroupAnalysisData = Omit<GroupAnalysis, 'id' | 'createdAt'>;
export type UpdateGroupAnalysisData = Partial<Omit<GroupAnalysis, 'id' | 'createdAt' | 'groupId'>>;

// ─── Goals ───────────────────────────────────────────────────────────────────

export type GoalType =
  | 'receita'
  | 'vendas'
  | 'ticket_medio'
  | 'novos_clientes'
  | 'churn';

export type GoalFrequency = 'monthly' | 'quarterly' | 'yearly';

export interface Goal {
  id: string;
  companyId: string;
  name: string;
  goalType: GoalType;
  frequency: GoalFrequency;
  targetValue: number;
  isActive: boolean;
  createdAt: string;
  startDate: string;
  endDate: string;
  userId?: string | null;
}

export interface GoalPeriod {
  id: string;
  goalId: string;
  periodStart: string;
  periodEnd: string;
}

export interface CreateGoalData {
  name: string;
  goalType: GoalType;
  frequency: GoalFrequency;
  targetValue: number;
  isActive: boolean;
  periodStart: string;
  periodEnd: string;
  userId?: string | null;
}