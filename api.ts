import { supabase } from './services/supabaseClient';
import { GoogleGenAI, Type } from '@google/genai';
import type { ColumnData, Lead, Id, CreateLeadData, UpdateLeadData, Activity, User, Task, CreateTaskData, UpdateTaskData, Tone, Group, EmailDraft, CreateEmailDraftData, ChatConversation, ChatMessage, CreateGroupData, UpdateGroupData, GroupAnalysis, CreateGroupAnalysisData, UpdateGroupAnalysisData, ChatChannel, Notification, ChatConversationStatus } from './types';
import { initialColumns } from './data';

// --- AUTHENTICATION ---
export const getCurrentUser = async (): Promise<User | null> => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!session) return null;
    return {
        id: session.user.id,
        name: session.user.user_metadata.name || session.user.email,
        email: session.user.email!,
        avatarUrl: session.user.user_metadata.avatar_url,
    };
};

export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return subscription;
};

export const loginUser = async (email: string, password: string): Promise<User> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error("Login failed, no user returned.");
    return {
        id: data.user.id,
        name: data.user.user_metadata.name,
        email: data.user.email!,
    };
};

export const signInWithGoogle = async (): Promise<void> => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) throw error;
};

export const registerUser = async (name: string, email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
            data: { name }
        }
    });
    if (error) throw error;
};

export const logoutUser = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

export const sendPasswordResetEmail = async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
};


// --- DATA FETCHING & MUTATION ---

// LEADS
export const getLeads = async (): Promise<Lead[]> => {
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(d => ({
        id: d.id, columnId: d.column_id, name: d.name, company: d.company_name, value: d.value,
        avatarUrl: d.avatar_url, tags: d.tags || [], lastActivity: d.last_activity,
        lastActivityTimestamp: d.last_activity_timestamp || d.created_at,
        dueDate: d.due_date, assignedTo: d.assigned_to, description: d.description,
        email: d.email, phone: d.phone, probability: d.probability, status: d.status,
        clientId: d.client_id, source: d.source, createdAt: d.created_at, groupInfo: d.group_info
    })); 
};

export const createLead = async (leadData: CreateLeadData): Promise<Lead> => {
    const user = await getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const { columnId, avatarUrl, assignedTo, clientId, createdAt, dueDate, lastActivity, groupInfo, ...rest } = leadData;

    const { data, error } = await supabase
        .from('leads')
        .insert({ 
            ...rest, 
            column_id: columnId,
            avatar_url: avatarUrl,
            assigned_to: assignedTo,
            client_id: clientId,
            created_at: createdAt,
            due_date: dueDate,
            last_activity: lastActivity,
            group_info: groupInfo,
            owner_id: user.id,   // 🔥 ESSENCIAL
        })
        .select()
        .single();

    if (error) throw error;
    return { ...data, columnId: data.column_id } as Lead;
};

export const updateLead = async (leadId: Id, updates: UpdateLeadData): Promise<Lead> => {
    const { columnId, avatarUrl, assignedTo, clientId, createdAt, dueDate, lastActivity, groupInfo, ...rest } = updates;
    const payload: any = {...rest};
    if (columnId) payload.column_id = columnId;
    if (avatarUrl) payload.avatar_url = avatarUrl;
    if (assignedTo) payload.assigned_to = assignedTo;
    if (clientId) payload.client_id = clientId;
    if (createdAt) payload.created_at = createdAt;
    if (dueDate) payload.due_date = dueDate;
    if (lastActivity) payload.last_activity = lastActivity;
    if (groupInfo) payload.group_info = groupInfo;


    const { data, error } = await supabase
        .from('leads')
        .update(payload)
        .eq('id', leadId)
        .select()
        .single();
        
    if (error) throw error;
    return { ...data, columnId: data.column_id } as Lead;
};

export const deleteLead = async (leadId: Id): Promise<{ success: true }> => {
    const { error } = await supabase.from('leads').delete().eq('id', leadId);
    if (error) throw error;
    return { success: true };
};

// TASKS
export const getTasks = async (): Promise<Task[]> => {
    const { data, error } = await supabase.from('tasks').select('*').order('due_date', { ascending: true });
    if (error) throw error;
    return data.map(t => ({
        id: t.id, userId: t.user_id, leadId: t.lead_id, type: t.type, title: t.title,
        description: t.description, dueDate: t.due_date, status: t.status,
    }));
};

