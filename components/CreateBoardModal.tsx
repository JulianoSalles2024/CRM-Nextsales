import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, LayoutTemplate, Settings, Plus, ArrowLeft, BookOpen, Rocket, Heart, Target, GraduationCap, Briefcase, CheckCircle2, Loader2 } from 'lucide-react';
import { Playbook, Board, ColumnData, Id } from '../types';
import { initialPlaybooks } from '../data';

interface CreateBoardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreateBoard: (board: Omit<Board, 'id'>) => void;
}

type Step = 'selection' | 'ai-prompt' | 'ai-processing' | 'configuration';
type CreationMethod = 'ai' | 'playbook' | 'template' | 'scratch';

const templates = [
    {
        id: 'sdr',
        name: 'Pré-venda',
        description: 'Qualificação de leads até tornarem-se MQL',
        icon: Target,
        color: 'text-pink-500',
        tags: ['SDR', 'Qualificação'],
        columns: [
            { id: 'new', title: 'Nova', color: '#3b82f6', type: 'open' },
            { id: 'attempting', title: 'Tentando Contato', color: '#eab308', type: 'follow-up' },
            { id: 'connected', title: 'Conectado', color: '#22c55e', type: 'qualification' },
            { id: 'qualified', title: 'Qualificado (MQL)', color: '#8b5cf6', type: 'won' },
            { id: 'disqualified', title: 'Desqualificado', color: '#ef4444', type: 'lost' }
        ] as ColumnData[]
    },
    {
        id: 'sales',
        name: 'Pipeline de Vendas',
        description: 'MQL até fechamento ou perda',
        icon: Briefcase,
        color: 'text-amber-500',
        tags: ['Vendas', 'CRM'],
        columns: [
            { id: 'prospect', title: 'Prospecção', color: '#3b82f6', type: 'open' },
            { id: 'qualify', title: 'Qualificação', color: '#8b5cf6', type: 'qualification' },
            { id: 'proposal', title: 'Proposta', color: '#ec4899', type: 'follow-up' },
            { id: 'negotiation', title: 'Negociação', color: '#f97316', type: 'follow-up' },
            { id: 'won', title: 'Fechado', color: '#10b981', type: 'won' },
            { id: 'lost', title: 'Perdido', color: '#ef4444', type: 'lost' }
        ] as ColumnData[]
    },
    {
        id: 'onboarding',
        name: 'Onboarding de Clientes',
        description: 'Ativação e implementação de novos clientes',
        icon: Rocket,
        color: 'text-indigo-500',
        tags: ['CS', 'Implementação'],
        columns: [
            { id: 'kickoff', title: 'Kickoff', color: '#3b82f6', type: 'open' },
            { id: 'setup', title: 'Configuração', color: '#8b5cf6', type: 'follow-up' },
            { id: 'training', title: 'Treinamento', color: '#ec4899', type: 'follow-up' },
            { id: 'golive', title: 'Go Live', color: '#10b981', type: 'won' }
        ] as ColumnData[]
    },
    {
        id: 'cs',
        name: 'CS (Saúde da Conta)',
        description: 'Gestão de saúde do cliente e risco de churn',
        icon: Heart,
        color: 'text-rose-500',
        tags: ['Retenção', 'Health Score'],
        columns: [
            { id: 'healthy', title: 'Saudável', color: '#10b981', type: 'open' },
            { id: 'risk', title: 'Em Risco', color: '#f59e0b', type: 'follow-up' },
            { id: 'churn', title: 'Churn', color: '#ef4444', type: 'lost' },
            { id: 'expansion', title: 'Expansão', color: '#8b5cf6', type: 'won' }
        ] as ColumnData[]
    }
];

