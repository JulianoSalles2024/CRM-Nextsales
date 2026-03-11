import { safeError } from '@/src/utils/logger';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Bot, User, Loader2, Plus, Trash2, MessageSquare } from 'lucide-react';
import { createAIService } from '@/src/services/ai';
import { useAIState } from '@/src/features/ai/hooks/useAIState';
import { useAIProviders } from '@/src/features/ai-credentials/useAIProviders';
import { useAuth } from '@/src/features/auth/AuthContext';
import { useAIConversations, type AIMessage } from '@/src/hooks/useAIConversations';
import type { Lead, Task, ColumnData, Activity } from '@/types';

interface SdrAssistantChatProps {
    onClose: () => void;
    leads: Lead[];
    tasks: Task[];
    columns: ColumnData[];
    activities: Activity[];
}

const groupByDate = (conversations: any[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);

    const groups = [
        { label: 'Hoje', items: [] as any[] },
        { label: 'Ontem', items: [] as any[] },
        { label: 'Esta semana', items: [] as any[] },
        { label: 'Anteriores', items: [] as any[] },
    ];

    conversations.forEach(conv => {
        const d = new Date(conv.updatedAt);
        if (d >= today) groups[0].items.push(conv);
        else if (d >= yesterday) groups[1].items.push(conv);
        else if (d >= weekAgo) groups[2].items.push(conv);
        else groups[3].items.push(conv);
    });

    return groups.filter(g => g.items.length > 0);
};

