import React, { useState, useEffect } from 'react';
import {
    ToyBrick, KeyRound, Webhook as WebhookIcon, FileCode, Server, Copy, BookOpen, Settings, Eye, EyeOff, RefreshCw,
    Lock, ShieldCheck, Gauge, GitBranch, Download, AlertTriangle, ChevronRight, Check, List, FileJson2, Database, BarChartHorizontal, Plus, MoreVertical, Trash2, ChevronLeft, LogIn, LogOut, HelpCircle, ChevronDown,
    Wifi, Activity, Cpu, Box, ArrowRight, Layers, Globe, Zap,
} from 'lucide-react';
import ConexoesTab from './tabs/ConexoesTab';
import EventosTab from './tabs/EventosTab';
import { AnimatePresence, motion } from 'framer-motion';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';

// --- Types ---
interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string | null;
}

interface OutgoingWebhook {
  id: string;
  url: string;
  events: string[];
  createdAt: string;
}


// --- Reusable Components ---

const CodeBlock: React.FC<{ code: string; language?: string; onCopy?: () => void }> = ({ code, language = 'bash', onCopy }) => (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg relative group my-4">
        <pre className="p-4 overflow-x-auto text-sm scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
            <code className={`language-${language} text-blue-300`}>
                {code.trim()}
            </code>
        </pre>
        {onCopy && (
            <button 
                onClick={onCopy}
                className="absolute top-2 right-2 p-2 bg-zinc-700/50 text-zinc-400 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-700 hover:text-white"
                aria-label="Copiar cÃ³digo"
            >
                <Copy className="w-4 h-4" />
            </button>
        )}
    </div>
);

const InfoCard: React.FC<{ icon: React.ElementType, title: string, description: string }> = ({ icon: Icon, title, description }) => (
    <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700 flex items-start gap-4 h-full">
        <div className="bg-zinc-800 p-2 rounded-md">
            <Icon className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
        </div>
        <div>
            <h3 className="font-semibold text-white">{title}</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
        </div>
    </div>
);

const Section: React.FC<{ icon: React.ElementType, title: string, children: React.ReactNode, actions?: React.ReactNode }> = ({ icon: Icon, title, children, actions }) => (
    <div className="bg-zinc-800/50 rounded-lg border border-zinc-700">
        <div className="p-5 border-b border-zinc-700 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">{title}</h2>
            </div>
            {actions}
        </div>
        <div className="p-5">
            {children}
        </div>
    </div>
);

const SubTabs: React.FC<{ tabs: {name: string, icon?: React.ElementType}[], activeTab: string, onTabClick: (tab: string) => void }> = ({ tabs, activeTab, onTabClick }) => (
    <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-1 flex items-center gap-1 self-start">
        {tabs.map(tab => (
            <button
                key={tab.name}
                onClick={() => onTabClick(tab.name)}
                className={`flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-md transition-colors duration-200 ${activeTab === tab.name ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:bg-zinc-700/50 hover:text-white'}`}
            >
                {tab.icon && <tab.icon className="w-4 h-4" />}
                {tab.name}
            </button>
        ))}
    </div>
);


// --- API Keys Tab ---

