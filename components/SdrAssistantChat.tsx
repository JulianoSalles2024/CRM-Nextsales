import { safeError } from '@/src/utils/logger';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Bot, User, Loader2 } from 'lucide-react';
import { createAIService } from '@/src/services/ai';
import { useAIState } from '@/src/features/ai/hooks/useAIState';
import { useAIProviders } from '@/src/features/ai-credentials/useAIProviders';
import { useAuth } from '@/src/features/auth/AuthContext';
import type { Lead, Task, ColumnData, Activity } from '../types';

interface SdrAssistantChatProps {
    onClose: () => void;
    leads: Lead[];
    tasks: Task[];
    columns: ColumnData[];
    activities: Activity[];
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    text: string;
}

const SdrAssistantChat: React.FC<SdrAssistantChatProps> = ({ onClose, leads, tasks, columns, activities }) => {
    const { state } = useAIState();
    const { credentials } = useAIProviders();
    const { currentUserRole } = useAuth();

    const isSeller = currentUserRole === 'seller';
    const activeTool = isSeller ? state.tools.sdr_vendas : state.tools.pilot;
    const isBlocked = isSeller && !activeTool.enabled;

    const activeCredential = useMemo(() => {
        if (credentials.gemini.status === 'connected') return credentials.gemini;
        if (credentials.openai.status === 'connected') return credentials.openai;
        if (credentials.anthropic.status === 'connected') return credentials.anthropic;
        return null;
    }, [credentials]);

    const initialMessage = isSeller
        ? 'Olá! Sou seu SDR de vendas. Como posso ajudar com seus leads hoje?'
        : 'Olá! Sou seu assistente de vendas Pilot. Como posso ajudar com seus leads hoje?';

    const [showBlockedUI, setShowBlockedUI] = useState(isBlocked);

    useEffect(() => {
        setShowBlockedUI(isBlocked);
    }, [isBlocked]);

    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'assistant', text: initialMessage }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const getCRMContext = () => {
        const leadsSummary = leads.slice(0, 50).map(l => ({
            name: l.name,
            company: l.company,
            value: l.value,
            status: columns.find(c => c.id === l.columnId)?.title || 'Desconhecido',
            lastActivity: l.lastActivity
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

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { id: Date.now().toString(), role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            if (isBlocked) {
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', text: 'O administrador ainda não habilitou o SDR de vendas para sua equipe. Entre em contato com o responsável pela conta.' }]);
                return;
            }

            if (!activeCredential) {
                const noCredentialMsg = isSeller
                    ? 'O assistente de vendas não está disponível no momento. Entre em contato com o administrador.'
                    : 'Erro: Nenhum provedor de IA conectado. Por favor, configure suas credenciais nas configurações.';
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', text: noCredentialMsg }]);
                return;
            }

            if (!activeTool.enabled) {
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', text: 'O assistente está desativado nas configurações.' }]);
                return;
            }

            const service = createAIService(activeCredential.apiKey, activeCredential.model);
            const systemInstruction = `${activeTool.basePrompt}\n\n${getCRMContext()}`;
            const history = messages.map(m => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.text}`).join('\n');
            const prompt = `Histórico da conversa:\n${history}\nUsuário: ${userMessage.text}\nAssistente:`;

            const responseText = await service.generate(prompt, systemInstruction);

            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', text: responseText }]);

        } catch (error: any) {
            safeError(error);
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', text: `Desculpe, tive um problema ao processar sua solicitação. Erro: ${error.message || 'Desconhecido'}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm p-4" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-slate-950 w-full max-w-lg rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[600px] max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-sky-500 flex items-center justify-center shadow-lg shadow-blue-900/20 animate-pulse">
                            <Bot className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white leading-tight">
                                {isSeller ? 'SDR Vendas' : 'SDR Assistant'}
                            </h3>
                            <p className="text-xs text-green-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span> Online
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {showBlockedUI ? (
                    /* Bloqueio inline — ocupa apenas o flex-1, sem absolute/fixed */
                    <div className="flex flex-1 items-center justify-center p-6">
                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full text-center">
                            <h2 className="text-lg font-semibold text-white mb-2">
                                Assistente de vendas não está ativo
                            </h2>
                            <p className="text-sm text-slate-400 mb-6">
                                O administrador ainda não habilitou o SDR de vendas para sua equipe. Entre em contato com o responsável pela conta.
                            </p>
                            <button
                                onClick={() => setShowBlockedUI(false)}
                                className="w-full bg-gradient-to-r from-sky-500 to-blue-500 hover:shadow-[0_0_18px_rgba(29,161,242,0.45)] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
                            >
                                Entendi
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Messages Area */}
                        <div className="flex-1 p-4 overflow-y-auto bg-slate-950 space-y-4">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex items-start gap-2 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${msg.role === 'user' ? 'bg-slate-700' : 'bg-blue-900/30 border border-blue-700/50'}`}>
                                            {msg.role === 'user' ? <User className="w-4 h-4 text-slate-300" /> : <Bot className="w-4 h-4 text-blue-400" />}
                                        </div>
                                        <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                                            msg.role === 'user'
                                                ? 'bg-slate-800 text-white rounded-tr-none'
                                                : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                                        }`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="flex items-center gap-2 max-w-[80%]">
                                        <div className="w-8 h-8 rounded-full bg-blue-900/30 border border-blue-700/50 flex items-center justify-center flex-shrink-0 mt-1">
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

                        {/* Input Area */}
                        <div className="p-4 bg-slate-900/50 border-t border-slate-800">
                            <form onSubmit={handleSend} className="flex gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Pergunte sobre seus leads ou tarefas..."
                                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600/50 transition-all"
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
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default SdrAssistantChat;
