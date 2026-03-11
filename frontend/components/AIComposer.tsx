import { safeError } from '@/src/utils/logger';
import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, Copy, Save, X, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateEmailSuggestion } from '../api';
import { Lead, Tone, EmailDraft } from '../types';

interface AIComposerProps {
    lead: Lead;
    showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
    onSaveDraft: (draftData: { objective: string; tones: Tone[]; subject: string; body: string; }) => void;
    onSendEmail: (email: { subject: string; body: string; }) => void;
    initialState: Partial<EmailDraft> | null;
    onStateReset: () => void;
}

const allTones: Tone[] = ['Amigável', 'Formal', 'Urgente', 'Persuasivo', 'Profissional', 'Entusiástico', 'Educacional'];


const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; label: string }> = ({ checked, onChange, label }) => (
    <div className="flex items-center gap-2">
        <button onClick={() => onChange(!checked)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-violet-600' : 'bg-zinc-600'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}/>
        </button>
        <span className="text-sm text-zinc-300">{label}</span>
    </div>
);


const AIComposer: React.FC<AIComposerProps> = ({ lead, showNotification, onSaveDraft, onSendEmail, initialState, onStateReset }) => {
    const [objective, setObjective] = useState('');
    const [tones, setTones] = useState<Tone[]>(['Amigável']);
    const [includeLeadInfo, setIncludeLeadInfo] = useState(true);
    const [generatedEmail, setGeneratedEmail] = useState<{ subject: string; body: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDraftLoaded, setIsDraftLoaded] = useState(false);

    useEffect(() => {
        if (initialState) {
            setObjective(initialState.objective || '');
            setTones(initialState.tones || ['Amigável']);
            if (initialState.subject && initialState.body) {
                setGeneratedEmail({ subject: initialState.subject, body: initialState.body });
            } else {
                setGeneratedEmail(null);
            }
            setIsDraftLoaded(true);
        }
    }, [initialState]);
    
    const handleClearDraft = () => {
        setObjective('');
        setTones(['Amigável']);
        setGeneratedEmail(null);
        setIsDraftLoaded(false);
        onStateReset();
    };


    const handleToneToggle = (toneToToggle: Tone) => {
        setTones(prevTones => {
            const isSelected = prevTones.includes(toneToToggle);
            if (isSelected) {
                // Prevent deselecting the last tone
                if (prevTones.length === 1) {
                    showNotification('Pelo menos um tom deve ser selecionado.', 'info');
                    return prevTones;
                }
                return prevTones.filter(t => t !== toneToToggle);
            } else {
                return [...prevTones, toneToToggle];
            }
        });
    };

    const handleGenerateEmail = async () => {
        if (!objective.trim()) {
            showNotification('Por favor, descreva o objetivo do e-mail.', 'error');
            return;
        }
        if (tones.length === 0) {
            showNotification('Por favor, selecione pelo menos um tom.', 'error');
            return;
        }

        setIsLoading(true);
        setGeneratedEmail(null);

        try {
            const jsonResponse = await generateEmailSuggestion(objective, tones, includeLeadInfo, lead);
            setGeneratedEmail(jsonResponse);
        } catch (error) {
            safeError("Error generating email:", error);
            showNotification('Falha ao gerar o e-mail. Verifique a configuração da sua chave de API ou tente novamente.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        if (!generatedEmail) return;
        const fullEmail = `Assunto: ${generatedEmail.subject}\n\n${generatedEmail.body}`;
        navigator.clipboard.writeText(fullEmail);
        showNotification('Email copiado para a área de transferência!', 'success');
    };

    const handleSave = () => {
        if (!generatedEmail) return;
        onSaveDraft({
            objective,
            tones,
            subject: generatedEmail.subject,
            body: generatedEmail.body,
        });
    };

    const handleSend = () => {
        if (!generatedEmail) return;
        onSendEmail(generatedEmail);
    };

    return (
        <div className="space-y-6 p-1">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-400" />
                <span>Compositor de E-mail com IA</span>
            </h3>
            
            <AnimatePresence>
                {isDraftLoaded && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-violet-900/40 border border-violet-700/50 rounded-lg p-3 flex justify-between items-center text-sm"
                    >
                        <p className="text-violet-300">Você está editando um rascunho.</p>
                        <button onClick={handleClearDraft} className="flex items-center gap-1.5 text-violet-300 hover:text-white font-semibold">
                            <X className="w-4 h-4" />
                            <span>Limpar</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="space-y-4">
                {/* Objetivo */}
                <div>
                    <label htmlFor="objective" className="block text-sm font-medium text-zinc-300 mb-2">Objetivo do E-mail</label>
                    <textarea 
                        id="objective"
                        value={objective}
                        onChange={(e) => setObjective(e.target.value)}
                        placeholder="Ex: Fazer follow-up e agendar uma demonstração..."
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        rows={3}
                    />
                </div>

                {/* Tom */}
                <div>
                     <label className="block text-sm font-medium text-zinc-300 mb-2">Tom</label>
                     <div className="flex flex-wrap gap-2">
                        {allTones.map(t => (
                            <button 
                                key={t}
                                onClick={() => handleToneToggle(t)}
                                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${tones.includes(t) ? 'bg-violet-600 border-violet-500 text-white' : 'bg-zinc-700 border-zinc-600 text-zinc-300 hover:bg-zinc-600'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                <ToggleSwitch 
                    checked={includeLeadInfo} 
                    onChange={setIncludeLeadInfo}
                    label="Incluir Informações do Lead"
                />

                <button 
                    onClick={handleGenerateEmail}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-blue-500 text-white px-4 py-2 rounded-md text-sm font-semibold hover:shadow-[0_0_18px_rgba(29,161,242,0.45)] hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    <span>{isLoading ? 'Gerando...' : 'Gerar Email'}</span>
                </button>
            </div>

            <AnimatePresence>
            {generatedEmail && (
                <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 border-t border-zinc-700 pt-6"
                >
                    <div className="flex justify-between items-center">
                        <h4 className="font-semibold text-white">Resultado Gerado</h4>
                        <div className="flex items-center gap-4">
                            <button onClick={handleSave} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
                                <Save className="w-4 h-4" />
                                <span>Salvar</span>
                            </button>
                            <button onClick={handleCopy} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
                                <Copy className="w-4 h-4" />
                                <span>Copiar</span>
                            </button>
                        </div>
                    </div>
                    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 space-y-3 text-sm">
                        <p><strong className="text-zinc-400">Assunto:</strong> <span className="text-white">{generatedEmail.subject}</span></p>
                        <div className="border-t border-zinc-700 my-2"></div>
                        <p className="text-white whitespace-pre-wrap">{generatedEmail.body}</p>
                    </div>
                    <button 
                        onClick={handleSend}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-emerald-700 transition-colors"
                    >
                        <Send className="w-4 h-4" />
                        <span>Enviar E-mail</span>
                    </button>
                </motion.div>
            )}
            </AnimatePresence>

        </div>
    );
};

export default AIComposer;