const SdrAssistantChat: React.FC<SdrAssistantChatProps> = ({ onClose, leads, tasks, columns, activities }) => {
    const { state } = useAIState();
    const { credentials } = useAIProviders();
    const { currentUserRole, user } = useAuth();

    const isSeller = currentUserRole === 'seller';
    const toolId = isSeller ? 'sdr_vendas' : 'pilot';
    const activeTool = isSeller ? state.tools.sdr_vendas : state.tools.pilot;
    const isBlocked = isSeller && !activeTool.enabled;

    const {
        conversations,
        activeConversation,
        activeId,
        setActiveId,
        loading,
        createConversation,
        saveMessages,
        updateTitle,
        deleteConversation,
    } = useAIConversations(user?.id, toolId);

    const QUICK_REPLIES = !isSeller ? [
        { label: 'Vendas de ontem', message: 'Como foram as vendas de ontem? Traga um resumo do que foi fechado.' },
        { label: 'Como está o time?', message: 'Como está o desempenho do time hoje? Quem está se destacando e quem precisa de atenção?' },
        { label: 'Leads em risco', message: 'Quais leads estão em risco de esfriar ou ser perdidos? Preciso de um panorama rápido.' },
    ] : [];

    const [messages, setMessages] = useState<AIMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [quickRepliesVisible, setQuickRepliesVisible] = useState(false);
    const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
    const [titleInput, setTitleInput] = useState('');
    const [hoveredConvId, setHoveredConvId] = useState<string | null>(null);
    const [showBlockedUI, setShowBlockedUI] = useState(isBlocked);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);

    // Cria primeira conversa se não houver nenhuma
    useEffect(() => {
        if (!loading && conversations.length === 0) {
            createConversation();
        }
    }, [loading, conversations.length]);

    // Sincroniza mensagens locais com a conversa ativa
    useEffect(() => {
        if (activeConversation) {
            setMessages(activeConversation.messages);
            setQuickRepliesVisible(!isSeller && activeConversation.messages.length === 0);
        } else {
            setMessages([]);
            setQuickRepliesVisible(!isSeller);
        }
    }, [activeConversation?.id]);

    useEffect(() => { setShowBlockedUI(isBlocked); }, [isBlocked]);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);
    useEffect(() => { if (editingTitleId) titleInputRef.current?.focus(); }, [editingTitleId]);

    const activeCredential = useMemo(() => {
        if (credentials.gemini.status === 'connected') return credentials.gemini;
        if (credentials.openai.status === 'connected') return credentials.openai;
        if (credentials.anthropic.status === 'connected') return credentials.anthropic;
        return null;
    }, [credentials]);

    const getCRMContext = () => {
        const leadsSummary = leads.slice(0, 50).map(l => ({
            name: l.name,
            company: l.company,
            value: l.value,
            status: columns.find(c => c.id === l.columnId)?.title || 'Desconhecido',
            lastActivity: l.lastActivity,
        }));
        const tasksPending = tasks.filter(t => t.status === 'pending').length;
        const totalValue = leads.reduce((acc, curr) => acc + curr.value, 0);
        return `
        CONTEXTO ATUAL DO CRM:
        - Total de Leads: ${leads.length}
        - Valor Total em Pipeline: R$ ${totalValue.toFixed(2)}
        - Tarefas Pendentes: ${tasksPending}
        - Estágios do Pipeline: ${columns.map(c => c.title).join(', ')}

        AMOSTRA DE LEADS:
        ${JSON.stringify(leadsSummary)}
        `;
    };

    const handleNewConversation = async () => {
        await createConversation();
        setQuickRepliesVisible(!isSeller);
    };

    const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await deleteConversation(id);
    };

    const startEditTitle = (conv: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingTitleId(conv.id);
        setTitleInput(conv.title);
    };

    const commitTitle = async () => {
        if (editingTitleId && titleInput.trim()) {
            await updateTitle(editingTitleId, titleInput.trim());
        }
        setEditingTitleId(null);
    };

    const handleQuickReply = (message: string) => {
        setQuickRepliesVisible(false);
        handleSendMessage(message);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        setQuickRepliesVisible(false);
        const text = input;
        setInput('');
        handleSendMessage(text);
    };

    const handleSendMessage = async (text: string) => {
        let conversation = activeConversation;
        if (!conversation) {
            conversation = await createConversation();
            if (!conversation) return;
        }

        const userMessage: AIMessage = { id: Date.now().toString(), role: 'user', text };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setIsLoading(true);

        try {
            if (isBlocked) {
                const msg: AIMessage = { id: (Date.now() + 1).toString(), role: 'assistant', text: 'O administrador ainda não habilitou o SDR de vendas para sua equipe.' };
                const final = [...updatedMessages, msg];
                setMessages(final);
                await saveMessages(conversation.id, final);
                return;
            }
            if (!activeCredential) {
                const msg: AIMessage = { id: (Date.now() + 1).toString(), role: 'assistant', text: isSeller ? 'O assistente não está disponível. Entre em contato com o administrador.' : 'Nenhum provedor de IA conectado. Configure nas configurações.' };
                const final = [...updatedMessages, msg];
                setMessages(final);
                await saveMessages(conversation.id, final);
                return;
            }
            if (!activeTool.enabled) {
                const msg: AIMessage = { id: (Date.now() + 1).toString(), role: 'assistant', text: 'O assistente está desativado nas configurações.' };
                const final = [...updatedMessages, msg];
                setMessages(final);
                await saveMessages(conversation.id, final);
                return;
            }

            const service = createAIService(activeCredential.apiKey, activeCredential.model);
            const systemInstruction = `${activeTool.basePrompt}\n\n${getCRMContext()}`;
            const history = messages.map(m => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.text}`).join('\n');
            const prompt = `Histórico da conversa:\n${history}\nUsuário: ${text}\nAssistente:`;

            const responseText = await service.generate(prompt, systemInstruction);
            const assistantMessage: AIMessage = { id: (Date.now() + 1).toString(), role: 'assistant', text: responseText };
            const finalMessages = [...updatedMessages, assistantMessage];
            setMessages(finalMessages);

            const isFirst = messages.length === 0;
            const autoTitle = isFirst ? text.slice(0, 40) : undefined;
            await saveMessages(conversation.id, finalMessages, autoTitle);

        } catch (error: any) {
            safeError(error);
            const errMsg: AIMessage = { id: (Date.now() + 1).toString(), role: 'assistant', text: `Desculpe, tive um problema. Erro: ${error.message || 'Desconhecido'}` };
            setMessages(prev => [...prev, errMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const grouped = groupByDate(conversations);
    const initialMessage = isSeller
        ? 'Olá! Sou seu SDR de vendas. Como posso ajudar com seus leads hoje?'
        : 'Olá! Sou o Zenius, seu assistente estratégico. Como posso ajudar?';

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm p-4" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-700/60 shadow-2xl shadow-black/40 overflow-hidden flex flex-col h-[600px] max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800/60 bg-slate-900/60 backdrop-blur-md flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-sky-500 flex items-center justify-center shadow-lg shadow-blue-900/20 animate-pulse">
                            <Bot className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white leading-tight">
                                {isSeller ? 'SDR Vendas' : 'Zenius Pilot'}
                            </h3>
                            <p className="text-xs text-green-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span> Online
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleNewConversation}
                            className="p-2 rounded-full text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                            title="Nova conversa"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                        <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar de conversas */}
                    <div className="w-44 border-r border-slate-800/50 bg-slate-950/30 flex flex-col overflow-hidden flex-shrink-0">
                        <div className="flex-1 overflow-y-auto py-2">
                            {loading ? (
                                <div className="flex items-center justify-center h-16">
                                    <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
                                </div>
                            ) : grouped.length === 0 ? (
                                <p className="text-xs text-slate-600 px-3 pt-3">Nenhuma conversa</p>
                            ) : grouped.map(group => (
                                <div key={group.label} className="mb-3">
                                    <p className="text-[10px] text-slate-600 uppercase tracking-wider px-3 pb-1">{group.label}</p>
                                    {group.items.map(conv => (
                                        <div
                                            key={conv.id}
                                            onClick={() => setActiveId(conv.id)}
                                            onMouseEnter={() => setHoveredConvId(conv.id)}
                                            onMouseLeave={() => setHoveredConvId(null)}
                                            className={`flex items-center gap-1.5 px-3 py-2 cursor-pointer transition-all border-l-2 ${
                                                activeId === conv.id
                                                    ? 'border-blue-500 bg-blue-500/10 text-white'
                                                    : 'border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                                            }`}
                                        >
                                            <MessageSquare className="w-3 h-3 flex-shrink-0 opacity-40" />
                                            {editingTitleId === conv.id ? (
                                                <input
                                                    ref={titleInputRef}
                                                    value={titleInput}
                                                    onChange={e => setTitleInput(e.target.value)}
                                                    onBlur={commitTitle}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') commitTitle();
                                                        if (e.key === 'Escape') setEditingTitleId(null);
                                                    }}
                                                    onClick={e => e.stopPropagation()}
                                                    className="flex-1 bg-slate-700 text-white text-xs rounded px-1 py-0.5 outline-none min-w-0"
                                                />
                                            ) : (
                                                <span
                                                    className="flex-1 text-xs truncate"
                                                    onDoubleClick={e => startEditTitle(conv, e)}
                                                    title={conv.title}
                                                >
                                                    {conv.title}
                                                </span>
                                            )}
                                            {hoveredConvId === conv.id && editingTitleId !== conv.id && (
                                                <button
                                                    onClick={e => handleDeleteConversation(e, conv.id)}
                                                    className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Área principal */}
                    {showBlockedUI ? (
                        <div className="flex flex-1 items-center justify-center p-6">
                            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full text-center">
                                <h2 className="text-lg font-semibold text-white mb-2">Assistente de vendas não está ativo</h2>
                                <p className="text-sm text-slate-400 mb-6">O administrador ainda não habilitou o SDR de vendas para sua equipe.</p>
                                <button
                                    onClick={() => setShowBlockedUI(false)}
                                    className="w-full bg-gradient-to-r from-sky-500 to-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
                                >
                                    Entendi
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Mensagens */}
                            <div className="flex-1 p-4 overflow-y-auto bg-slate-950/50 space-y-4">
                                {messages.length === 0 && !isLoading && (
                                    <div className="flex justify-start">
                                        <div className="flex items-start gap-2 max-w-[80%]">
                                            <div className="w-8 h-8 rounded-full bg-blue-900/30 border border-blue-700/50 flex items-center justify-center flex-shrink-0 mt-1">
                                                <Bot className="w-4 h-4 text-blue-400" />
                                            </div>
                                            <div className="p-3 rounded-2xl rounded-tl-none text-sm leading-relaxed bg-slate-900 border border-slate-800 text-slate-200">
                                                {initialMessage}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {messages.map(msg => (
                                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`flex items-start gap-2 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${msg.role === 'user' ? 'bg-slate-700' : 'bg-blue-900/30 border border-blue-700/50'}`}>
                                                {msg.role === 'user' ? <User className="w-4 h-4 text-slate-300" /> : <Bot className="w-4 h-4 text-blue-400" />}
                                            </div>
                                            <div className={`p-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-blue-600/20 border border-blue-500/25 text-white rounded-tr-none' : 'bg-slate-900/80 border border-slate-800/80 text-slate-200 rounded-tl-none'}`}>
                                                {msg.text}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-blue-900/30 border border-blue-700/50 flex items-center justify-center flex-shrink-0">
                                                <Bot className="w-4 h-4 text-blue-400" />
                                            </div>
                                            <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none">
                                                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Quick Replies */}
                            {quickRepliesVisible && QUICK_REPLIES.length > 0 && (
                                <div className="px-4 pb-2 flex gap-2 flex-wrap">
                                    {QUICK_REPLIES.map(qr => (
                                        <button
                                            key={qr.label}
                                            onClick={() => handleQuickReply(qr.message)}
                                            className="text-xs px-3 py-1.5 rounded-full border border-blue-700/50 bg-blue-950/40 text-blue-300 hover:bg-blue-900/50 hover:border-blue-500 transition-all duration-200"
                                        >
                                            {qr.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Input */}
                            <div className="p-4 bg-slate-900/40 border-t border-slate-800/50">
                                <form onSubmit={handleSend} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={e => setInput(e.target.value)}
                                        placeholder="Pergunte sobre seus leads ou tarefas..."
                                        className="flex-1 bg-slate-900/50 border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!input.trim() || isLoading}
                                        className="bg-gradient-to-r from-sky-500 to-blue-500 hover:shadow-[0_0_18px_rgba(29,161,242,0.45)] text-white p-3 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-sky-500/20"
                                    >
                                        <Send className="w-5 h-5" />
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default SdrAssistantChat;
