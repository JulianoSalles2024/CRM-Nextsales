import { safeError } from '@/src/utils/logger';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Bot, Send, User, Building, DollarSign, Sparkles, FileText, Loader2, MessageSquare, Inbox, FileClock, CheckCircle2, XCircle, MessageCircle as OpenIcon, ChevronDown, Phone, CheckCheck, ChevronRight, ChevronLeft, Mail, Instagram, MessageSquare as WhatsAppIcon } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { AnimatePresence, motion } from 'framer-motion';
import { Lead, ChatConversation, ChatMessage, User as UserType, Id, ChatConversationStatus, ChatChannel } from '../types';

interface ChatViewProps {
    conversations: ChatConversation[];
    messages: ChatMessage[];
    leads: Lead[];
    currentUser: UserType;
    onSendMessage: (conversationId: Id, text: string, channel: ChatChannel, leadId: Id) => void;
    onUpdateConversationStatus: (conversationId: Id, status: ChatConversationStatus) => void;
    showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return `agora`;
    const diffMinutes = Math.round(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h`;
    
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
};

const statusConfig: Record<ChatConversationStatus, { label: string; icon: React.ElementType; color: string; bgColor: string; }> = {
    open: { label: 'Em Aberto', icon: OpenIcon, color: 'text-blue-400', bgColor: 'bg-blue-900/50' },
    waiting: { label: 'Aguardando', icon: FileClock, color: 'text-yellow-400', bgColor: 'bg-yellow-900/50' },
    not_started: { label: 'Não Iniciada', icon: Inbox, color: 'text-zinc-400', bgColor: 'bg-zinc-700/50' },
    automation: { label: 'Automação', icon: Bot, color: 'text-purple-400', bgColor: 'bg-purple-900/50' },
    finished: { label: 'Finalizada', icon: CheckCircle2, color: 'text-green-400', bgColor: 'bg-green-900/50' },
    failed: { label: 'Falha', icon: XCircle, color: 'text-red-400', bgColor: 'bg-red-900/50' },
};

const channelConfig: Record<ChatChannel, { icon: React.ElementType; color: string; name: string }> = {
    whatsapp: { icon: WhatsAppIcon, color: '#25D366', name: 'WhatsApp' },
    instagram: { icon: Instagram, color: '#E4405F', name: 'Instagram' },
    email: { icon: Mail, color: '#3b82f6', name: 'E-mail' },
    internal: { icon: FileText, color: '#a1a1aa', name: 'Nota Interna' },
};


const ChatView: React.FC<ChatViewProps> = ({ conversations, messages, leads, currentUser, onSendMessage, onUpdateConversationStatus, showNotification }) => {
    const [activeConversationId, setActiveConversationId] = useState<Id | null>(conversations[0]?.id || null);
    const [newMessage, setNewMessage] = useState('');
    const [isLoadingAi, setIsLoadingAi] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState('');
    const [activeStatusFilter, setActiveStatusFilter] = useState<ChatConversationStatus | 'all'>('all');
    const [isStatusMenuOpen, setStatusMenuOpen] = useState(false);
    const [isAiAssistantCollapsed, setIsAiAssistantCollapsed] = useState(false);
    const [sendChannel, setSendChannel] = useState<ChatChannel>('whatsapp');
    const [isChannelMenuOpen, setChannelMenuOpen] = useState(false);


    const statusMenuRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const channelMenuRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
                setStatusMenuOpen(false);
            }
             if (channelMenuRef.current && !channelMenuRef.current.contains(event.target as Node)) {
                setChannelMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const leadsMap = useMemo(() => new Map(leads.map(lead => [lead.id, lead])), [leads]);

    const activeConversation = useMemo(() => 
        conversations.find(c => c.id === activeConversationId), 
        [conversations, activeConversationId]
    );

    const activeLead = useMemo(() => 
        activeConversation ? leadsMap.get(activeConversation.leadId) : null,
        [activeConversation, leadsMap]
    );
    
    const statusFilters: {
        id: ChatConversationStatus;
        label: string;
        icon: React.ElementType;
    }[] = Object.entries(statusConfig).map(([id, {label, icon}]) => ({ id: id as ChatConversationStatus, label, icon }));


    const statusCounts = useMemo(() => {
        const counts: Record<ChatConversationStatus | 'all', number> = {
            all: conversations.length,
            open: 0,
            waiting: 0,
            not_started: 0,
            automation: 0,
            finished: 0,
            failed: 0,
        };
        conversations.forEach(conv => {
            counts[conv.status]++;
        });
        return counts;
    }, [conversations]);

    const filteredConversations = useMemo(() => {
        if (activeStatusFilter === 'all') return conversations;
        return conversations.filter(c => c.status === activeStatusFilter);
    }, [conversations, activeStatusFilter]);

    const messagesForActiveConversation = useMemo(() => 
        messages
            .filter(m => m.conversationId === activeConversationId)
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
        [messages, activeConversationId]
    );

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messagesForActiveConversation]);
    
     useEffect(() => {
        setAiSuggestion('');
    }, [activeConversationId]);
    
    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeConversationId || !activeLead) {
            return;
        }
        onSendMessage(activeConversationId, newMessage, sendChannel, activeLead.id);
        setNewMessage('');
    };
    
    const generateAiPrompt = (task: 'reply' | 'summary') => {
        if (!activeLead || messagesForActiveConversation.length === 0) return '';
        
        const conversationHistory = messagesForActiveConversation.map(msg => {
            const senderName = msg.senderId === currentUser.id ? 'Eu (Vendedor)' : activeLead.name;
            return `${senderName} (via ${msg.channel}): ${msg.text}`;
        }).join('\n');

        if (task === 'reply') {
            return `Contexto do Lead:\nNome: ${activeLead.name}\nEmpresa: ${activeLead.company}\nDescrição: ${activeLead.description}\n\nHistórico da Conversa Omnichannel:\n${conversationHistory}\n\nTarefa: Com base no histórico e no contexto do lead, sugira a próxima resposta ideal para o vendedor (Eu) continuar a conversa de forma eficaz. A resposta deve ser profissional e direcionada para avançar no processo de venda.`;
        } else { // summary
             return `Histórico da Conversa Omnichannel:\n${conversationHistory}\n\nTarefa: Resuma os pontos-chave desta conversa em 3 a 5 tópicos (bullet points).`;
        }
    };

    const handleAiAction = async (task: 'reply' | 'summary') => {
        const prompt = generateAiPrompt(task);
        if (!prompt) {
            alert("Não há mensagens suficientes para usar a IA.");
            return;
        }
        
        setIsLoadingAi(true);
        setAiSuggestion('');

        try {
            if (!process.env.API_KEY) throw new Error("API Key for Gemini is not configured.");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt
            });
            setAiSuggestion(response.text);
        } catch(e) {
            safeError(e);
            setAiSuggestion("Ocorreu um erro ao contatar a IA. Verifique sua chave de API.");
        } finally {
            setIsLoadingAi(false);
        }
    }
    
    const StatusIcon = ({ status }: { status: ChatConversationStatus }) => {
        const config = statusConfig[status] || statusConfig.open;
        const Icon = config.icon;
        return <Icon className={`w-4 h-4 flex-shrink-0 ${config.color}`} title={config.label} />;
    };
    
    const ChannelIcon = ({ channel, className }: { channel: ChatChannel; className?: string }) => {
        const config = channelConfig[channel] || channelConfig.internal;
        const Icon = config.icon;
        return <Icon className={`w-4 h-4 flex-shrink-0 ${className}`} style={{ color: config.color }} title={config.name} />;
    };

    return (
        <div className="flex h-full bg-zinc-900 -m-6 border border-zinc-800 rounded-lg overflow-hidden">
            {/* Conversations List */}
            <div className="w-1/4 border-r border-zinc-800 flex flex-col flex-shrink-0">
                <div className="p-4 border-b border-zinc-800">
                    <h2 className="text-lg font-bold text-white">Conversas</h2>
                </div>
                <div className="p-2 border-b border-zinc-800">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 -mb-2 no-scrollbar" style={{ scrollbarWidth: 'none' }}>
                        <button
                            onClick={() => setActiveStatusFilter('all')}
                            className={`flex-shrink-0 px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-2 ${activeStatusFilter === 'all' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:bg-zinc-700/50'}`}
                        >
                            Todas <span className="text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded-full text-xs">{statusCounts.all}</span>
                        </button>
                        {statusFilters.map(filter => (
                            <button
                                key={filter.id}
                                onClick={() => setActiveStatusFilter(filter.id)}
                                className={`flex-shrink-0 px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-2 ${activeStatusFilter === filter.id ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:bg-zinc-700/50'}`}
                            >
                                <filter.icon className="w-3.5 h-3.5" />
                                {filter.label} <span className="text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded-full text-xs">{statusCounts[filter.id]}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {filteredConversations.map(conv => {
                        const lead = leadsMap.get(conv.leadId);
                        if (!lead) return null;
                        const isActive = conv.id === activeConversationId;
                        return (
                            <button key={conv.id} onClick={() => setActiveConversationId(conv.id)} className={`w-full text-left p-4 flex gap-3 transition-colors border-l-4 ${isActive ? 'bg-violet-900/40 border-violet-700' : 'border-transparent hover:bg-zinc-800/50'}`}>
                                <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center font-bold text-sm text-white flex-shrink-0">
                                    {lead.name.charAt(0)}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <StatusIcon status={conv.status} />
                                            <p className="font-semibold text-white truncate">{lead.name}</p>
                                        </div>
                                        <p className="text-xs text-zinc-500 flex-shrink-0">{formatTimestamp(conv.lastMessageTimestamp)}</p>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <ChannelIcon channel={conv.lastMessageChannel} className="w-3.5 h-3.5 flex-shrink-0" />
                                        <p className="text-sm text-zinc-400 truncate">{conv.lastMessage}</p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Main Chat Panel */}
            <div className="flex-1 flex flex-col bg-[#1e1e24]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill-rule='evenodd'%3E%3Cg id='hexagons' fill='%232a2a2f' fill-opacity='0.4' fill-rule='nonzero'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.99 7.5V30L0 22.5zM15 15l12.99 7.5V30L15 22.5z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}>
                {!activeConversation || !activeLead ? (
                    <div className="flex-1 flex items-center justify-center text-center backdrop-blur-sm bg-zinc-900/50">
                        <div>
                            <MessageSquare className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-white">Selecione uma conversa</h3>
                            <p className="text-zinc-500">Escolha uma conversa da lista para ver as mensagens.</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="p-4 border-b border-zinc-800 flex items-center justify-between gap-3 bg-zinc-900/80 backdrop-blur-sm">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center font-bold text-sm text-white flex-shrink-0">
                                    {activeLead.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white">{activeLead.name}</h3>
                                     {activeLead.phone ? (
                                        <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                                            <Phone className="w-3 h-3 text-zinc-500" />
                                            {activeLead.phone}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-zinc-500">Sem telefone</p>
                                    )}
                                </div>
                            </div>
                            <div className="relative" ref={statusMenuRef}>
                                <button
                                    onClick={() => setStatusMenuOpen(p => !p)}
                                    className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${statusConfig[activeConversation.status].bgColor} ${statusConfig[activeConversation.status].color} hover:opacity-90`}
                                >
                                    <StatusIcon status={activeConversation.status}/>
                                    <span>{statusConfig[activeConversation.status].label}</span>
                                    <ChevronDown className="w-4 h-4 opacity-70" />
                                </button>
                                <AnimatePresence>
                                    {isStatusMenuOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.15 }}
                                            className="absolute top-full right-0 mt-2 w-48 bg-zinc-800 rounded-lg border border-zinc-700 shadow-lg z-20 py-1"
                                        >
                                            {statusFilters.map(({ id, label, icon: Icon }) => (
                                                <button
                                                    key={id}
                                                    onClick={() => {
                                                        onUpdateConversationStatus(activeConversation.id, id);
                                                        setStatusMenuOpen(false);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700/50"
                                                >
                                                    <Icon className={`w-4 h-4 ${statusConfig[id].color}`} />
                                                    <span>{label}</span>
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                             {messagesForActiveConversation.map(msg => {
                                const isUser = msg.senderId === currentUser.id;
                                const bubbleColor = isUser ? 'bg-emerald-800 text-white rounded-br-none' : 'bg-zinc-700 text-zinc-200 rounded-bl-none';
                                const alignment = isUser ? 'justify-end' : 'justify-start';

                                return (
                                <div key={msg.id} className={`flex items-end gap-2 ${alignment}`}>
                                    <div className={`max-w-xl p-3 rounded-2xl shadow-md ${bubbleColor}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <ChannelIcon channel={msg.channel} className="w-3.5 h-3.5" />
                                            <p className="text-xs font-semibold" style={{ color: channelConfig[msg.channel]?.color }}>
                                                {isUser ? 'Você' : activeLead.name} via {channelConfig[msg.channel]?.name}
                                            </p>
                                        </div>
                                        <p className="text-sm pb-2">{msg.text}</p>
                                         {isUser && (
                                            <div className="flex justify-end items-center gap-1.5 -mb-1 -mr-1">
                                                <span className="text-xs text-emerald-300/70">{new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit'})}</span>
                                                <CheckCheck className="w-4 h-4 text-emerald-300/90" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                )
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                        <div className="p-4 border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
                            <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                                <div className="relative flex-1">
                                     <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                                        <div className="relative" ref={channelMenuRef}>
                                            <button
                                                type="button"
                                                onClick={() => setChannelMenuOpen(p => !p)}
                                                className="p-1 text-zinc-400 hover:text-white transition-colors"
                                                title={`Enviar via ${channelConfig[sendChannel].name}`}
                                            >
                                                <ChannelIcon channel={sendChannel} className="w-5 h-5"/>
                                            </button>
                                            <AnimatePresence>
                                                {isChannelMenuOpen && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: 10 }}
                                                        transition={{ duration: 0.15 }}
                                                        className="absolute bottom-full left-0 mb-2 w-48 bg-zinc-800 rounded-lg border border-zinc-700 shadow-lg z-20 py-1"
                                                    >
                                                        {Object.entries(channelConfig).map(([key, { name }]) => (
                                                            <button key={key} type="button" onClick={() => { setSendChannel(key as ChatChannel); setChannelMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700/50">
                                                                <ChannelIcon channel={key as ChatChannel} className="w-4 h-4" />
                                                                <span>{name}</span>
                                                            </button>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Enviar mensagem..."
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-11 pr-4 h-10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    />
                                </div>
                                <button type="submit" className="w-10 h-10 bg-gradient-to-r from-sky-500 to-blue-500 rounded-lg flex items-center justify-center text-white hover:shadow-[0_0_18px_rgba(29,161,242,0.45)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0" disabled={!newMessage.trim()}>
                                    <Send className="w-5 h-5" />
                                </button>
                            </form>
                        </div>
                    </>
                )}
            </div>

            {/* AI Assistant Panel */}
             <motion.div
                layout
                animate={{ width: isAiAssistantCollapsed ? 64 : '25%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="border-l border-zinc-800 flex flex-col flex-shrink-0 bg-zinc-900"
            >
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center h-[65px]">
                    <AnimatePresence>
                        {!isAiAssistantCollapsed && (
                            <motion.h2
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1, transition: { delay: 0.1 } }}
                                exit={{ opacity: 0 }}
                                className="text-lg font-bold text-white flex items-center gap-2"
                            >
                                <Bot className="w-5 h-5 text-violet-400" />
                                Assistente de IA
                            </motion.h2>
                        )}
                    </AnimatePresence>
                     <button onClick={() => setIsAiAssistantCollapsed(p => !p)} className="p-1 text-zinc-400 hover:text-white transition-colors rounded-md hover:bg-zinc-700">
                        {isAiAssistantCollapsed ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                </div>
                
                <AnimatePresence>
                    {!isAiAssistantCollapsed && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1, transition: { delay: 0.1 } }}
                            exit={{ opacity: 0 }}
                            className="flex-1 flex flex-col overflow-hidden"
                        >
                            <div className="p-4 space-y-4 border-b border-zinc-800">
                                <h3 className="font-semibold text-zinc-300">Contexto do Lead</h3>
                                {activeLead ? (
                                    <div className="space-y-3 text-sm">
                                        <div className="flex items-center gap-2"><User className="w-4 h-4 text-zinc-500"/> <span className="text-white">{activeLead.name}</span></div>
                                        <div className="flex items-center gap-2"><Building className="w-4 h-4 text-zinc-500"/> <span className="text-zinc-400">{activeLead.company}</span></div>
                                        <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-zinc-500"/> <span className="text-green-400 font-semibold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(activeLead.value)}</span></div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-zinc-500">Nenhum lead selecionado.</p>
                                )}
                            </div>
                            <div className="p-4 space-y-3">
                                <h3 className="font-semibold text-zinc-300">Ações da IA</h3>
                                <button onClick={() => handleAiAction('reply')} disabled={isLoadingAi || !activeLead} className="w-full flex items-center gap-2 text-sm bg-zinc-700 hover:bg-zinc-600 text-white font-semibold px-3 py-2 rounded-md transition-colors disabled:opacity-50">
                                    <Sparkles className="w-4 h-4" /> <span>Gerar Resposta</span>
                                </button>
                                <button onClick={() => handleAiAction('summary')} disabled={isLoadingAi || !activeLead} className="w-full flex items-center gap-2 text-sm bg-zinc-700 hover:bg-zinc-600 text-white font-semibold px-3 py-2 rounded-md transition-colors disabled:opacity-50">
                                    <FileText className="w-4 h-4" /> <span>Resumir Conversa</span>
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4">
                                {isLoadingAi && (
                                    <div className="flex items-center justify-center h-full">
                                        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
                                    </div>
                                )}
                                {aiSuggestion && !isLoadingAi && (
                                    <div className="text-sm text-zinc-300 bg-zinc-800/50 p-3 rounded-lg border border-zinc-700/50 whitespace-pre-wrap">
                                        {aiSuggestion}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default ChatView;