const CreateApiKeyModal: React.FC<{ onClose: () => void, onCreate: (name: string) => void }> = ({ onClose, onCreate }) => {
    const [name, setName] = useState('');
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(name.trim()) {
            onCreate(name.trim());
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm" onClick={onClose}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="bg-zinc-800 rounded-lg shadow-xl w-full max-w-md border border-zinc-700" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <h2 className="text-xl font-bold text-white">Criar nova chave de API</h2>
                        <p className="text-sm text-zinc-400 mt-1">DÃª um nome para sua chave para identificÃ¡-la facilmente.</p>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: IntegraÃ§Ã£o App Externo" required
                            className="mt-4 w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    </div>
                    <div className="p-4 bg-zinc-900/30 border-t border-zinc-700 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-zinc-300 bg-zinc-700 rounded-md hover:bg-zinc-600">Cancelar</button>
                        <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-500 rounded-md hover:shadow-[0_0_18px_rgba(29,161,242,0.45)] hover:-translate-y-0.5 transition-all duration-200">Criar Chave</button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

const ShowNewApiKeyModal: React.FC<{ apiKey: ApiKey, onClose: () => void, onCopy: () => void }> = ({ apiKey, onClose, onCopy }) => {
    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm" onClick={onClose}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="bg-zinc-800 rounded-lg shadow-xl w-full max-w-lg border border-zinc-700" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <h2 className="text-xl font-bold text-white">Chave de API Criada</h2>
                    <p className="text-sm text-zinc-400 mt-1">Sua nova chave para "{apiKey.name}" foi gerada. Copie-a e guarde em um local seguro.</p>
                    <div className="p-3 my-4 bg-yellow-900/30 border border-yellow-700/50 rounded-lg text-sm text-yellow-300 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <span>Esta chave secreta <strong className="text-yellow-200">nÃ£o serÃ¡ exibida novamente</strong>.</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-zinc-900 border border-zinc-700 rounded-md font-mono text-blue-300">
                        <span className="flex-1 truncate">{apiKey.key}</span>
                        <button onClick={onCopy} className="p-2 text-zinc-300 hover:text-white hover:bg-zinc-700 rounded-md"><Copy className="w-4 h-4"/></button>
                    </div>
                </div>
                <div className="p-4 bg-zinc-900/30 border-t border-zinc-700 flex justify-end">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-500 rounded-md hover:shadow-[0_0_18px_rgba(29,161,242,0.45)] hover:-translate-y-0.5 transition-all duration-200">Entendi, fechar</button>
                </div>
            </motion.div>
        </div>
    );
};


const ApiKeysTab: React.FC<{ showNotification: (msg: string, type: 'success' | 'error' | 'info') => void }> = ({ showNotification }) => {
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [newlyCreatedKey, setNewlyCreatedKey] = useState<ApiKey | null>(null);
    const [keyToRevoke, setKeyToRevoke] = useState<ApiKey | null>(null);
    const [visibleKeyId, setVisibleKeyId] = useState<string | null>(null);

    const handleCopy = (text: string, subject: string) => {
        navigator.clipboard.writeText(text);
        showNotification(`${subject} copiado!`, 'success');
    };

    const handleCreateKey = (name: string) => {
        const newKey: ApiKey = {
            id: `key_${Date.now()}`,
            name,
            key: `sk_live_${Math.random().toString(36).substring(2, 22)}${Math.random().toString(36).substring(2, 22)}`,
            createdAt: new Date().toISOString(),
            lastUsed: null,
        };
        setApiKeys(prev => [...prev, newKey]);
        setNewlyCreatedKey(newKey);
        setCreateModalOpen(false);
    };

    const handleRevokeKey = () => {
        if (!keyToRevoke) return;
        setApiKeys(prev => prev.filter(k => k.id !== keyToRevoke.id));
        setKeyToRevoke(null);
        showNotification(`Chave "${keyToRevoke.name}" revogada com sucesso.`, 'success');
    };
    
    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Nunca';
        return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InfoCard icon={Lock} title="Bearer Authentication" description="Formato padrÃ£o da indÃºstria para autenticaÃ§Ã£o segura e stateless." />
                <InfoCard icon={ShieldCheck} title="SHA-256 Hash" description="Armazenamento seguro no banco de dados para proteger suas chaves." />
                <InfoCard icon={Gauge} title="Rate Limiting" description="100 requisiÃ§Ãµes/minuto para garantir a estabilidade da plataforma." />
            </div>
            <div className="p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-zinc-300">
                <strong className="text-white">AutenticaÃ§Ã£o Bearer:</strong> Use suas chaves no formato <code className="bg-zinc-900 px-1 py-0.5 rounded-md text-blue-300">Authorization: Bearer sk_live_...</code>
            </div>
             <div className="p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg text-sm text-yellow-300 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                    <strong className="text-yellow-200">Migrando de X-API-Key?</strong> O header <code className="bg-yellow-900/50 px-1 py-0.5 rounded-md">X-API-KEY</code> foi descontinuado. Use apenas <code className="bg-yellow-900/50 px-1 py-0.5 rounded-md">Authorization: Bearer</code> em todas as suas integraÃ§Ãµes.
                </div>
            </div>
            <Section icon={KeyRound} title="Gerenciar API Keys" actions={
                <button onClick={() => setCreateModalOpen(true)} className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-500 text-white px-4 py-2 rounded-md text-sm font-semibold hover:shadow-[0_0_18px_rgba(29,161,242,0.45)] hover:-translate-y-0.5 transition-all duration-200">
                    <Plus className="w-4 h-4" /> Nova Chave
                </button>
            }>
                <p className="text-sm text-zinc-400 mb-4">Gere e revogue chaves de autenticaÃ§Ã£o para suas integraÃ§Ãµes. As chaves funcionam em todos os endpoints (API REST, Webhooks, MCP).</p>

                {apiKeys.length === 0 ? (
                    <div className="text-center py-10">
                        <KeyRound className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                        <h3 className="font-semibold text-white">Nenhuma API Key gerada ainda</h3>
                        <p className="text-sm text-zinc-500 mt-1">Crie sua primeira chave para comeÃ§ar a integrar.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {apiKeys.map(apiKey => (
                             <div key={apiKey.id} className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-700 flex flex-col md:flex-row md:items-center gap-4">
                                <div className="flex-1">
                                    <p className="font-semibold text-white">{apiKey.name}</p>
                                    <div className="flex items-center gap-2 mt-1 font-mono text-sm text-zinc-400">
                                        {visibleKeyId === apiKey.id ? apiKey.key : `sk_live_...${apiKey.key.substring(apiKey.key.length - 4)}`}
                                        <button onClick={() => setVisibleKeyId(visibleKeyId === apiKey.id ? null : apiKey.id)} className="p-1 hover:text-white">
                                            {visibleKeyId === apiKey.id ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                                        </button>
                                        <button onClick={() => handleCopy(apiKey.key, 'Chave API')} className="p-1 hover:text-white">
                                            <Copy className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </div>
                                <div className="text-xs text-zinc-500 flex-1 md:text-center">
                                    <span className="font-semibold text-zinc-400">Criada em:</span> {formatDate(apiKey.createdAt)}
                                </div>
                                <div className="text-xs text-zinc-500 flex-1 md:text-center">
                                     <span className="font-semibold text-zinc-400">Ãšltimo uso:</span> {formatDate(apiKey.lastUsed)}
                                </div>
                                <div className="flex items-center gap-2">
                                     <button onClick={() => setKeyToRevoke(apiKey)} className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 px-3 py-1.5 rounded-md hover:bg-red-900/30 transition-colors">
                                        <Trash2 className="w-4 h-4"/> Revogar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Section>
            
            <AnimatePresence>
                {isCreateModalOpen && <CreateApiKeyModal onClose={() => setCreateModalOpen(false)} onCreate={handleCreateKey} />}
                {newlyCreatedKey && <ShowNewApiKeyModal apiKey={newlyCreatedKey} onClose={() => setNewlyCreatedKey(null)} onCopy={() => handleCopy(newlyCreatedKey.key, 'Nova chave API')} />}
                {keyToRevoke && (
                    <ConfirmDeleteModal
                        onClose={() => setKeyToRevoke(null)} onConfirm={handleRevokeKey}
                        title={`Revogar a chave "${keyToRevoke.name}"?`} message="Esta aÃ§Ã£o nÃ£o pode ser desfeita. Qualquer integraÃ§Ã£o usando esta chave irÃ¡ parar de funcionar."
                        confirmText="Sim, Revogar" confirmVariant="danger"
                    />
                )}
            </AnimatePresence>
        </div>
    );
};


// --- Webhooks Tab ---

const AccordionItem: React.FC<{
    title: string;
    icon: React.ElementType;
    isOpen: boolean;
    onClick: () => void;
    children: React.ReactNode;
}> = ({ title, icon: Icon, isOpen, onClick, children }) => {
    return (
        <div className="border-b border-zinc-700 last:border-b-0">
            <button
                onClick={onClick}
                className="w-full flex justify-between items-center p-4 text-left hover:bg-zinc-800 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-blue-400" />
                    <span className="font-semibold text-white">{title}</span>
                </div>
                <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="p-5 pt-0 prose prose-sm prose-invert text-zinc-300 max-w-none">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const WebhooksTab: React.FC<{ showNotification: (msg: string, type: 'success' | 'error' | 'info') => void }> = ({ showNotification }) => {
    const [activeSubTab, setActiveSubTab] = useState('Entrada');
    const [openAccordion, setOpenAccordion] = useState<string | null>(null);
    const webhookUrl = 'https://lxcjwmvclbfqizwtxpxy.supabase.co/functions/v1/webhook-receiver';
    
    // State for Outgoing Webhooks
    const [outgoingWebhooks, setOutgoingWebhooks] = useState<OutgoingWebhook[]>([]);
    const [newWebhookUrl, setNewWebhookUrl] = useState('https://seu-servidor.com/webhook');
    
    const availableEvents = {
        'lead.created': 'Lead Criado',
        'lead.updated': 'Lead Atualizado',
        'lead.stage_changed': 'Lead Mudou de EstÃ¡gio',
        'lead.converted': 'Lead Convertido em Cliente',
        'contact.created': 'Cliente Criado',
        'activity.completed': 'Atividade ConcluÃ­da',
    };
    
    const [selectedEvents, setSelectedEvents] = useState<Record<string, boolean>>(
        Object.keys(availableEvents).reduce((acc, key) => ({ ...acc, [key]: false }), {})
    );
    
    const [webhookToRevoke, setWebhookToRevoke] = useState<OutgoingWebhook | null>(null);

    const handleCopy = (text: string, subject: string) => {
        navigator.clipboard.writeText(text);
        showNotification(`${subject} copiada!`, 'success');
    };

    const handleEventToggle = (eventKey: string) => {
        setSelectedEvents(prev => ({...prev, [eventKey]: !prev[eventKey]}));
    };
    
    const handleAddWebhook = (e: React.FormEvent) => {
        e.preventDefault();
        const activeEvents = Object.keys(selectedEvents).filter(key => selectedEvents[key]);

        if (!newWebhookUrl.trim()) {
            showNotification('Por favor, insira uma URL vÃ¡lida.', 'error');
            return;
        }
        try {
            new URL(newWebhookUrl);
        } catch (_) {
            showNotification('A URL fornecida Ã© invÃ¡lida.', 'error');
            return;
        }
        if (activeEvents.length === 0) {
            showNotification('Selecione pelo menos um evento.', 'error');
            return;
        }

        const newWebhook: OutgoingWebhook = {
            id: `wh_${Date.now()}`,
            url: newWebhookUrl,
            events: activeEvents,
            createdAt: new Date().toISOString(),
        };

        setOutgoingWebhooks(prev => [...prev, newWebhook]);
        setNewWebhookUrl('https://seu-servidor.com/webhook');
        setSelectedEvents(Object.keys(selectedEvents).reduce((acc, key) => ({...acc, [key]: false}), {}));
        showNotification('Webhook adicionado com sucesso!', 'success');
    };
    
    const handleRevokeWebhook = () => {
        if (!webhookToRevoke) return;
        setOutgoingWebhooks(prev => prev.filter(wh => wh.id !== webhookToRevoke.id));
        setWebhookToRevoke(null);
        showNotification(`Webhook revogado com sucesso.`, 'success');
    };

    const curlExample = `curl -X POST https://.../v1/webhook-receiver \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk_live_SUA_CHAVE" \\
  -d '{
    "event": "lead.created",
    "data": {
      "title": "Novo lead",
      "value": 5000,
      "stage": 1
    }
  }'`;

    const subTabs = [
        { name: 'Entrada', icon: LogIn },
        { name: 'SaÃ­da', icon: LogOut },
        { name: 'DocumentaÃ§Ã£o', icon: BookOpen }
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InfoCard icon={GitBranch} title="Bidirecional" description="Receba e envie dados automaticamente para manter seus sistemas sincronizados." />
                <InfoCard icon={Lock} title="Bearer Auth" description="Entrada usa Bearer e HMAC na saÃ­da para garantir a seguranÃ§a e autenticidade dos dados." />
                <InfoCard icon={List} title="8 Eventos" description="NotificaÃ§Ãµes para lead.*, contact.*, activity.* para cobrir todo o ciclo de vida do cliente." />
            </div>
             <div className="p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-zinc-300">
                <strong className="text-white">AutenticaÃ§Ã£o Bearer:</strong> Webhooks de entrada usam <code className="bg-zinc-900 px-1 py-0.5 rounded-md text-blue-300">Authorization: Bearer sk_live_...</code>
            </div>
            
            <SubTabs tabs={subTabs} activeTab={activeSubTab} onTabClick={setActiveSubTab} />

            {activeSubTab === 'Entrada' && (
                <Section icon={ChevronRight} title="Webhook Receiver (Entrada)">
                    <p className="text-zinc-400 text-sm mb-6">Receba dados de sistemas externos via HTTP POST.</p>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">URL do Webhook</label>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-300 font-mono truncate">{webhookUrl}</div>
                                <button onClick={() => handleCopy(webhookUrl, 'URL')} className="p-2.5 bg-zinc-700 text-white rounded-md hover:bg-zinc-600"><Copy className="w-4 h-4" /></button>
                            </div>
                            <p className="text-xs text-zinc-500 mt-2">Use esta URL para enviar dados. Inclua sua API Key no header Authorization.</p>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-zinc-300 mb-2">Eventos Suportados:</h4>
                            <ul className="list-disc list-inside text-sm text-zinc-400 space-y-1">
                                <li><code className="text-blue-300">lead.created</code> - Criar novo lead</li>
                                <li><code className="text-blue-300">contact.created</code> - Criar novo cliente</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-zinc-300 mb-2 mt-4">Exemplo de uso:</h4>
                            <CodeBlock code={curlExample} onCopy={() => handleCopy(curlExample, "Exemplo cURL")} />
                        </div>
                    </div>
                </Section>
            )}
             {activeSubTab === 'SaÃ­da' && (
                <div className="space-y-6">
                    <Section icon={ChevronLeft} title="Webhooks de SaÃ­da">
                        <p className="text-zinc-400 text-sm mb-6">Configure URLs para receber notificaÃ§Ãµes quando eventos ocorrerem no CRM.</p>
                        <form onSubmit={handleAddWebhook} className="space-y-4 p-4 bg-zinc-900/50 rounded-lg border border-zinc-700/50">
                            <h3 className="font-semibold text-white">Adicionar Webhook</h3>
                            <div>
                                <label htmlFor="webhookUrl" className="block text-sm font-medium text-zinc-300 mb-2">URL do Webhook</label>
                                <input 
                                    type="url" 
                                    id="webhookUrl"
                                    value={newWebhookUrl}
                                    onChange={e => setNewWebhookUrl(e.target.value)}
                                    placeholder="https://seu-servidor.com/webhook"
                                    className="w-full bg-zinc-800 border border-zinc-600 rounded-md px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-2">Eventos para Notificar</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                                    {Object.entries(availableEvents).map(([key, label]) => (
                                        <label key={key} className="flex items-center gap-2 cursor-pointer p-1 rounded-md hover:bg-zinc-800">
                                            <input 
                                                type="checkbox"
                                                checked={selectedEvents[key]}
                                                onChange={() => handleEventToggle(key)}
                                                className="h-4 w-4 rounded bg-zinc-700 border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-900/50"
                                            />
                                            <span className="text-sm text-zinc-300">{label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                             <button type="submit" className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-500 text-white px-4 py-2 rounded-md text-sm font-semibold hover:shadow-[0_0_18px_rgba(29,161,242,0.45)] hover:-translate-y-0.5 transition-all duration-200">
                                <Plus className="w-4 h-4" /> Adicionar Webhook
                            </button>
                        </form>
                    </Section>

                    <Section icon={Settings} title="Webhooks Configurados">
                        {outgoingWebhooks.length === 0 ? (
                             <div className="text-center py-10">
                                <WebhookIcon className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                                <h3 className="font-semibold text-white">Nenhum webhook configurado ainda</h3>
                                <p className="text-sm text-zinc-500 mt-1">Adicione um webhook para comeÃ§ar a receber eventos.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {outgoingWebhooks.map(wh => (
                                    <div key={wh.id} className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-700 flex flex-col md:flex-row md:items-center gap-4">
                                        <div className="flex-1">
                                            <p className="font-semibold text-white truncate font-mono text-sm">{wh.url}</p>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {wh.events.map(event => (
                                                    <span key={event} className="px-2 py-0.5 text-xs font-medium rounded-full bg-zinc-700 text-zinc-300">{availableEvents[event as keyof typeof availableEvents] || event}</span>
                                                ))}
                                            </div>
                                        </div>
                                         <button onClick={() => setWebhookToRevoke(wh)} className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 px-3 py-1.5 rounded-md hover:bg-red-900/30 transition-colors self-start md:self-center">
                                            <Trash2 className="w-4 h-4"/> Revogar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Section>
                    
                     <AnimatePresence>
                        {webhookToRevoke && (
                            <ConfirmDeleteModal
                                onClose={() => setWebhookToRevoke(null)} onConfirm={handleRevokeWebhook}
                                title={`Revogar o webhook?`} message={<>Esta aÃ§Ã£o nÃ£o pode ser desfeita. Sua aplicaÃ§Ã£o em <strong className="font-mono text-white">{new URL(webhookToRevoke.url).hostname}</strong> irÃ¡ parar de receber eventos neste endpoint.</>}
                                confirmText="Sim, Revogar" confirmVariant="danger"
                            />
                        )}
                    </AnimatePresence>
                </div>
            )}
             {activeSubTab === 'DocumentaÃ§Ã£o' && (
                <div className="bg-zinc-800/50 rounded-lg border border-zinc-700">
                     <AccordionItem title="API Keys - AutenticaÃ§Ã£o" icon={KeyRound} isOpen={openAccordion === 'auth'} onClick={() => setOpenAccordion(openAccordion === 'auth' ? null : 'auth')}>
                        <p>Todos os webhooks, tanto de entrada quanto de saÃ­da, sÃ£o protegidos usando API Keys. VocÃª deve incluir sua chave no cabeÃ§alho de autorizaÃ§Ã£o para autenticar suas requisiÃ§Ãµes.</p>
                        <p>VÃ¡ para a aba "API Keys" para gerar e gerenciar suas chaves.</p>
                        <CodeBlock language="http" code={`Authorization: Bearer sk_live_...`} />
                    </AccordionItem>
                    <AccordionItem title="Webhooks de Entrada (Receber Dados)" icon={LogIn} isOpen={openAccordion === 'incoming'} onClick={() => setOpenAccordion(openAccordion === 'incoming' ? null : 'incoming')}>
                        <p>Envie dados para o seu CRM a partir de sistemas externos fazendo uma requisiÃ§Ã£o POST para a URL do Webhook Receiver.</p>
                        <p>O corpo da requisiÃ§Ã£o deve ser um JSON contendo a propriedade "event" e "data".</p>
                        <h4>Eventos Suportados</h4>
                        <ul>
                            <li><code>lead.created</code>: Cria um novo lead no sistema.</li>
                            <li><code>contact.created</code>: Cria um novo contato/cliente.</li>
                        </ul>
                        <h4>Exemplo de Payload</h4>
                        <CodeBlock language="json" code={`{\n  "event": "lead.created",\n  "data": {\n    "name": "Novo Lead via Webhook",\n    "company": "Empresa Exemplo",\n    "email": "contato@exemplo.com",\n    "value": 2500.00,\n    "source": "Webhook Externo"\n  }\n}`} />
                    </AccordionItem>
                    <AccordionItem title="Webhooks de SaÃ­da (Enviar NotificaÃ§Ãµes)" icon={LogOut} isOpen={openAccordion === 'outgoing'} onClick={() => setOpenAccordion(openAccordion === 'outgoing' ? null : 'outgoing')}>
                        <p>Receba notificaÃ§Ãµes em tempo real em seus prÃ³prios sistemas quando eventos importantes ocorrerem no CRM. Configure os endpoints na aba "SaÃ­da".</p>
                        <p>Seu endpoint receberÃ¡ uma requisiÃ§Ã£o POST com um payload JSON contendo o evento e os dados associados.</p>
                        <h4>Exemplo de Payload (lead.updated)</h4>
                        <CodeBlock language="json" code={`{\n  "event": "lead.updated",\n  "timestamp": "2024-01-01T12:00:00Z",\n  "data": {\n    "id": "lead-123",\n    "name": "Lead Atualizado",\n    "value": 7500.00,\n    "columnId": "proposal"\n    /* ...outros campos do lead */\n  }\n}`} />
                        <h4>VerificaÃ§Ã£o de Assinatura (HMAC)</h4>
                        <p>Para garantir que a requisiÃ§Ã£o veio do nosso sistema, cada webhook de saÃ­da inclui um cabeÃ§alho <code>X-Signature-256</code>. Ele Ã© um hash HMAC-SHA256 do corpo da requisiÃ§Ã£o, usando sua chave secreta da API. Compare o hash que vocÃª gera com o que estÃ¡ no header para validar a requisiÃ§Ã£o.</p>
                    </AccordionItem>
                    <AccordionItem title="Boas PrÃ¡ticas de SeguranÃ§a" icon={ShieldCheck} isOpen={openAccordion === 'security'} onClick={() => setOpenAccordion(openAccordion === 'security' ? null : 'security')}>
                        <ul>
                            <li><strong>Use HTTPS:</strong> Sempre configure seus endpoints de webhook com URLs HTTPS para garantir que os dados sejam criptografados em trÃ¢nsito.</li>
                            <li><strong>Valide as Assinaturas:</strong> Para webhooks de saÃ­da, sempre valide a assinatura HMAC para prevenir ataques de falsificaÃ§Ã£o de requisiÃ§Ã£o (request forgery).</li>
                            <li><strong>Proteja suas Chaves:</strong> Nunca exponha suas chaves de API no lado do cliente (frontend). Mantenha-as seguras no seu backend.</li>
                            <li><strong>Responda Rapidamente:</strong> Seu endpoint deve responder com um status <code>200 OK</code> o mais rÃ¡pido possÃ­vel. Processamentos longos devem ser feitos de forma assÃ­ncrona para evitar timeouts.</li>
                        </ul>
                    </AccordionItem>
                    <AccordionItem title="SoluÃ§Ã£o de Problemas" icon={HelpCircle} isOpen={openAccordion === 'troubleshooting'} onClick={() => setOpenAccordion(openAccordion === 'troubleshooting' ? null : 'troubleshooting')}>
                        <h4>Meu webhook nÃ£o estÃ¡ funcionando. O que verificar?</h4>
                        <ul>
                            <li><strong>Logs do Servidor:</strong> Verifique os logs do seu servidor de recebimento para ver se a requisiÃ§Ã£o estÃ¡ chegando e se hÃ¡ erros.</li>
                            <li><strong>Firewall:</strong> Certifique-se de que seu firewall nÃ£o estÃ¡ bloqueando requisiÃ§Ãµes POST dos nossos endereÃ§os IP.</li>
                            <li><strong>Status de Resposta:</strong> Seu endpoint deve retornar um status na faixa 2xx. Qualquer outro status (3xx, 4xx, 5xx) serÃ¡ considerado uma falha na entrega.</li>
                            <li><strong>AutenticaÃ§Ã£o:</strong> Para webhooks de entrada, verifique se o cabeÃ§alho <code>Authorization: Bearer sk_live_...</code> estÃ¡ correto.</li>
                            <li><strong>ValidaÃ§Ã£o de Assinatura:</strong> Para webhooks de saÃ­da, confira se seu algoritmo de validaÃ§Ã£o HMAC estÃ¡ correto.</li>
                        </ul>
                    </AccordionItem>
                </div>
            )}
        </div>
    );
};


// --- API REST Tab ---
// FIX: Added showNotification to props to allow for feedback on copy actions.
interface ApiRestTabProps {
    showNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const ApiRestTab: React.FC<ApiRestTabProps> = ({ showNotification }) => {
    const [activeSubTab, setActiveSubTab] = useState('VisÃ£o Geral');

    // FIX: Defined handleCopy function to be used by CodeBlock components.
    const handleCopy = (text: string, subject: string) => {
        navigator.clipboard.writeText(text);
        showNotification(`${subject} copiado!`, 'success');
    };

    const baseUrl = 'https://lxcjwmvclbfqizwtxpxy.supabase.co/functions/v1/api-v1';
    const quickStartCurl = `curl -X GET "https://.../leads?page=1&limit=20" \\\n -H "Authorization: Bearer YOUR_API_KEY"`;
    const quickStartResponse = `{\n  "data": [\n    {\n      "id": "uid",\n      "title": "lead Empresa X",\n      "value": 15000,\n      "stage": "uid",\n      "status": "active",\n      "created_at": "2024-01-15T10:30:00Z"\n    }\n  ],\n  "pagination": {\n    "page": 1,\n    "limit": 20,\n    "total": 150,\n    "totalPages": 8\n  }\n}`;

    const exampleCurl = `curl -X GET "https://.../api-v1/leads" \\\n -H "Authorization: Bearer sk_live_SUA_CHAVE"`;
    const exampleJs = `fetch('https://.../api-v1/leads', {\n  headers: {\n    'Authorization': 'Bearer sk_live_SUA_CHAVE'\n  }\n})`;
    const examplePy = `import requests\n\nresponse = requests.get(\n    'https://.../api-v1/leads',\n    headers={'Authorization': 'Bearer sk_live_SUA_CHAVE'}\n)`;

    const endpointsData = {
        Leads: { count: 7, endpoints: [{m:'GET',p:'/leads', d:'Listar leads com paginaÃ§Ã£o e filtros'}, {m:'GET',p:'/leads/{id}', d:'Obter detalhes de um lead'}, {m:'POST',p:'/leads', d: 'Criar novo lead'}, {m:'PUT',p:'/leads/{id}', d:'Atualizar lead'}, {m:'PATCH',p:'/leads/{id}/stage', d: 'Mover lead de estÃ¡gio'}, {m:'PATCH',p:'/leads/{id}/convert', d:'Converter lead em cliente'}, {m:'DELETE',p:'/leads/{id}', d:'Deletar lead'}] },
        Contacts: { count: 5, endpoints: [{m:'GET',p:'/contacts', d:'Listar clientes'}, {m:'GET',p:'/contacts/{id}',d:'Obter detalhes de um cliente'}, {m:'POST',p:'/contacts', d:'Criar novo cliente'}, {m:'PUT',p:'/contacts/{id}', d:'Atualizar cliente'}, {m:'DELETE',p:'/contacts/{id}', d:'Deletar cliente'}] },
        Activities: { count: 6, endpoints: [{m:'GET',p:'/activities', d:'Listar atividades'}, {m:'GET',p:'/activities/{id}', d:'Obter detalhes de uma atividade'}, {m:'POST',p:'/activities', d:'Criar nova atividade'}, {m:'PUT',p:'/activities/{id}', d:'Atualizar atividade'}, {m:'PATCH',p:'/activities/{id}/complete', d:'Marcar como concluÃ­da'}, {m:'DELETE',p:'/activities/{id}', d:'Deletar atividade'}] },
        Pipeline: { count: 5, endpoints: [{m:'GET',p:'/pipeline/stages', d:'Listar estÃ¡gios'}, {m:'POST',p:'/pipeline/stages', d:'Criar novo estÃ¡gio'}, {m:'PUT',p:'/pipeline/stages/{id}', d:'Atualizar estÃ¡gio'}, {m:'DELETE',p:'/pipeline/stages/{id}', d:'Deletar estÃ¡gio'}, {m:'PUT',p:'/pipeline/stages/reorder', d:'Reordenar estÃ¡gios'}] },
        Metrics: { count: 1, endpoints: [{m:'GET',p:'/metrics/dashboard', d:'Obter mÃ©tricas do dashboard'}] },
    };
    
    const getMethodClass = (method: string) => ({
        'GET': 'bg-blue-900/50 text-blue-400', 'POST': 'bg-blue-900/50 text-blue-400', 'PUT': 'bg-orange-900/50 text-orange-400', 
        'PATCH': 'bg-yellow-900/50 text-yellow-400', 'DELETE': 'bg-red-900/50 text-red-400'
    }[method] || 'bg-zinc-700 text-zinc-400');

    return (
        <div className="space-y-6">
            <Section icon={FileCode} title="API REST v1 - OpenAPI 3.1.0" actions={
                <button className="flex items-center gap-2 bg-zinc-700 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-zinc-600 transition-colors">
                    <Download className="w-4 h-4" /> Download Spec
                </button>
            }>
                <div className="space-y-4">
                    <p className="text-zinc-300">API RESTful completa para integraÃ§Ã£o com seu CRM. AutenticaÃ§Ã£o via JWT ou API Key com rate limiting inteligente.</p>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InfoCard icon={List} title="26 Endpoints" description="CRUD completo para todos os recursos." />
                        <InfoCard icon={Gauge} title="Rate Limiting" description="JWT: 300/min â€¢ API Key: 100/min" />
                        <InfoCard icon={WebhookIcon} title="8 Webhooks" description="NotificaÃ§Ãµes em tempo real." />
                    </div>
                     <div className="p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg text-sm text-yellow-300 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <strong className="text-yellow-200">Sobre ValidaÃ§Ã£o OpenAPI 3.1:</strong> Esta especificaÃ§Ã£o segue OpenAPI 3.1.0. O Swagger Editor 3.x pode mostrar erros estruturais falsos. Para validaÃ§Ã£o completa, use: Swagger Editor 5.x+, Redocly CLI, Stoplight Studio, ou Postman v10+.
                        </div>
                    </div>
                </div>
            </Section>

            <SubTabs tabs={[{name:'VisÃ£o Geral'}, {name:'AutenticaÃ§Ã£o'}, {name:'Endpoints'}, {name:'Exemplos'}]} activeTab={activeSubTab} onTabClick={setActiveSubTab} />

            {activeSubTab === 'VisÃ£o Geral' && (
                <div className="space-y-6">
                    <Section icon={ChevronRight} title="Quick Start">
                        <div className="prose prose-sm prose-invert text-zinc-300 max-w-none">
                            <h4>1. Base URL</h4>
                            <CodeBlock language='text' code={baseUrl} onCopy={() => handleCopy(baseUrl, 'URL Base')}/>
                            <h4>2. Obtenha sua API Key</h4>
                            <p>VÃ¡ para a aba "API Keys" e gere uma nova API Key. Ela serÃ¡ usada para autenticar suas requisiÃ§Ãµes.</p>
                            <h4>3. FaÃ§a sua primeira requisiÃ§Ã£o</h4>
                            <CodeBlock language='bash' code={quickStartCurl} onCopy={() => handleCopy(quickStartCurl, "Exemplo cURL")}/>
                            <h4>4. Resposta esperada</h4>
                            <CodeBlock language="json" code={quickStartResponse} onCopy={() => handleCopy(quickStartResponse, "Exemplo de resposta")}/>
                        </div>
                    </Section>
                </div>
            )}
            {activeSubTab === 'AutenticaÃ§Ã£o' && (
                <div className="space-y-6">
                    <Section icon={Lock} title="MÃ©todos de AutenticaÃ§Ã£o">
                         <div className="p-3 bg-zinc-900/50 rounded-md border border-zinc-700 text-white font-medium">Recomendado: Bearer Token (JWT ou API Key)</div>
                         <div className="p-3 mt-2 bg-zinc-900/50 rounded-md border border-zinc-700 text-zinc-400">Query Parameter (nÃ£o recomendado)</div>
                    </Section>
                    <Section icon={Gauge} title="Rate Limiting Headers">
                        <p className="text-zinc-400 text-sm mb-4">Todas as respostas incluem headers informativos sobre o rate limiting:</p>
                        <div className="font-mono text-sm text-zinc-300 space-y-2">
                            <div className="flex justify-between items-center"><span className="text-blue-300">X-RateLimit-Limit</span><span className="text-zinc-500">Limite total de requisiÃ§Ãµes</span></div>
                            <div className="flex justify-between items-center"><span className="text-blue-300">X-RateLimit-Remaining</span><span className="text-zinc-500">RequisiÃ§Ãµes restantes</span></div>
                            <div className="flex justify-between items-center"><span className="text-blue-300">X-RateLimit-Reset</span><span className="text-zinc-500">Timestamp do reset</span></div>
                        </div>
                    </Section>
                </div>
            )}
             {activeSubTab === 'Endpoints' && (
                 <div className="space-y-6">
                    {Object.entries(endpointsData).map(([resource, data]) => (
                        <Section key={resource} icon={Database} title={resource} actions={<span className="text-xs font-semibold bg-zinc-700 text-zinc-300 px-2 py-1 rounded-md">{data.count} endpoints</span>}>
                            <div className="space-y-2">
                                {data.endpoints.map(ep => (
                                    <div key={ep.p} className="flex items-center gap-4 p-3 bg-zinc-900/50 rounded-md border border-zinc-800">
                                        <span className={`w-16 text-center font-bold text-sm px-2 py-1 rounded-md ${getMethodClass(ep.m)}`}>{ep.m}</span>
                                        <span className="font-mono text-zinc-300 flex-1">{ep.p}</span>
                                        <span className="text-sm text-zinc-500 hidden md:block">{ep.d}</span>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    ))}
                 </div>
             )}
             {activeSubTab === 'Exemplos' && (
                <Section icon={FileJson2} title="Exemplos de CÃ³digo">
                    <h4 className="font-semibold text-white mb-2">Exemplo com cURL:</h4>
                    <CodeBlock code={exampleCurl} onCopy={() => handleCopy(exampleCurl, "Exemplo cURL")} />
                    <h4 className="font-semibold text-white mb-2 mt-6">Exemplo com JavaScript/Node.js:</h4>
                    <CodeBlock language="javascript" code={exampleJs} onCopy={() => handleCopy(exampleJs, "Exemplo JavaScript")} />
                    <h4 className="font-semibold text-white mb-2 mt-6">Exemplo com Python:</h4>
                    <CodeBlock language="python" code={examplePy} onCopy={() => handleCopy(examplePy, "Exemplo Python")} />
                </Section>
             )}
        </div>
    );
};


// --- MCP Tab ---

const McpTab: React.FC = () => {
    const services = [
        { name: 'Evolution API', type: 'WhatsApp Gateway', envKey: 'EVOLUTION_API_URL', status: 'active', icon: MessageCircle ?? Cpu },
        { name: 'n8n Webhooks', type: 'Automation Engine', envKey: 'N8N_OUTBOUND_WEBHOOK_URL', status: 'active', icon: GitBranch },
        { name: 'Supabase', type: 'Database & Realtime', envKey: 'VITE_SUPABASE_URL', status: 'active', icon: Database },
        { name: 'OpenAI', type: 'LLM Provider', envKey: 'OPENAI_API_KEY', status: 'configured', icon: Cpu },
    ];

    const tools = [
        { name: 'get_lead_info', desc: 'Retorna dados completos de um lead por ID ou telefone', ready: true },
        { name: 'update_lead_stage', desc: 'Move lead para outra etapa do pipeline', ready: true },
        { name: 'create_task', desc: 'Cria tarefa associada a um lead', ready: true },
        { name: 'send_message', desc: 'Envia mensagem via canal conectado', ready: true },
        { name: 'get_pipeline_summary', desc: 'Retorna resumo do pipeline para o agente de IA', ready: false },
        { name: 'schedule_followup', desc: 'Agenda follow-up automÃ¡tico', ready: false },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-start gap-4 p-5 rounded-2xl bg-gradient-to-br from-blue-500/8 to-blue-500/5 border border-blue-500/15">
                <div className="p-3 rounded-xl bg-blue-500/15 border border-blue-500/20">
                    <Layers className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                    <h3 className="text-base font-bold text-white mb-1">Model Context Protocol (MCP)</h3>
                    <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
                        O MCP padroniza como agentes de IA interagem com o NextSales. Em vez de chamadas ad-hoc,
                        cada ferramenta Ã© um contrato tipado â€” o agente sabe exatamente o que pode fazer, com quais
                        parÃ¢metros e quais garantias de isolamento por <code className="text-blue-400">company_id</code>.
                    </p>
                </div>
            </div>

            {/* Service Registry */}
            <div>
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Globe className="w-4 h-4" /> ServiÃ§os Registrados
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {services.map(({ name, type, envKey, status, icon: Icon }) => (
                        <div key={name} className="flex items-center gap-3 p-4 rounded-xl bg-[#0B1220] border border-white/6">
                            <div className="p-2 rounded-lg bg-white/5">
                                <Icon className="w-4 h-4 text-slate-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-white">{name}</span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${status === 'active' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>
                                        {status}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-500">{type}</div>
                                <div className="text-[10px] font-mono text-slate-600 mt-0.5">{envKey}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tool Registry */}
            <div>
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Ferramentas MCP disponÃ­veis
                </h4>
                <div className="space-y-2">
                    {tools.map(({ name, desc, ready }) => (
                        <div key={name} className="flex items-center gap-3 p-3 rounded-xl bg-[#0B1220] border border-white/5">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${ready ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                            <code className="text-xs text-blue-400 font-mono w-48 shrink-0">{name}</code>
                            <span className="text-xs text-slate-400 flex-1">{desc}</span>
                            <span className={`text-[10px] font-bold ${ready ? 'text-emerald-400' : 'text-slate-600'}`}>
                                {ready ? 'pronto' : 'em breve'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Webhook Routing */}
            <div>
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" /> Roteamento de Webhooks
                </h4>
                <div className="p-4 rounded-xl bg-[#0B1220] border border-white/5">
                    <div className="flex items-center gap-3 flex-wrap text-xs">
                        {[
                            { label: 'Evolution API', color: 'text-emerald-400 bg-emerald-500/10' },
                            { label: 'â†’', color: 'text-slate-600' },
                            { label: 'n8n WF-01', color: 'text-blue-400 bg-blue-500/10' },
                            { label: 'â†’', color: 'text-slate-600' },
                            { label: 'resolve_or_create_lead()', color: 'text-blue-400 bg-blue-500/10' },
                            { label: 'â†’', color: 'text-slate-600' },
                            { label: 'resolve_or_create_conversation()', color: 'text-blue-400 bg-blue-500/10' },
                            { label: 'â†’', color: 'text-slate-600' },
                            { label: 'WF-05 AI Agent', color: 'text-amber-400 bg-amber-500/10' },
                        ].map(({ label, color }, i) => (
                            label === 'â†’'
                                ? <span key={i} className="text-slate-600 font-bold">{label}</span>
                                : <span key={i} className={`px-2 py-0.5 rounded-md font-mono font-medium ${color}`}>{label}</span>
                        ))}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-3">
                        O <code className="text-slate-500">company_id</code> Ã© propagado em cada etapa via tenant guard nas RPCs (SECURITY DEFINER).
                        Nenhum payload de uma empresa pode ser processado no contexto de outra.
                    </p>
                </div>
            </div>
        </div>
    );
};

// Avoid import error for MessageCircle used inside McpTab
const MessageCircle = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
);


// --- Main Component ---

interface IntegrationsPageProps {
    showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

const IntegrationsPage: React.FC<IntegrationsPageProps> = ({ showNotification }) => {
    const [activeTab, setActiveTab] = useState('API Keys');

    const mainTabs = [
        { name: 'ConexÃµes', icon: Wifi },
        { name: 'Eventos', icon: Activity },
        { name: 'API Keys', icon: KeyRound },
        { name: 'Webhooks', icon: WebhookIcon },
        { name: 'API REST', icon: FileCode },
        { name: 'MCP Server', icon: Server },
    ];

    return (
        <div className="flex flex-col gap-6 h-full">
            <div>
                <h1 className="text-2xl font-bold text-white">IntegraÃ§Ãµes</h1>
                <p className="text-zinc-400">Conecte seu CRM com outras ferramentas e APIs.</p>
            </div>

            <div>
                <div className="border-b border-zinc-700">
                    <nav className="flex -mb-px space-x-6" aria-label="Tabs">
                        {mainTabs.map(tab => (
                            <button
                                key={tab.name}
                                onClick={() => setActiveTab(tab.name)}
                                className={`whitespace-nowrap flex items-center gap-2 py-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.name ? 'border-blue-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.name}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 -mr-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
                 {activeTab === 'ConexÃµes'  && <ConexoesTab showNotification={showNotification} />}
                 {activeTab === 'Eventos'   && <EventosTab  showNotification={showNotification} />}
                 {activeTab === 'API Keys'  && <ApiKeysTab  showNotification={showNotification} />}
                 {activeTab === 'Webhooks'  && <WebhooksTab showNotification={showNotification} />}
                 {activeTab === 'API REST'  && <ApiRestTab  showNotification={showNotification} />}
                 {activeTab === 'MCP Server' && <McpTab />}
            </div>
        </div>
    );
};

export default IntegrationsPage;