export const createTask = async (taskData: CreateTaskData): Promise<Task> => {
    const user = await getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase.from('tasks').insert({
        user_id: user.id, lead_id: taskData.leadId, type: taskData.type, title: taskData.title,
        description: taskData.description, due_date: taskData.dueDate, status: taskData.status
    }).select().single();
    if (error) throw error;
    return { id: data.id, userId: data.user_id, leadId: data.lead_id, ...taskData };
};

export const updateTask = async (taskId: Id, updates: UpdateTaskData): Promise<Task> => {
    const payload: any = {};
    if (updates.leadId) payload.lead_id = updates.leadId;
    if (updates.type) payload.type = updates.type;
    if (updates.title) payload.title = updates.title;
    if (updates.description) payload.description = updates.description;
    if (updates.dueDate) payload.due_date = updates.dueDate;
    if (updates.status) payload.status = updates.status;

    const { data, error } = await supabase.from('tasks').update(payload).eq('id', taskId).select().single();
    if (error) throw error;
     return {
        id: data.id, userId: data.user_id, leadId: data.lead_id, type: data.type, title: data.title,
        description: data.description, dueDate: data.due_date, status: data.status,
    };
};

export const deleteTask = async (taskId: Id): Promise<{ success: true }> => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) throw error;
    return { success: true };
};

// ACTIVITIES
export const getActivities = async (): Promise<Activity[]> => {
    const { data, error } = await supabase.from('activities').select('*').order('timestamp', { ascending: false });
    if (error) throw error;
    return data.map(d => ({
        id: d.id, leadId: d.lead_id, type: d.type, text: d.text,
        authorName: d.author_name, timestamp: d.created_at,
    }));
};

export const createActivity = async (activityData: Omit<Activity, 'id' | 'timestamp'>): Promise<Activity> => {
    const { data, error } = await supabase.from('activities').insert({
        lead_id: activityData.leadId, type: activityData.type,
        text: activityData.text, author_name: activityData.authorName,
    }).select().single();
    if (error) throw error;
    return {
        id: data.id, leadId: data.lead_id, type: data.type, text: data.text,
        authorName: data.author_name, timestamp: data.created_at,
    };
};

// PIPELINE / COLUMNS
export const getPipelineSettings = async (): Promise<ColumnData[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.app_metadata && user.app_metadata.pipeline_config) {
        return user.app_metadata.pipeline_config;
    }
    // For new users or if data is not set, return initial columns
    return initialColumns;
};

export const savePipelineSettings = async (columns: ColumnData[]): Promise<void> => {
    const { error } = await supabase.auth.updateUser({
        data: { pipeline_config: columns }
    });
    if (error) throw error;
};


// EMAIL DRAFTS
export const getEmailDrafts = async (): Promise<EmailDraft[]> => { return []; };
export const createEmailDraft = async (draftData: CreateEmailDraftData) => {};
export const deleteEmailDraft = async (draftId: Id) => {};

// CHAT
export const getConversations = async (): Promise<ChatConversation[]> => { return []; };
export const getMessages = async (): Promise<ChatMessage[]> => { return []; };
export const sendMessage = async (messageData: { conversationId: Id, senderId: Id, text: string, channel: ChatChannel, leadId?: Id }) => {};
export const updateConversationStatus = async (conversationId: Id, status: ChatConversationStatus): Promise<void> => {};

// GROUPS
export const getGroups = async (): Promise<Group[]> => { return []; };
export const createGroup = async (groupData: CreateGroupData) => {};
export const updateGroup = async (groupId: Id, updates: UpdateGroupData) => {};
export const deleteGroup = async (groupId: Id) => {};

// GROUP ANALYSIS
export const getGroupAnalyses = async (): Promise<GroupAnalysis[]> => { return []; };
export const createGroupAnalysis = async (analysisData: CreateGroupAnalysisData) => {};
export const updateGroupAnalysis = async (analysisId: Id, updates: UpdateGroupAnalysisData) => {};
export const deleteGroupAnalysis = async (analysisId: Id) => {};

// NOTIFICATIONS
export const getNotifications = async (): Promise<Notification[]> => { return []; };
export const updateNotification = async (notificationId: Id, updates: { is_read: boolean }) => {};
export const markAllNotificationsRead = async () => {};
export const clearAllNotifications = async () => {};


