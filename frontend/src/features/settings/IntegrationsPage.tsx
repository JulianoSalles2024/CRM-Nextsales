import React, { useState, useEffect, useRef } from 'react';
import { ui } from '@/src/lib/uiStyles';
import {
    ToyBrick, KeyRound, Webhook as WebhookIcon, FileCode, Server, Copy, BookOpen, Settings, Eye, EyeOff, RefreshCw,
    Lock, ShieldCheck, Gauge, GitBranch, Download, AlertTriangle, ChevronRight, Check, List, FileJson2, Database, BarChartHorizontal, Plus, MoreVertical, Trash2, ChevronLeft, LogIn, LogOut, HelpCircle, ChevronDown,
    Wifi, Activity, Cpu, Box, ArrowRight, Layers, Globe, Zap, Loader2, ToggleLeft, ToggleRight,
} from 'lucide-react';
import ConexoesTab from './tabs/ConexoesTab';
import EventosTab from './tabs/EventosTab';
import { AnimatePresence, motion } from 'framer-motion';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import { useAuth } from '@/src/features/auth/AuthContext';
import { useApiKeys, ApiKey } from './hooks/useApiKeys';
import { useOutgoingWebhooks, OutgoingWebhook } from './hooks/useOutgoingWebhooks';
import WhatsAppConnectModal from '@/src/features/onboarding/WhatsAppConnectModal';


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
                aria-label="Copiar código"
            >
                <Copy className="w-4 h-4" />
            </button>
        )}
    </div>
);

const InfoCard: React.FC<{ icon: React.ElementType, title: string, description: string }> = ({ icon: Icon, title, description }) => (
    <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-800 flex items-start gap-3 h-full">
        <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/50">
            <Icon className="w-5 h-5 text-sky-400 mt-0.5 flex-shrink-0" />
        </div>
        <div>
            <h3 className="font-semibold text-white text-sm">{title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{description}</p>
        </div>
    </div>
);

const Section: React.FC<{ icon: React.ElementType, title: string, children: React.ReactNode, actions?: React.ReactNode }> = ({ icon: Icon, title, children, actions }) => (
    <div className="bg-slate-800/20 rounded-xl border border-slate-800">
        <div className="px-4 py-3 border-b border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-sky-400" />
                </div>
                <h2 className="text-base font-semibold text-white">{title}</h2>
            </div>
            {actions}
        </div>
        <div className="p-4">
            {children}
        </div>
    </div>
);

const SubTabs: React.FC<{ tabs: {name: string, icon?: React.ElementType}[], activeTab: string, onTabClick: (tab: string) => void }> = ({ tabs, activeTab, onTabClick }) => {
    const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });

    useEffect(() => {
        const idx = tabs.findIndex(t => t.name === activeTab);
        const el = btnRefs.current[idx];
        if (el) setPillStyle({ left: el.offsetLeft, width: el.offsetWidth });
    }, [activeTab, tabs]);

    return (
        <div className="relative bg-slate-900/60 border border-blue-500/10 rounded-xl p-1 flex w-fit self-start">
            <div
                className="absolute top-1 bottom-1 bg-blue-500/10 border border-blue-500/20 rounded-lg transition-all duration-300 pointer-events-none"
                style={{ left: pillStyle.left, width: pillStyle.width }}
            />
            {tabs.map((tab, idx) => (
                <button
                    key={tab.name}
                    ref={el => { btnRefs.current[idx] = el; }}
                    onClick={() => onTabClick(tab.name)}
                    className={`relative z-10 flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${activeTab === tab.name ? 'text-blue-400' : 'text-slate-500 hover:text-white'}`}
                >
                    {tab.icon && <tab.icon className="w-4 h-4" />}
                    {tab.name}
                </button>
            ))}
        </div>
    );
};


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
                className={`${ui.modalContainer} w-full max-w-md`} onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-slate-800">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                                <KeyRound className="w-4 h-4 text-sky-400" />
                            </div>
                            <h2 className="text-lg font-bold text-white">Nova chave de API</h2>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Dê um nome para identificar esta chave facilmente.</p>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Integração App Externo" required
                            className={`mt-4 ${ui.input}`} />
                    </div>
                    <div className="px-6 py-4 flex justify-end gap-2">
                        <button type="button" onClick={onClose} className={ui.buttonSecondary}>Cancelar</button>
                        <button type="submit" className={ui.buttonPrimary}>Criar Chave</button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

