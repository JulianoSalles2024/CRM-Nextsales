import { ColumnData, Lead, Activity, User, Task, Tag, EmailDraft, ChatConversation, ChatMessage, Group, Notification, Playbook } from './types';

export const initialUsers: User[] = [
  { 
    id: 'local-user', 
    name: 'Usuário Local', 
    email: 'user@local.com', 
    role: 'Admin', 
    joinedAt: new Date().toISOString() 
  },
];

export const initialColumns: ColumnData[] = [
  { id: 'prospect', title: 'Prospecção', color: '#3b82f6', type: 'open' },
  { id: 'qualify', title: 'Qualificação', color: '#8b5cf6', type: 'qualification' },
  { id: 'proposal', title: 'Proposta', color: '#ec4899', type: 'follow-up' },
  { id: 'negotiation', title: 'Negociação', color: '#f97316', type: 'follow-up' },
  { id: 'scheduling', title: 'Agendamento', color: '#14b8a6', type: 'scheduling' }, // teal-500
  { id: 'closed', title: 'Fechamento', color: '#10b981', type: 'won' },
  { id: 'lost', title: 'Perdido', color: '#ef4444', type: 'lost' },
];

export const initialTags: Tag[] = [
  { id: 'tag-1', name: 'Urgente', color: '#ef4444' }, // red-500
  { id: 'tag-2', name: 'Médio', color: '#f97316' },   // orange-500
  { id: 'tag-3', name: 'Baixo', color: '#3b82f6' },    // blue-500
  { id: 'tag-4', name: 'Follow-up', color: '#eab308' }, // yellow-500
  { id: 'tag-5', name: 'Novo Cliente', color: '#10b981' }, // emerald-500
  { id: 'tag-6', name: 'A contactar', color: '#64748b' }, // slate-500
  { id: 'tag-7', name: 'Contactado', color: '#0ea5e9' }, // sky-500
  { id: 'tag-8', name: 'Agendado', color: '#8b5cf6' }, // violet-500
  { id: 'tag-9', name: 'Perdido', color: '#71717a' }, // zinc-500
  { id: 'tag-10', name: 'Recuperar', color: '#f59e0b' }, // amber-500
];

export const initialGroups: Group[] = [
    {
        id: 'group-alpha',
        name: 'Grupo Alpha',
        description: 'Grupo para leads de alto potencial e novos clientes do produto Alpha.',
        accessLink: 'https://chat.whatsapp.com/alpha',
        status: 'Ativo',
        memberGoal: 100,
    },
    {
        id: 'group-beta',
        name: 'Grupo Beta',
        description: 'Grupo de teste para o novo produto Beta.',
        accessLink: 'https://t.me/beta_group',
        status: 'Ativo',
        memberGoal: 50,
    },
    {
        id: 'group-onboarding',
        name: 'Onboarding VIP',
        description: 'Grupo exclusivo para clientes que fecharam o plano VIP.',
        status: 'Lotado',
    }
];


export const initialLeads: Lead[] = [];


export const initialActivities: Activity[] = [];

export const initialTasks: Task[] = [];
export const initialEmailDrafts: EmailDraft[] = [];

export const initialMessages: ChatMessage[] = [];

export const initialConversations: ChatConversation[] = [];

export const initialNotifications: Notification[] = [];

export const initialPlaybooks: Playbook[] = [
  {
    id: 'playbook-1',
    name: 'Prospecção Inicial (5 dias)',
    stages: ['prospect'],
    steps: [
      { day: 1, type: 'email', instructions: 'Enviar e-mail de introdução com material de apresentação.' },
      { day: 2, type: 'call', instructions: 'Ligar para confirmar o recebimento do e-mail e qualificar o interesse inicial.' },
      { day: 3, type: 'task', instructions: 'Conectar no LinkedIn e interagir com uma postagem recente.' },
      { day: 5, type: 'email', instructions: 'Enviar e-mail de follow-up com um case de sucesso relevante.' },
      { day: 5, type: 'call', instructions: 'Ligar para tentar agendar uma demonstração.' },
    ],
  },
  {
    id: 'playbook-2',
    name: 'Follow-up Pós-Proposta',
    stages: ['proposal', 'negotiation'],
    steps: [
      { day: 1, type: 'email', instructions: 'Enviar e-mail de agradecimento e confirmar recebimento da proposta.' },
      { day: 3, type: 'call', instructions: 'Ligar para tirar dúvidas sobre a proposta e identificar próximos passos.' },
      { day: 7, type: 'email', instructions: 'Enviar e-mail de follow-up com informações adicionais ou respondendo a uma dor específica.' },
    ],
  },
];