// --- Gemini AI Services ---
export const generateEmailSuggestion = async (
    objective: string,
    tones: Tone[],
    includeLeadInfo: boolean,
    lead: Lead
): Promise<{ subject: string; body: string }> => {
    if (!process.env.API_KEY) {
        throw new Error("API Key for Gemini is not configured.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    let prompt = `Escreva um email com o seguinte objetivo: "${objective}". O tom deve ser uma combinação de: ${tones.join(', ')}.`;
    if (includeLeadInfo && lead) {
        prompt += `\n\nUse as seguintes informações do lead para personalizar o email (não invente informações que não estão aqui):\n- Nome do Contato: ${lead.name}\n- Empresa: ${lead.company}\n- Valor da Oportunidade: R$${lead.value}\n- Descrição do Lead: ${lead.description || 'Não fornecida'}`;
    }
    prompt += `\n\nResponda estritamente com um objeto JSON contendo as chaves "subject" (assunto do email) e "body" (corpo do email). O corpo do email deve usar quebras de linha (\\n) para parágrafos.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    subject: { type: Type.STRING },
                    body: { type: Type.STRING }
                },
                required: ['subject', 'body']
            }
        }
    });
    
    return JSON.parse(response.text);
};


export const generateGroupAnalysis = async (
    group: Group,
    groupMetrics: {
        currentMembers: number;
        onboardingRate: number;
        churnRate: number;
        totalJoined: number;
        totalOnboarded: number;
        totalChurned: number;
    },
    leads: Lead[]
): Promise<string> => {
     if (!process.env.API_KEY) {
        throw new Error("API Key for Gemini is not configured.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `Você é um analista de negócios especialista em comunidades online e gestão de leads. Analise os seguintes dados do grupo '${group.name}' e forneça um resumo analítico detalhado.

**Dados do Grupo:**
- **Nome:** ${group.name}
- **Descrição:** ${group.description || 'Não fornecida'}
- **Meta de Membros:** ${group.memberGoal || 'Não definida'}

**Métricas Chave:**
- **Membros Atuais:** ${groupMetrics.currentMembers}
- **Taxa de Onboarding (dos que entraram):** ${groupMetrics.onboardingRate.toFixed(1)}%
- **Taxa de Churn (dos que entraram):** ${groupMetrics.churnRate.toFixed(1)}%

**Dados Gerais dos Membros:**
- **Total de Leads Associados:** ${leads.length}
- **Leads que entraram no grupo:** ${groupMetrics.totalJoined}
- **Leads que permanecem no grupo:** ${groupMetrics.currentMembers}
- **Leads que saíram (churn):** ${groupMetrics.totalChurned}
- **Leads que completaram onboarding:** ${groupMetrics.totalOnboarded}

**Sua Tarefa:**
Com base nesses dados, gere uma análise em texto com as seguintes seções, usando markdown para formatação (títulos com ##, listas com *, negrito com **):
1.  **Resumo Executivo:** Uma visão geral rápida da saúde e performance do grupo.
2.  **Pontos Fortes:** Identifique o que está funcionando bem.
3.  **Pontos de Melhoria:** Aponte áreas que precisam de atenção.
4.  **Padrões e Insights:** Destaque padrões interessantes (ex: alta taxa de churn apesar do bom onboarding, etc.).
5.  **Recomendações e Próximos Passos:** Sugira 2-3 ações concretas para o gestor do grupo tomar para melhorar as métricas.

Seja claro, conciso e use os dados para embasar sua análise.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });

    return response.text;
}

export const addSampleData = async (sampleLeads: Lead[], sampleTasks: Task[]): Promise<void> => {
    const user = await getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const leadsToInsert = sampleLeads.map(lead => ({
        name: lead.name, company: lead.company, value: lead.value, avatar_url: lead.avatarUrl,
        last_activity: lead.lastActivity, due_date: lead.dueDate, assigned_to: lead.assignedTo,
        description: lead.description, email: lead.email, phone: lead.phone,
        probability: lead.probability, status: lead.status, client_id: lead.clientId,
        source: lead.source, created_at: lead.createdAt, column_id: lead.columnId
    }));

    const { data: insertedLeadsData, error: leadsError } = await supabase
        .from('leads')
        .insert(leadsToInsert)
        .select('id');

    if (leadsError) throw leadsError;

    const oldIdToNewIdMap = new Map<Id, Id>();
    sampleLeads.forEach((lead, index) => {
        oldIdToNewIdMap.set(lead.id, insertedLeadsData[index].id);
    });

    const tasksToInsert = sampleTasks
        .map(task => {
            const newLeadId = oldIdToNewIdMap.get(task.leadId);
            if (!newLeadId) return null;
            return {
                user_id: user.id, lead_id: newLeadId, type: task.type, title: task.title,
                description: task.description, due_date: task.dueDate, status: task.status,
            };
        })
        .filter((t): t is NonNullable<typeof t> => t !== null);

    if (tasksToInsert.length > 0) {
        const { error: tasksError } = await supabase.from('tasks').insert(tasksToInsert);
        if (tasksError) throw tasksError;
    }
};