const ShowNewApiKeyModal: React.FC<{ plainKey: string; keyName: string; onClose: () => void; onCopy: () => void }> = ({ plainKey, keyName, onClose, onCopy }) => {
    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm" onClick={onClose}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className={`${ui.modalContainer} w-full max-w-lg`} onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-800">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <KeyRound className="w-4 h-4 text-emerald-400" />
                        </div>
                        <h2 className="text-lg font-bold text-white">Chave criada com sucesso</h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Sua nova chave para <span className="text-slate-300">"{keyName}"</span> foi gerada. Copie-a e guarde em local seguro.</p>
                    <div className="p-3 my-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <span>Esta chave secreta <strong className="text-amber-200">não será exibida novamente</strong> após fechar esta janela.</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-slate-900 border border-slate-700 rounded-xl font-mono">
                        <span className="flex-1 truncate text-sm text-sky-300">{plainKey}</span>
                        <button onClick={onCopy} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg shrink-0 transition-colors"><Copy className="w-4 h-4"/></button>
                    </div>
                </div>
                <div className="px-6 py-4 flex justify-end">
                    <button type="button" onClick={onClose} className={ui.buttonPrimary}>Entendi, fechar</button>
                </div>
            </motion.div>
        </div>
    );
};


const ApiKeysTab: React.FC<{ showNotification: (msg: string, type: 'success' | 'error' | 'info') => void }> = ({ showNotification }) => {
    const { companyId } = useAuth();
    const { keys, loading, create, revoke } = useApiKeys(companyId);
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [newKeyData, setNewKeyData] = useState<{ plainKey: string; keyName: string } | null>(null);
    const [keyToRevoke, setKeyToRevoke] = useState<ApiKey | null>(null);
    const [creating, setCreating] = useState(false);

    const handleCopy = (text: string, subject: string) => {
        navigator.clipboard.writeText(text);
        showNotification(`${subject} copiado!`, 'success');
    };

    const handleCreateKey = async (name: string) => {
        setCreating(true);
        try {
            const plainKey = await create(name);
            setNewKeyData({ plainKey, keyName: name });
            setCreateModalOpen(false);
        } catch {
            showNotification('Erro ao criar chave. Tente novamente.', 'error');
        } finally {
            setCreating(false);
        }
    };

    const handleRevokeKey = async () => {
        if (!keyToRevoke) return;
        await revoke(keyToRevoke.id);
        setKeyToRevoke(null);
        showNotification(`Chave "${keyToRevoke.name}" revogada com sucesso.`, 'success');
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Nunca';
        return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <InfoCard icon={Lock} title="Bearer Authentication" description="Formato padrão da indústria para autenticação segura e stateless." />
                <InfoCard icon={ShieldCheck} title="SHA-256 Hash" description="Armazenamento seguro: apenas o hash da chave fica no banco." />
                <InfoCard icon={Gauge} title="Rate Limiting" description="100 requisições/minuto para garantir a estabilidade da plataforma." />
            </div>
            <div className="px-3 py-2 bg-slate-800/30 border border-slate-800 rounded-xl text-xs text-slate-400">
                <strong className="text-slate-300">Bearer:</strong> <code className="bg-slate-900 px-1.5 py-0.5 rounded-lg text-sky-300">Authorization: Bearer sk_live_...</code>
            </div>
            <Section icon={KeyRound} title="Gerenciar API Keys" actions={
                <button
                    onClick={() => setCreateModalOpen(true)}
                    disabled={creating}
                    className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-500 text-white px-4 py-2 rounded-md text-sm font-semibold hover:shadow-[0_0_18px_rgba(29,161,242,0.45)] hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60"
                >
                    <Plus className="w-4 h-4" /> Nova Chave
                </button>
            }>
                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
                    </div>
                ) : keys.length === 0 ? (
                    <div className="text-center py-10">
                        <KeyRound className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                        <h3 className="font-semibold text-white">Nenhuma API Key gerada ainda</h3>
                        <p className="text-sm text-slate-500 mt-1">Crie sua primeira chave para começar a integrar.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {keys.map(apiKey => (
                            <div key={apiKey.id} className="group bg-slate-900/40 px-4 py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 flex flex-col md:flex-row md:items-center gap-4 transition-colors">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/15 flex items-center justify-center flex-shrink-0">
                                        <KeyRound className="w-3.5 h-3.5 text-sky-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-white text-sm truncate">{apiKey.name}</p>
                                        <div className="flex items-center gap-1.5 mt-0.5 font-mono text-xs text-slate-500">
                                            <span className="truncate">{apiKey.key_preview}</span>
                                            <button onClick={() => handleCopy(apiKey.key_preview, 'Preview da chave')} className="p-0.5 hover:text-slate-300 transition-colors flex-shrink-0">
                                                <Copy className="w-3 h-3"/>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-xs text-slate-500 flex-shrink-0 md:text-right">
                                    <p><span className="text-slate-400">Criada:</span> {formatDate(apiKey.created_at)}</p>
                                    <p className="mt-0.5"><span className="text-slate-400">Último uso:</span> {formatDate(apiKey.last_used_at)}</p>
                                </div>
                                <button onClick={() => setKeyToRevoke(apiKey)} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all flex-shrink-0 opacity-0 group-hover:opacity-100">
                                    <Trash2 className="w-3.5 h-3.5"/> Revogar
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </Section>

            <AnimatePresence>
                {isCreateModalOpen && <CreateApiKeyModal onClose={() => setCreateModalOpen(false)} onCreate={handleCreateKey} />}
                {newKeyData && (
                    <ShowNewApiKeyModal
                        plainKey={newKeyData.plainKey}
                        keyName={newKeyData.keyName}
                        onClose={() => setNewKeyData(null)}
                        onCopy={() => handleCopy(newKeyData.plainKey, 'Chave API')}
                    />
                )}
                {keyToRevoke && (
                    <ConfirmDeleteModal
                        onClose={() => setKeyToRevoke(null)} onConfirm={handleRevokeKey}
                        title={`Revogar a chave "${keyToRevoke.name}"?`} message="Esta ação não pode ser desfeita. Qualquer integração usando esta chave irá parar de funcionar."
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
        <div className="border-b border-slate-800 last:border-b-0">
            <button
                onClick={onClick}
                className="w-full flex justify-between items-center px-4 py-3.5 text-left hover:bg-slate-800/40 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-sky-400" />
                    <span className="font-semibold text-white text-sm">{title}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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
                        <div className="px-4 pb-4 pt-0 prose prose-sm prose-invert text-slate-400 max-w-none">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const WebhooksTab: React.FC<{ showNotification: (msg: string, type: 'success' | 'error' | 'info') => void }> = ({ showNotification }) => {
    const { companyId } = useAuth();
    const { webhooks, loading: whLoading, add: addWebhook, remove: removeWebhook } = useOutgoingWebhooks(companyId);
    const [activeSubTab, setActiveSubTab] = useState('Entrada');
    const [openAccordion, setOpenAccordion] = useState<string | null>(null);
    const webhookUrl = 'https://lxcjwmvclbfqizwtxpxy.supabase.co/functions/v1/webhook-receiver';

    const [newWebhookUrl, setNewWebhookUrl] = useState('');
    const [saving, setSaving] = useState(false);

    const availableEvents: Record<string, string> = {
        'lead.created':       'Lead Criado',
        'lead.updated':       'Lead Atualizado',
        'lead.stage_changed': 'Lead Mudou de Estágio',
        'lead.converted':     'Lead Ganho (Convertido)',
        'lead.lost':          'Lead Perdido',
        'lead.deleted':       'Lead Deletado',
        'contact.created':    'Cliente Criado',
        'activity.completed': 'Atividade Concluída',
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

    const handleAddWebhook = async (e: React.FormEvent) => {
        e.preventDefault();
        const activeEvents = Object.keys(selectedEvents).filter(key => selectedEvents[key]);

        if (!newWebhookUrl.trim()) {
            showNotification('Por favor, insira uma URL válida.', 'error');
            return;
        }
        try { new URL(newWebhookUrl); } catch {
            showNotification('A URL fornecida é inválida.', 'error');
            return;
        }
        if (activeEvents.length === 0) {
            showNotification('Selecione pelo menos um evento.', 'error');
            return;
        }

        setSaving(true);
        try {
            await addWebhook(newWebhookUrl.trim(), activeEvents);
            setNewWebhookUrl('');
            setSelectedEvents(Object.keys(availableEvents).reduce((acc, key) => ({...acc, [key]: false}), {}));
            showNotification('Webhook adicionado com sucesso!', 'success');
        } catch {
            showNotification('Erro ao salvar webhook. Tente novamente.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleRevokeWebhook = async () => {
        if (!webhookToRevoke) return;
        await removeWebhook(webhookToRevoke.id);
        setWebhookToRevoke(null);
        showNotification('Webhook removido com sucesso.', 'success');
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
        { name: 'Saída', icon: LogOut },
        { name: 'Documentação', icon: BookOpen }
    ];

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <InfoCard icon={GitBranch} title="Bidirecional" description="Receba e envie dados automaticamente para manter seus sistemas sincronizados." />
                <InfoCard icon={Lock} title="Bearer Auth" description="Entrada usa Bearer e HMAC na saída para garantir a segurança e autenticidade dos dados." />
                <InfoCard icon={List} title="8 Eventos" description="Notificações para lead.*, contact.*, activity.* para cobrir todo o ciclo de vida do cliente." />
            </div>
            <div className="px-3 py-2 bg-slate-800/30 border border-slate-800 rounded-xl text-xs text-slate-400">
                <strong className="text-slate-300">Bearer:</strong> Webhooks de entrada usam <code className="bg-slate-900 px-1.5 py-0.5 rounded-lg text-sky-300">Authorization: Bearer sk_live_...</code>
            </div>
            
            <SubTabs tabs={subTabs} activeTab={activeSubTab} onTabClick={setActiveSubTab} />

            {activeSubTab === 'Entrada' && (
                <Section icon={ChevronRight} title="Webhook Receiver (Entrada)">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">URL do Webhook</label>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 font-mono truncate">{webhookUrl}</div>
                                <button onClick={() => handleCopy(webhookUrl, 'URL')} className="p-2.5 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors"><Copy className="w-4 h-4" /></button>
                            </div>
                            <p className="text-xs text-slate-500 mt-1.5">Inclua sua API Key no header Authorization.</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Eventos Suportados</label>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-sky-300">lead.created</span>
                                <span className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-sky-300">contact.created</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Exemplo cURL</label>
                            <CodeBlock code={curlExample} onCopy={() => handleCopy(curlExample, "Exemplo cURL")} />
                        </div>
                    </div>
                </Section>
            )}
             {activeSubTab === 'Saída' && (
                <div className="space-y-6">
                    <Section icon={ChevronLeft} title="Webhooks de Saída">
                        <form onSubmit={handleAddWebhook} className="space-y-4">
                            <div>
                                <label htmlFor="webhookUrl" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">URL do Webhook</label>
                                <input
                                    type="url"
                                    id="webhookUrl"
                                    value={newWebhookUrl}
                                    onChange={e => setNewWebhookUrl(e.target.value)}
                                    placeholder="https://seu-servidor.com/webhook"
                                    className={ui.input}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Eventos para Notificar</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                                    {Object.entries(availableEvents).map(([key, label]) => (
                                        <label key={key} className="flex items-center gap-2.5 cursor-pointer px-2 py-1.5 rounded-lg hover:bg-slate-800/50 transition-colors">
                                            <div
                                                onClick={() => handleEventToggle(key)}
                                                className={`w-4 h-4 rounded flex items-center justify-center border transition-all duration-150 cursor-pointer flex-shrink-0
                                                    ${selectedEvents[key]
                                                        ? 'bg-sky-500 border-sky-400 shadow-[0_0_6px_rgba(14,165,233,0.4)]'
                                                        : 'bg-slate-800 border-slate-600 hover:border-slate-500'}`}
                                            >
                                                {selectedEvents[key] && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                                            </div>
                                            <span className="text-sm text-slate-300">{label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <button type="submit" disabled={saving} className={`${ui.buttonPrimary} flex items-center gap-2 disabled:opacity-60`}>
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                {saving ? 'Salvando...' : 'Adicionar Webhook'}
                            </button>
                        </form>
                    </Section>

                    <Section icon={Settings} title="Webhooks Configurados">
                        {whLoading ? (
                            <div className="flex justify-center py-10">
                                <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
                            </div>
                        ) : webhooks.length === 0 ? (
                            <div className="text-center py-10">
                                <WebhookIcon className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                                <h3 className="font-semibold text-white text-sm">Nenhum webhook configurado ainda</h3>
                                <p className="text-xs text-slate-500 mt-1">Adicione um webhook para começar a receber eventos.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {webhooks.map(wh => (
                                    <div key={wh.id} className="group bg-slate-900/40 px-4 py-3 rounded-xl border border-slate-800 hover:border-slate-700 flex flex-col md:flex-row md:items-center gap-3 transition-colors">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${wh.is_active ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                                                <p className="font-mono text-sm text-slate-300 truncate">{wh.url}</p>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {wh.events.map(event => (
                                                    <span key={event} className="px-2 py-0.5 text-[10px] font-medium rounded-lg bg-slate-800 border border-slate-700 text-slate-400">{availableEvents[event] || event}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="text-xs text-slate-600 shrink-0">
                                            {new Date(wh.created_at).toLocaleDateString('pt-BR')}
                                        </div>
                                        <button onClick={() => setWebhookToRevoke(wh)} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all self-start md:self-center shrink-0 opacity-0 group-hover:opacity-100">
                                            <Trash2 className="w-3.5 h-3.5"/> Remover
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
                                title={`Revogar o webhook?`} message={<>Esta ação não pode ser desfeita. Sua aplicação em <strong className="font-mono text-white">{new URL(webhookToRevoke.url).hostname}</strong> irá parar de receber eventos neste endpoint.</>}
                                confirmText="Sim, Revogar" confirmVariant="danger"
                            />
                        )}
                    </AnimatePresence>
                </div>
            )}
             {activeSubTab === 'Documentação' && (
                <div className="bg-slate-800/20 rounded-xl border border-slate-800">
                     <AccordionItem title="API Keys - Autenticação" icon={KeyRound} isOpen={openAccordion === 'auth'} onClick={() => setOpenAccordion(openAccordion === 'auth' ? null : 'auth')}>
                        <p>Todos os webhooks, tanto de entrada quanto de saída, são protegidos usando API Keys. Você deve incluir sua chave no cabeçalho de autorização para autenticar suas requisições.</p>
                        <p>Vá para a aba "API Keys" para gerar e gerenciar suas chaves.</p>
                        <CodeBlock language="http" code={`Authorization: Bearer sk_live_...`} />
                    </AccordionItem>
                    <AccordionItem title="Webhooks de Entrada (Receber Dados)" icon={LogIn} isOpen={openAccordion === 'incoming'} onClick={() => setOpenAccordion(openAccordion === 'incoming' ? null : 'incoming')}>
                        <p>Envie dados para o seu CRM a partir de sistemas externos fazendo uma requisição POST para a URL do Webhook Receiver.</p>
                        <p>O corpo da requisição deve ser um JSON contendo a propriedade "event" e "data".</p>
                        <h4>Eventos Suportados</h4>
                        <ul>
                            <li><code>lead.created</code>: Cria um novo lead no sistema.</li>
                            <li><code>contact.created</code>: Cria um novo contato/cliente.</li>
                        </ul>
                        <h4>Exemplo de Payload</h4>
                        <CodeBlock language="json" code={`{\n  "event": "lead.created",\n  "data": {\n    "name": "Novo Lead via Webhook",\n    "company": "Empresa Exemplo",\n    "email": "contato@exemplo.com",\n    "value": 2500.00,\n    "source": "Webhook Externo"\n  }\n}`} />
                    </AccordionItem>
                    <AccordionItem title="Webhooks de Saída (Enviar Notificações)" icon={LogOut} isOpen={openAccordion === 'outgoing'} onClick={() => setOpenAccordion(openAccordion === 'outgoing' ? null : 'outgoing')}>
                        <p>Receba notificações em tempo real em seus próprios sistemas quando eventos importantes ocorrerem no CRM. Configure os endpoints na aba "Saída".</p>
                        <p>Seu endpoint receberá uma requisição POST com um payload JSON contendo o evento e os dados associados.</p>
                        <h4>Exemplo de Payload (lead.updated)</h4>
                        <CodeBlock language="json" code={`{\n  "event": "lead.updated",\n  "timestamp": "2024-01-01T12:00:00Z",\n  "data": {\n    "id": "lead-123",\n    "name": "Lead Atualizado",\n    "value": 7500.00,\n    "columnId": "proposal"\n    /* ...outros campos do lead */\n  }\n}`} />
                        <h4>Verificação de Assinatura (HMAC)</h4>
                        <p>Para garantir que a requisição veio do nosso sistema, cada webhook de saída inclui um cabeçalho <code>X-Signature-256</code>. Ele é um hash HMAC-SHA256 do corpo da requisição, usando sua chave secreta da API. Compare o hash que você gera com o que está no header para validar a requisição.</p>
                    </AccordionItem>
                    <AccordionItem title="Boas Práticas de Segurança" icon={ShieldCheck} isOpen={openAccordion === 'security'} onClick={() => setOpenAccordion(openAccordion === 'security' ? null : 'security')}>
                        <ul>
                            <li><strong>Use HTTPS:</strong> Sempre configure seus endpoints de webhook com URLs HTTPS para garantir que os dados sejam criptografados em trânsito.</li>
                            <li><strong>Valide as Assinaturas:</strong> Para webhooks de saída, sempre valide a assinatura HMAC para prevenir ataques de falsificação de requisição (request forgery).</li>
                            <li><strong>Proteja suas Chaves:</strong> Nunca exponha suas chaves de API no lado do cliente (frontend). Mantenha-as seguras no seu backend.</li>
                            <li><strong>Responda Rapidamente:</strong> Seu endpoint deve responder com um status <code>200 OK</code> o mais rápido possível. Processamentos longos devem ser feitos de forma assíncrona para evitar timeouts.</li>
                        </ul>
                    </AccordionItem>
                    <AccordionItem title="Solução de Problemas" icon={HelpCircle} isOpen={openAccordion === 'troubleshooting'} onClick={() => setOpenAccordion(openAccordion === 'troubleshooting' ? null : 'troubleshooting')}>
                        <h4>Meu webhook não está funcionando. O que verificar?</h4>
                        <ul>
                            <li><strong>Logs do Servidor:</strong> Verifique os logs do seu servidor de recebimento para ver se a requisição está chegando e se há erros.</li>
                            <li><strong>Firewall:</strong> Certifique-se de que seu firewall não está bloqueando requisições POST dos nossos endereços IP.</li>
                            <li><strong>Status de Resposta:</strong> Seu endpoint deve retornar um status na faixa 2xx. Qualquer outro status (3xx, 4xx, 5xx) será considerado uma falha na entrega.</li>
                            <li><strong>Autenticação:</strong> Para webhooks de entrada, verifique se o cabeçalho <code>Authorization: Bearer sk_live_...</code> está correto.</li>
                            <li><strong>Validação de Assinatura:</strong> Para webhooks de saída, confira se seu algoritmo de validação HMAC está correto.</li>
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
    const [activeSubTab, setActiveSubTab] = useState('Visão Geral');

    // FIX: Defined handleCopy function to be used by CodeBlock components.
    const handleCopy = (text: string, subject: string) => {
        navigator.clipboard.writeText(text);
        showNotification(`${subject} copiado!`, 'success');
    };

    const baseUrl = `${window.location.origin}/api/v1`;
    const quickStartCurl = `curl -X GET "${baseUrl}/leads?page=1&limit=20" \\\n  -H "Authorization: Bearer sk_live_SUA_CHAVE"`;
    const quickStartResponse = `{\n  "data": [\n    {\n      "id": "uuid",\n      "name": "Empresa X",\n      "value": 15000,\n      "status": "NOVO",\n      "created_at": "2024-01-15T10:30:00Z"\n    }\n  ],\n  "meta": {\n    "total": 150,\n    "page": 1,\n    "limit": 20,\n    "pages": 8\n  }\n}`;

    const exampleCurl = `curl -X GET "${baseUrl}/leads" \\\n  -H "Authorization: Bearer sk_live_SUA_CHAVE"`;
    const exampleJs = `fetch('${baseUrl}/leads', {\n  headers: {\n    'Authorization': 'Bearer sk_live_SUA_CHAVE'\n  }\n})\n  .then(r => r.json())\n  .then(({ data, meta }) => console.log(data));`;
    const examplePy = `import requests\n\nresponse = requests.get(\n    '${baseUrl}/leads',\n    headers={'Authorization': 'Bearer sk_live_SUA_CHAVE'}\n)\nleads = response.json()['data']`;

    const endpointsData = {
        Leads: { count: 7, endpoints: [{m:'GET',p:'/leads', d:'Listar leads com paginação e filtros'}, {m:'GET',p:'/leads/{id}', d:'Obter detalhes de um lead'}, {m:'POST',p:'/leads', d: 'Criar novo lead'}, {m:'PUT',p:'/leads/{id}', d:'Atualizar lead'}, {m:'PATCH',p:'/leads/{id}/stage', d: 'Mover lead de estágio'}, {m:'PATCH',p:'/leads/{id}/convert', d:'Converter lead em cliente'}, {m:'DELETE',p:'/leads/{id}', d:'Deletar lead'}] },
        Contacts: { count: 5, endpoints: [{m:'GET',p:'/contacts', d:'Listar clientes'}, {m:'GET',p:'/contacts/{id}',d:'Obter detalhes de um cliente'}, {m:'POST',p:'/contacts', d:'Criar novo cliente'}, {m:'PUT',p:'/contacts/{id}', d:'Atualizar cliente'}, {m:'DELETE',p:'/contacts/{id}', d:'Deletar cliente'}] },
        Activities: { count: 6, endpoints: [{m:'GET',p:'/activities', d:'Listar atividades'}, {m:'GET',p:'/activities/{id}', d:'Obter detalhes de uma atividade'}, {m:'POST',p:'/activities', d:'Criar nova atividade'}, {m:'PUT',p:'/activities/{id}', d:'Atualizar atividade'}, {m:'PATCH',p:'/activities/{id}/complete', d:'Marcar como concluída'}, {m:'DELETE',p:'/activities/{id}', d:'Deletar atividade'}] },
        Pipeline: { count: 5, endpoints: [{m:'GET',p:'/pipeline/stages', d:'Listar estágios'}, {m:'POST',p:'/pipeline/stages', d:'Criar novo estágio'}, {m:'PUT',p:'/pipeline/stages/{id}', d:'Atualizar estágio'}, {m:'DELETE',p:'/pipeline/stages/{id}', d:'Deletar estágio'}, {m:'PUT',p:'/pipeline/stages/reorder', d:'Reordenar estágios'}] },
        Metrics: { count: 1, endpoints: [{m:'GET',p:'/metrics/dashboard', d:'Obter métricas do dashboard'}] },
    };
    
    const getMethodClass = (method: string) => ({
        'GET': 'bg-blue-900/50 text-blue-400', 'POST': 'bg-blue-900/50 text-blue-400', 'PUT': 'bg-orange-900/50 text-orange-400', 
        'PATCH': 'bg-yellow-900/50 text-yellow-400', 'DELETE': 'bg-red-900/50 text-red-400'
    }[method] || 'bg-slate-700 text-slate-400');

    return (
        <div className="space-y-6">
            <Section icon={FileCode} title="API REST v1 - OpenAPI 3.1.0" actions={
                <button className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-600 transition-colors">
                    <Download className="w-4 h-4" /> Download Spec
                </button>
            }>
                <div className="space-y-4">
                    <p className="text-slate-300">API RESTful completa para integração com seu CRM. Autenticação via JWT ou API Key com rate limiting inteligente.</p>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InfoCard icon={List} title="26 Endpoints" description="CRUD completo para todos os recursos." />
                        <InfoCard icon={Gauge} title="Rate Limiting" description="JWT: 300/min â€¢ API Key: 100/min" />
                        <InfoCard icon={WebhookIcon} title="8 Webhooks" description="Notificações em tempo real." />
                    </div>
                     <div className="p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg text-sm text-yellow-300 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <strong className="text-yellow-200">Sobre Validação OpenAPI 3.1:</strong> Esta especificação segue OpenAPI 3.1.0. O Swagger Editor 3.x pode mostrar erros estruturais falsos. Para validação completa, use: Swagger Editor 5.x+, Redocly CLI, Stoplight Studio, ou Postman v10+.
                        </div>
                    </div>
                </div>
            </Section>

            <SubTabs tabs={[{name:'Visão Geral'}, {name:'Autenticação'}, {name:'Endpoints'}, {name:'Exemplos'}]} activeTab={activeSubTab} onTabClick={setActiveSubTab} />

            {activeSubTab === 'Visão Geral' && (
                <div className="space-y-6">
                    <Section icon={ChevronRight} title="Quick Start">
                        <div className="prose prose-sm prose-invert text-slate-300 max-w-none">
                            <h4>1. Base URL</h4>
                            <CodeBlock language='text' code={baseUrl} onCopy={() => handleCopy(baseUrl, 'URL Base')}/>
                            <h4>2. Obtenha sua API Key</h4>
                            <p>Vá para a aba "API Keys" e gere uma nova API Key. Ela será usada para autenticar suas requisições.</p>
                            <h4>3. Faça sua primeira requisição</h4>
                            <CodeBlock language='bash' code={quickStartCurl} onCopy={() => handleCopy(quickStartCurl, "Exemplo cURL")}/>
                            <h4>4. Resposta esperada</h4>
                            <CodeBlock language="json" code={quickStartResponse} onCopy={() => handleCopy(quickStartResponse, "Exemplo de resposta")}/>
                        </div>
                    </Section>
                </div>
            )}
            {activeSubTab === 'Autenticação' && (
                <div className="space-y-6">
                    <Section icon={Lock} title="Métodos de Autenticação">
                         <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800 text-white font-medium">Recomendado: Bearer Token (JWT ou API Key)</div>
                         <div className="p-3 mt-2 bg-slate-900/40 rounded-xl border border-slate-800 text-slate-400">Query Parameter (não recomendado)</div>
                    </Section>
                    <Section icon={Gauge} title="Rate Limiting Headers">
                        <p className="text-slate-400 text-sm mb-4">Todas as respostas incluem headers informativos sobre o rate limiting:</p>
                        <div className="font-mono text-sm text-slate-300 space-y-2">
                            <div className="flex justify-between items-center"><span className="text-blue-300">X-RateLimit-Limit</span><span className="text-slate-500">Limite total de requisições</span></div>
                            <div className="flex justify-between items-center"><span className="text-blue-300">X-RateLimit-Remaining</span><span className="text-slate-500">Requisições restantes</span></div>
                            <div className="flex justify-between items-center"><span className="text-blue-300">X-RateLimit-Reset</span><span className="text-slate-500">Timestamp do reset</span></div>
                        </div>
                    </Section>
                </div>
            )}
             {activeSubTab === 'Endpoints' && (
                 <div className="space-y-6">
                    {Object.entries(endpointsData).map(([resource, data]) => (
                        <Section key={resource} icon={Database} title={resource} actions={<span className="text-xs font-semibold bg-slate-700 text-slate-300 px-2 py-1 rounded-lg">{data.count} endpoints</span>}>
                            <div className="space-y-2">
                                {data.endpoints.map(ep => (
                                    <div key={ep.p} className="flex items-center gap-4 p-3 bg-slate-900/40 rounded-xl border border-slate-800">
                                        <span className={`w-16 text-center font-bold text-sm px-2 py-1 rounded-lg ${getMethodClass(ep.m)}`}>{ep.m}</span>
                                        <span className="font-mono text-slate-300 flex-1">{ep.p}</span>
                                        <span className="text-sm text-slate-500 hidden md:block">{ep.d}</span>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    ))}
                 </div>
             )}
             {activeSubTab === 'Exemplos' && (
                <Section icon={FileJson2} title="Exemplos de Código">
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
        { name: 'schedule_followup', desc: 'Agenda follow-up automático', ready: false },
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
                        cada ferramenta é um contrato tipado â€” o agente sabe exatamente o que pode fazer, com quais
                        parâmetros e quais garantias de isolamento por <code className="text-blue-400">company_id</code>.
                    </p>
                </div>
            </div>

            {/* Service Registry */}
            <div>
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Serviços Registrados
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {services.map(({ name, type, envKey, status, icon: Icon }) => (
                        <div key={name} className="flex items-center gap-3 p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                            <div className="p-2 rounded-lg bg-slate-800">
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
                    <Zap className="w-4 h-4" /> Ferramentas MCP disponíveis
                </h4>
                <div className="space-y-2">
                    {tools.map(({ name, desc, ready }) => (
                        <div key={name} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800">
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
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
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
                        O <code className="text-slate-500">company_id</code> é propagado em cada etapa via tenant guard nas RPCs (SECURITY DEFINER).
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
    const [activeTab, setActiveTab] = useState('Conexões');
    const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
    const { currentUserRole } = useAuth();

    const allTabs = [
        { name: 'Conexões', icon: Wifi },
        { name: 'Eventos', icon: Activity },
        { name: 'API Keys', icon: KeyRound },
        { name: 'Webhooks', icon: WebhookIcon },
        { name: 'API REST', icon: FileCode },
        { name: 'MCP Server', icon: Server },
    ];

    // Seller vê apenas a aba de Conexões (gerencia o próprio WhatsApp)
    const mainTabs = currentUserRole === 'admin'
        ? allTabs
        : allTabs.filter(t => t.name === 'Conexões');

    return (
        <div className="flex flex-col gap-6 h-full">
            <div>
                <h1 className="text-2xl font-bold text-white">Integrações</h1>
                <p className="text-slate-400">Conecte seu CRM com outras ferramentas e APIs.</p>
            </div>

            <div>
                <div className="border-b border-slate-800">
                    <nav className="flex -mb-px space-x-6" aria-label="Tabs">
                        {mainTabs.map(tab => (
                            <button
                                key={tab.name}
                                onClick={() => setActiveTab(tab.name)}
                                className={`whitespace-nowrap flex items-center gap-2 py-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.name ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.name}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 -mr-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
                 {activeTab === 'Conexões'  && <ConexoesTab showNotification={showNotification} onOpenConnect={() => setWhatsappModalOpen(true)} />}
                 {activeTab === 'Eventos'   && <EventosTab  showNotification={showNotification} />}
                 {activeTab === 'API Keys'  && <ApiKeysTab  showNotification={showNotification} />}
                 {activeTab === 'Webhooks'  && <WebhooksTab showNotification={showNotification} />}
                 {activeTab === 'API REST'  && <ApiRestTab  showNotification={showNotification} />}
                 {activeTab === 'MCP Server' && <McpTab />}
            </div>

            <AnimatePresence>
                {whatsappModalOpen && (
                    <WhatsAppConnectModal
                        onClose={() => setWhatsappModalOpen(false)}
                        onConnected={() => {
                            setWhatsappModalOpen(false);
                            showNotification('WhatsApp conectado com sucesso!', 'success');
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default IntegrationsPage;