const CreateBoardModal: React.FC<CreateBoardModalProps> = ({ isOpen, onClose, onCreateBoard }) => {
    const [step, setStep] = useState<Step>('selection');
    const [method, setMethod] = useState<CreationMethod | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook | null>(null);
    
    // AI prompt state
    const [aiDescription, setAiDescription] = useState('');
    const [processingStep, setProcessingStep] = useState(-1); // -1 = not started, 0/1/2 = active
    const processingRef = useRef(false);

    // Form State
    const [boardName, setBoardName] = useState('');
    const [boardSlug, setBoardSlug] = useState('');
    const [boardDescription, setBoardDescription] = useState('');
    const [columns, setColumns] = useState<ColumnData[]>([]);

    const handleMethodSelect = (m: CreationMethod) => {
        setMethod(m);
        if (m === 'scratch') {
            setBoardName('');
            setBoardSlug('');
            setBoardDescription('');
            setColumns([
                { id: `col-${Date.now()}-1`, title: 'Nova', color: '#3b82f6', type: 'open' },
                { id: `col-${Date.now()}-2`, title: 'Em Progresso', color: '#eab308', type: 'follow-up' },
                { id: `col-${Date.now()}-3`, title: 'Concluído', color: '#10b981', type: 'won' }
            ]);
            setStep('configuration');
        }
    };

    const handleTemplateSelect = (template: any) => {
        setSelectedTemplate(template);
        setBoardName(template.name);
        setBoardSlug(template.name.toLowerCase().replace(/\s+/g, '-').normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
        setBoardDescription(template.description);
        setColumns(template.columns.map((c: ColumnData) => ({ ...c, id: `col-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` })));
        setStep('configuration');
    };

    const handlePlaybookSelect = (playbook: Playbook) => {
        setSelectedPlaybook(playbook);
        setBoardName(playbook.name);
        setBoardSlug(playbook.name.toLowerCase().replace(/\s+/g, '-').normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
        setBoardDescription(`Board criado a partir do playbook: ${playbook.name}`);
        // For playbooks, we might want to map stages to columns or just use default columns
        // Assuming playbook stages map to columns for now or using a default set
        setColumns([
            { id: `col-${Date.now()}-1`, title: 'Prospecção', color: '#3b82f6', type: 'open' },
            { id: `col-${Date.now()}-2`, title: 'Qualificação', color: '#8b5cf6', type: 'qualification' },
            { id: `col-${Date.now()}-3`, title: 'Fechamento', color: '#10b981', type: 'won' }
        ]);
        setStep('configuration');
    };

    const handleCreate = () => {
        onCreateBoard({
            name: boardName,
            slug: boardSlug,
            description: boardDescription,
            type: selectedTemplate?.id || 'custom',
            columns: columns
        });
        onClose();
        // Reset state
        setStep('selection');
        setMethod(null);
        setSelectedTemplate(null);
        setSelectedPlaybook(null);
        setBoardName('');
        setBoardSlug('');
        setBoardDescription('');
        setColumns([]);
    };

    const handleBack = () => {
        if (step === 'ai-prompt') {
            setStep('selection');
            setMethod(null);
            setAiDescription('');
        } else if (step === 'configuration') {
            if (method === 'ai') {
                setStep('ai-prompt');
            } else {
                setStep('selection');
                setMethod(null);
                setSelectedTemplate(null);
                setSelectedPlaybook(null);
            }
        }
    };

    // Runs the processing animation when step === 'ai-processing'
    useEffect(() => {
        if (step !== 'ai-processing' || processingRef.current) return;
        processingRef.current = true;
        setProcessingStep(0);
        const t1 = setTimeout(() => setProcessingStep(1), 1400);
        const t2 = setTimeout(() => setProcessingStep(2), 2800);
        const t3 = setTimeout(() => {
            // All steps done — create the board and close
            onCreateBoard({
                name: boardName,
                slug: boardSlug,
                description: boardDescription,
                type: 'ai',
                columns,
            });
            onClose();
            // Reset everything
            setStep('selection');
            setMethod(null);
            setAiDescription('');
            setBoardName('');
            setBoardSlug('');
            setBoardDescription('');
            setColumns([]);
            setProcessingStep(-1);
            processingRef.current = false;
        }, 4200);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Criar Novo Board</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    <AnimatePresence mode="wait">
                        {step === 'selection' && !method && (
                            <motion.div 
                                key="selection"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-6"
                            >
                                <div className="text-center mb-4">
                                    <h3 className="text-lg font-semibold text-white mb-1">Como você quer começar?</h3>
                                    <p className="text-slate-400 text-sm">Escolha um caminho. O resto aparece depois.</p>
                                </div>

                                <div className="grid gap-3">
                                    {/* AI Option */}
                                    <button
                                        onClick={() => { setMethod('ai'); setStep('ai-prompt'); }}
                                        className="group relative p-1 rounded-xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:opacity-90 transition-opacity"
                                    >
                                        <div className="bg-slate-900 rounded-[10px] p-6 flex items-center gap-4 h-full">
                                            <div className="p-3 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-purple-400">
                                                <Sparkles className="w-6 h-6" />
                                            </div>
                                            <div className="text-left">
                                                <h4 className="text-lg font-semibold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-pink-400 transition-all">
                                                    Criar com IA
                                                </h4>
                                                <p className="text-slate-400 text-sm">Em 1 frase, eu monto o board pra você.</p>
                                            </div>
                                        </div>
                                    </button>

                                    {/* Playbook Option */}
                                    <button 
                                        onClick={() => setMethod('playbook')}
                                        className="p-6 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-slate-600 hover:bg-slate-800 transition-all flex items-center gap-4 text-left"
                                    >
                                        <div className="p-3 rounded-full bg-blue-500/10 text-blue-400">
                                            <BookOpen className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-semibold text-white">Usar um playbook (recomendado)</h4>
                                            <p className="text-slate-400 text-sm">Jornada completa pronta para usar.</p>
                                        </div>
                                    </button>

                                    {/* Template Option */}
                                    <button 
                                        onClick={() => setMethod('template')}
                                        className="p-6 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-slate-600 hover:bg-slate-800 transition-all flex items-center gap-4 text-left"
                                    >
                                        <div className="p-3 rounded-full bg-slate-700/50 text-slate-300">
                                            <LayoutTemplate className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-semibold text-white">Usar template individual</h4>
                                            <p className="text-slate-400 text-sm">Um board pronto (Pré-venda, Vendas, CS...).</p>
                                        </div>
                                    </button>

                                    {/* Scratch Option */}
                                    <button 
                                        onClick={() => handleMethodSelect('scratch')}
                                        className="p-6 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-slate-600 hover:bg-slate-800 transition-all flex items-center gap-4 text-left"
                                    >
                                        <div className="p-3 rounded-full bg-slate-700/50 text-slate-300">
                                            <Plus className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-semibold text-white">Começar do zero</h4>
                                            <p className="text-slate-400 text-sm">Um board em branco.</p>
                                        </div>
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 'ai-prompt' && (
                            <motion.div
                                key="ai-prompt"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-5"
                            >
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-1">Descreva seu negócio em 1 frase</h3>
                                    <p className="text-sm text-slate-400">A IA irá gerar automaticamente uma pipeline de vendas para você.</p>
                                </div>

                                <textarea
                                    autoFocus
                                    rows={4}
                                    value={aiDescription}
                                    onChange={e => setAiDescription(e.target.value)}
                                    placeholder={'Exemplo: "Sou tatuador e quero organizar meus leads de orçamento."'}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm leading-relaxed"
                                />

                                <div className="flex justify-between items-center pt-2">
                                    <button
                                        onClick={handleBack}
                                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
                                    >
                                        <ArrowLeft className="w-4 h-4" /> Voltar
                                    </button>
                                    <button
                                        disabled={!aiDescription.trim()}
                                        onClick={() => {
                                            const ts = Date.now();
                                            setBoardName('Pipeline gerada pela IA');
                                            setBoardSlug('pipeline-ia');
                                            setBoardDescription(aiDescription.trim());
                                            setColumns([
                                                { id: `col-${ts}-1`, title: 'Novo Lead', color: '#3b82f6', type: 'open' },
                                                { id: `col-${ts}-2`, title: 'Em Contato', color: '#eab308', type: 'follow-up' },
                                                { id: `col-${ts}-3`, title: 'Proposta Enviada', color: '#8b5cf6', type: 'follow-up' },
                                                { id: `col-${ts}-4`, title: 'Fechado', color: '#10b981', type: 'won' },
                                                { id: `col-${ts}-5`, title: 'Perdido', color: '#ef4444', type: 'lost' },
                                            ]);
                                            setStep('ai-processing');
                                        }}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        Gerar Board
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 'selection' && method === 'template' && (
                            <motion.div 
                                key="templates"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <div className="flex items-center gap-4 mb-6">
                                    <button onClick={() => setMethod(null)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                                        <ArrowLeft className="w-4 h-4" /> Voltar
                                    </button>
                                    <div className="flex bg-slate-800 rounded-lg p-1">
                                        <button className="px-4 py-1.5 rounded-md text-sm font-medium bg-slate-700 text-white shadow-sm">Templates</button>
                                        <button className="px-4 py-1.5 rounded-md text-sm font-medium text-slate-400 hover:text-white" onClick={() => setMethod('playbook')}>Playbooks</button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {templates.map(template => (
                                        <button 
                                            key={template.id}
                                            onClick={() => handleTemplateSelect(template)}
                                            className="p-6 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-slate-600 hover:bg-slate-800 transition-all text-left group"
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div className={`p-3 rounded-lg bg-slate-900 ${template.color}`}>
                                                    <template.icon className="w-6 h-6" />
                                                </div>
                                            </div>
                                            <h4 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">{template.name}</h4>
                                            <p className="text-slate-400 text-sm mb-4">{template.description}</p>
                                            <div className="flex flex-wrap gap-2">
                                                {template.tags.map(tag => (
                                                    <span key={tag} className="px-2 py-1 rounded-md bg-slate-900 text-xs text-slate-400 border border-slate-700">#{tag}</span>
                                                ))}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {step === 'selection' && method === 'playbook' && (
                            <motion.div 
                                key="playbooks"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <div className="flex items-center gap-4 mb-6">
                                    <button onClick={() => setMethod(null)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                                        <ArrowLeft className="w-4 h-4" /> Voltar
                                    </button>
                                    <div className="flex bg-slate-800 rounded-lg p-1">
                                        <button className="px-4 py-1.5 rounded-md text-sm font-medium text-slate-400 hover:text-white" onClick={() => setMethod('template')}>Templates</button>
                                        <button className="px-4 py-1.5 rounded-md text-sm font-medium bg-slate-700 text-white shadow-sm">Playbooks</button>
                                    </div>
                                </div>

                                <div className="grid gap-4">
                                    {initialPlaybooks.map(playbook => (
                                        <button 
                                            key={playbook.id}
                                            onClick={() => handlePlaybookSelect(playbook)}
                                            className="p-6 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-slate-600 hover:bg-slate-800 transition-all text-left flex items-start gap-4"
                                        >
                                            <div className="p-3 rounded-lg bg-blue-900/30 text-blue-400">
                                                <BookOpen className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-semibold text-white mb-1">{playbook.name}</h4>
                                                <p className="text-slate-400 text-sm">Playbook oficial com {playbook.steps.length} passos e {playbook.stages.length} estágios.</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {step === 'ai-processing' && (
                            <motion.div
                                key="ai-processing"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="space-y-4"
                            >
                                {/* Header inline — mesmo padrão de títulos de seção da plataforma */}
                                <div className="flex items-center gap-3 pb-1">
                                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                                        <Sparkles className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="text-base font-semibold text-white">Criando seu CRM</p>
                                        <p className="text-xs text-slate-400">A IA está desenhando seu processo...</p>
                                    </div>
                                </div>

                                {/* Steps — lista com divide-y, padrão da tela de Estágios */}
                                <div className="rounded-xl border border-slate-800 divide-y divide-slate-800 overflow-hidden">
                                    {[
                                        { label: 'Analisando seu negócio', sub: 'Entendendo o contexto e necessidades.' },
                                        { label: 'Desenhando processo', sub: 'Criando fases do funil de vendas.' },
                                        { label: 'Preparando preview', sub: 'Gerando visualização do pipeline.' },
                                    ].map((s, i) => {
                                        const done = processingStep > i;
                                        const active = processingStep === i;
                                        return (
                                            <div
                                                key={i}
                                                className={`flex items-center gap-3 px-4 py-3 transition-colors duration-300 ${active ? 'bg-slate-800/60' : 'bg-slate-900'}`}
                                            >
                                                <div className="shrink-0 w-5 flex justify-center">
                                                    {done
                                                        ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                        : active
                                                        ? <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                                                        : <div className="w-4 h-4 rounded-full border border-slate-700" />
                                                    }
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-medium transition-colors duration-300 ${done ? 'text-emerald-400' : active ? 'text-white' : 'text-slate-600'}`}>
                                                        {s.label}
                                                    </p>
                                                    <p className={`text-xs transition-colors duration-300 ${done ? 'text-slate-500' : active ? 'text-slate-400' : 'text-slate-700'}`}>
                                                        {s.sub}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Barra de progresso fina — padrão da plataforma */}
                                <div className="h-0.5 bg-slate-800 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                                        initial={{ width: '0%' }}
                                        animate={{ width: processingStep === 0 ? '33%' : processingStep === 1 ? '66%' : '100%' }}
                                        transition={{ duration: 1.2, ease: 'easeInOut' }}
                                    />
                                </div>
                            </motion.div>
                        )}

                        {step === 'configuration' && (
                            <motion.div 
                                key="configuration"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center gap-4 mb-6">
                                    <button onClick={handleBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                                        <ArrowLeft className="w-4 h-4" /> Voltar
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Nome do Board *</label>
                                        <input 
                                            type="text" 
                                            value={boardName}
                                            onChange={(e) => setBoardName(e.target.value)}
                                            placeholder="Ex: Pipeline de Vendas, Onboarding, etc"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Chave (slug) — para integrações</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                value={boardSlug}
                                                onChange={(e) => setBoardSlug(e.target.value)}
                                                placeholder="ex: vendas-b2b"
                                                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">Dica: é mais fácil usar isso no n8n/Make do que um UUID.</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Descrição</label>
                                        <input 
                                            type="text" 
                                            value={boardDescription}
                                            onChange={(e) => setBoardDescription(e.target.value)}
                                            placeholder="Breve descrição do propósito deste board"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div className="pt-4 border-t border-slate-800">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-sm font-medium text-slate-300">Etapas do Kanban</h4>
                                            <button 
                                                onClick={() => setColumns([...columns, { id: `col-${Date.now()}`, title: 'Nova Etapa', color: '#64748b', type: 'open' }])}
                                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                            >
                                                <Plus className="w-3 h-3" /> Adicionar etapa
                                            </button>
                                        </div>
                                        
                                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                                            {columns.map((col, idx) => (
                                                <div key={col.id} className="p-3 bg-slate-800 rounded-lg border border-slate-700 flex items-center gap-3">
                                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: col.color }}></div>
                                                    <input 
                                                        type="text" 
                                                        value={col.title}
                                                        onChange={(e) => {
                                                            const newCols = [...columns];
                                                            newCols[idx].title = e.target.value;
                                                            setColumns(newCols);
                                                        }}
                                                        className="bg-transparent text-white text-sm focus:outline-none flex-1"
                                                    />
                                                    <button 
                                                        onClick={() => setColumns(columns.filter(c => c.id !== col.id))}
                                                        className="text-slate-500 hover:text-red-400"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-slate-800 flex justify-end gap-3">
                                    <button 
                                        onClick={onClose}
                                        className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        onClick={handleCreate}
                                        disabled={!boardName}
                                        className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Criar Board
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default CreateBoardModal;
