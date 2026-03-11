import { safeError } from '@/src/utils/logger';
import React, { useMemo, useState, useEffect } from 'react';
import { ChevronLeft, Download, Users, UserCheck, UserX, Goal, Sparkles, Loader2, Save, FileText, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateGroupAnalysis } from '@/api';
import type { Lead, Id, GroupInfo, UpdateLeadData, Group, GroupAnalysis, CreateGroupAnalysisData, UpdateGroupAnalysisData } from '@/types';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import { GlassCard } from '@/src/shared/components/GlassCard';
import { GlassSection } from '@/src/shared/components/GlassSection';
import FlatCard from '@/components/ui/FlatCard';

interface GroupsViewProps {
    group: Group;
    leads: Lead[];
    analysis: GroupAnalysis | null;
    onUpdateLead: (leadId: Id, updates: UpdateLeadData) => void;
    onBack: () => void;
    onCreateOrUpdateAnalysis: (data: CreateGroupAnalysisData | UpdateGroupAnalysisData, analysisId?: Id) => void;
    onDeleteAnalysis: (analysisId: Id) => void;
    showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

const CheckboxCell: React.FC<{ checked: boolean; onChange: (checked: boolean) => void }> = ({ checked, onChange }) => (
    <div className="flex items-center justify-center">
        <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="h-5 w-5 rounded bg-slate-700 border-slate-600 text-violet-600 focus:ring-violet-500 focus:ring-offset-slate-800"
        />
    </div>
);

const KpiCard: React.FC<{ icon: React.ElementType; title: string; value: string; colorClass: string; }> = ({ icon: Icon, title, value, colorClass }) => (
    <GlassSection className="flex items-center gap-4 transition-all duration-200 ease-in-out hover:bg-slate-700/50 hover:-translate-y-1">
        <div className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center ${colorClass.replace('text-', 'bg-')}/20`}>
            <Icon className={`w-5 h-5 ${colorClass}`} />
        </div>
        <div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-sm text-slate-400">{title}</p>
        </div>
    </GlassSection>
);

// A simple sanitizer to prevent XSS. For production, a robust library like DOMPurify is recommended.
const sanitizeHTML = (htmlString: string): string => {
    let sanitized = htmlString;
    // Remove script tags and their content
    sanitized = sanitized.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    // Remove on* event attributes. This covers onload, onerror, onclick, etc.
    sanitized = sanitized.replace(/ on\w+=(?:"[^"]*"|'[^']*'|[^>\s]+)/gi, '');
    // Remove javascript: from href/src
    sanitized = sanitized.replace(/(href|src)=["']?javascript:/gi, '$1="about:blank"');
    return sanitized;
};


const GroupsView: React.FC<GroupsViewProps> = ({ group, leads, analysis, onUpdateLead, onBack, onCreateOrUpdateAnalysis, onDeleteAnalysis, showNotification }) => {
    const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
    const [leadToRemove, setLeadToRemove] = useState<Lead | null>(null);
    
    type CurrentAnalysis = GroupAnalysis | { content: string; status: 'new' };
    const [currentAnalysis, setCurrentAnalysis] = useState<CurrentAnalysis | null>(null);
    const [isAnalysisMinimized, setIsAnalysisMinimized] = useState(false);

    useEffect(() => {
        setCurrentAnalysis(analysis);
    }, [analysis]);
    
    const handleGroupInfoChange = (leadId: Id, field: keyof GroupInfo, value: any) => {
        const lead = leads.find(l => l.id === leadId);
        if (!lead) return;

        const currentGroupInfo: GroupInfo = lead.groupInfo || {
            hasJoined: false,
            isStillInGroup: false,
            hasOnboarded: false,
            churned: false,
            groupId: group.id,
        };

        let updatedGroupInfo: GroupInfo = { ...currentGroupInfo, [field]: value };

        // Add logic for dependencies between fields
        if (field === 'isStillInGroup') {
            if (value === true) { // If isStillInGroup is checked
                updatedGroupInfo.churned = false;
                updatedGroupInfo.exitDate = undefined;
            } else { // If isStillInGroup is unchecked
                updatedGroupInfo.churned = true;
                if (!updatedGroupInfo.exitDate) {
                    updatedGroupInfo.exitDate = new Date().toISOString();
                }
            }
        } else if (field === 'churned') {
            if (value === true) { // If churned is checked
                updatedGroupInfo.isStillInGroup = false;
                if (!updatedGroupInfo.exitDate) {
                    updatedGroupInfo.exitDate = new Date().toISOString();
                }
            } else { // If churned is unchecked
                updatedGroupInfo.isStillInGroup = true;
                updatedGroupInfo.exitDate = undefined;
            }
        } else if (field === 'hasJoined') {
            if (value === false) { // If they never joined, reset everything else
                updatedGroupInfo = {
                    hasJoined: false,
                    isStillInGroup: false,
                    hasOnboarded: false,
                    onboardingCallDate: undefined,
                    churned: false,
                    exitDate: undefined,
                    groupId: group.id
                };
            } else if (!currentGroupInfo.hasJoined) { // If they just joined
                updatedGroupInfo.isStillInGroup = true;
                updatedGroupInfo.churned = false;
                updatedGroupInfo.exitDate = undefined;
            }
        }
        
        onUpdateLead(leadId, { groupInfo: updatedGroupInfo });
    };

    const formatDateForInput = (isoDate?: string) => {
        if (!isoDate) return '';
        try {
            return new Date(isoDate).toISOString().split('T')[0];
        } catch (e) {
            return '';
        }
    };

    const groupMetrics = useMemo(() => {
        const totalJoined = leads.filter(l => l.groupInfo?.hasJoined).length;
        const currentMembers = leads.filter(l => l.groupInfo?.isStillInGroup).length;
        const totalOnboarded = leads.filter(l => l.groupInfo?.hasOnboarded).length;
        const totalChurned = leads.filter(l => l.groupInfo?.churned).length;

        const onboardingRate = totalJoined > 0 ? (totalOnboarded / totalJoined) * 100 : 0;
        const churnRate = totalJoined > 0 ? (totalChurned / totalJoined) * 100 : 0;

        return { currentMembers, onboardingRate, churnRate, totalJoined, totalOnboarded, totalChurned };
    }, [leads]);

    const handleGenerateAnalysis = async () => {
        setIsLoadingAnalysis(true);
        setCurrentAnalysis(null);
        
        try {
            const analysisText = await generateGroupAnalysis(group, groupMetrics, leads);
            setCurrentAnalysis({ content: analysisText, status: 'new' });
            setIsAnalysisMinimized(false);
        } catch(e) {
            safeError(e);
            setCurrentAnalysis({ content: "Ocorreu um erro ao gerar a análise. Verifique se a chave de API do Gemini está configurada corretamente.", status: 'new' });
            showNotification('Falha ao gerar análise. Verifique a configuração da sua chave de API.', 'error');
        } finally {
            setIsLoadingAnalysis(false);
        }
    };

    const handleSaveAnalysis = (status: 'saved' | 'draft') => {
        if (!currentAnalysis) return;
        const analysisId = 'id' in currentAnalysis ? currentAnalysis.id : undefined;
        
        const data = {
            groupId: group.id,
            content: currentAnalysis.content,
            status: status,
        };

        onCreateOrUpdateAnalysis(data, analysisId);
    };

    const handleDiscardAnalysis = () => {
        if (currentAnalysis && 'id' in currentAnalysis) {
            onDeleteAnalysis(currentAnalysis.id);
        }
        setCurrentAnalysis(null);
    };


    const handleExportCSV = () => {
        const headers = [
            'Nome', 'Empresa', 'Email', 'Telefone', 
            'Entrou no Grupo', 'Permanece no Grupo', 'Fechado', 
            'Data Fechamento', 'Churn', 'Data de Saída'
        ];

        const escapeCsvCell = (cellData: any): string => {
            if (cellData == null) return '';
            const stringData = String(cellData);
            if (stringData.includes(',') || stringData.includes('"') || stringData.includes('\n')) {
                return `"${stringData.replace(/"/g, '""')}"`;
            }
            return stringData;
        };

        const rows = leads.map(lead => {
            // FIX: Initialize groupInfo with default values to prevent accessing properties on an empty object.
            const groupInfo = lead.groupInfo || {
                hasJoined: false,
                isStillInGroup: false,
                hasOnboarded: false,
                onboardingCallDate: undefined,
                churned: false,
                exitDate: undefined,
            };
            const rowData = [
                escapeCsvCell(lead.name),
                escapeCsvCell(lead.company),
                escapeCsvCell(lead.email || ''),
                escapeCsvCell(lead.phone || ''),
                groupInfo.hasJoined ? 'Sim' : 'Não',
                groupInfo.isStillInGroup ? 'Sim' : 'Não',
                groupInfo.hasOnboarded ? 'Sim' : 'Não',
                groupInfo.onboardingCallDate ? new Date(groupInfo.onboardingCallDate).toLocaleDateString('pt-BR') : '',
                groupInfo.churned ? 'Sim' : 'Não',
                groupInfo.exitDate ? new Date(groupInfo.exitDate).toLocaleDateString('pt-BR') : '',
            ];
            return rowData.join(',');
        });

        const csvString = '\uFEFF' + [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        const today = new Date().toISOString().split('T')[0];
        const fileName = `membros_grupo_${group.name.replace(/\s+/g, '_')}_${today}.csv`;

        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleConfirmRemove = () => {
        if (!leadToRemove) return;

        const lead = leads.find(l => l.id === leadToRemove.id);
        if (lead && lead.groupInfo) {
            const updatedGroupInfo: GroupInfo = {
                ...lead.groupInfo,
                isStillInGroup: false,
                churned: true,
                exitDate: new Date().toISOString(),
            };
            onUpdateLead(leadToRemove.id, { groupInfo: updatedGroupInfo });
        }
        
        setLeadToRemove(null);
    };


    return (
        <>
            <div className="flex flex-col gap-6 h-full">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 rounded-full text-slate-400 hover:bg-slate-800 transition-colors">
                            <ChevronLeft className="w-6 h-6 text-blue-500/70 hover:text-blue-500" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-white">Membros do Grupo: {group.name}</h1>
                            <p className="text-slate-400">{group.description || 'Gerencie os membros deste grupo.'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleExportCSV}
                            className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-slate-600 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            <span>Exportar CSV</span>
                        </button>
                        <button 
                            onClick={handleGenerateAnalysis}
                            disabled={isLoadingAnalysis}
                            className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-500 text-white px-4 py-2 rounded-md text-sm font-semibold hover:shadow-[0_0_18px_rgba(29,161,242,0.45)] hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isLoadingAnalysis ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Sparkles className="w-4 h-4" />
                            )}
                            <span>{isLoadingAnalysis ? 'Analisando...' : 'Gerar Análise com IA'}</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard icon={Users} title="Membros Atuais" value={groupMetrics.currentMembers.toString()} colorClass="text-violet-400" />
                    <KpiCard icon={UserCheck} title="Fechado" value={`${groupMetrics.onboardingRate.toFixed(0)}%`} colorClass="text-green-400" />
                    <KpiCard icon={UserX} title="Churn" value={`${groupMetrics.churnRate.toFixed(1)}%`} colorClass="text-red-400" />
                    {group.memberGoal ? (
                        <KpiCard icon={Goal} title="Meta" value={`${groupMetrics.currentMembers} / ${group.memberGoal}`} colorClass="text-blue-400" />
                    ) : (
                        <GlassSection className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center bg-slate-700/50">
                                <Goal className="w-5 h-5 text-slate-500" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Nenhuma meta definida</p>
                            </div>
                        </GlassSection>
                    )}
                </div>
                
                <AnimatePresence>
                    {(isLoadingAnalysis || currentAnalysis) && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <GlassCard className="p-6">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-violet-400" />
                                        <span>
                                            Análise da IA
                                            {currentAnalysis && currentAnalysis.status !== 'new' && (
                                                <span className="text-xs font-normal text-slate-400 ml-2 capitalize">({currentAnalysis.status === 'draft' ? 'Rascunho' : 'Salvo'})</span>
                                            )}
                                        </span>
                                    </h2>
                                    {currentAnalysis && !isLoadingAnalysis && (
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => handleSaveAnalysis('saved')} title="Salvar" className="p-2 text-slate-400 hover:text-white rounded-md hover:bg-slate-700/50"><Save className="w-4 h-4" /></button>
                                            <button onClick={() => handleSaveAnalysis('draft')} title="Salvar como Rascunho" className="p-2 text-slate-400 hover:text-white rounded-md hover:bg-slate-700/50"><FileText className="w-4 h-4" /></button>
                                            <button onClick={handleDiscardAnalysis} title="Descartar" className="p-2 text-slate-400 hover:text-red-500 rounded-md hover:bg-slate-700/50"><Trash2 className="w-4 h-4" /></button>
                                            <div className="w-px h-5 bg-slate-700 mx-1" />
                                            <button onClick={() => setIsAnalysisMinimized(p => !p)} title={isAnalysisMinimized ? 'Expandir' : 'Minimizar'} className="p-2 text-slate-400 hover:text-white rounded-md hover:bg-slate-700/50">
                                                {isAnalysisMinimized ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <AnimatePresence>
                                    {!isAnalysisMinimized && (
                                        <motion.div
                                            key="analysis-content"
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="pt-4">
                                                {isLoadingAnalysis ? (
                                                    <div className="flex items-center justify-center py-10">
                                                        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                                                    </div>
                                                ) : (
                                                    <div className="prose prose-invert prose-sm max-w-none text-slate-300 whitespace-pre-wrap"
                                                        dangerouslySetInnerHTML={{ __html: sanitizeHTML(currentAnalysis ? currentAnalysis.content.replace(/## (.*?)\n/g, '<h3 class="text-white font-semibold mt-4 mb-2">$1</h3>').replace(/\* (.*?)\n/g, '<li class="ml-4">$1</li>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') : '') }}
                                                    />
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </GlassCard>
                        </motion.div>
                    )}
                </AnimatePresence>
                
                <FlatCard className="overflow-hidden flex-1 flex flex-col p-0">
                    <div className="overflow-auto h-full">
                        <table className="min-w-full divide-y divide-slate-700">
                            <thead className="bg-slate-900/50 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-1/5">Lead</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">Entrou</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">Permanece</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">Fechado</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Data Fechamento</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">Churn</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Data de Saída</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {leads.length > 0 ? leads.map(lead => {
                                    const groupInfo = lead.groupInfo || {
                                        hasJoined: false,
                                        isStillInGroup: false,
                                        hasOnboarded: false,
                                        churned: false,
                                        groupId: group.id
                                    };
                                    return (
                                    <tr key={lead.id} className="hover:bg-slate-700/50 transition-colors duration-150">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="text-sm font-medium text-white">{lead.name}</div>
                                            <div className="text-sm text-slate-400">{lead.company}</div>
                                        </td>
                                        <td className="px-4 py-3 text-center"><CheckboxCell checked={!!groupInfo.hasJoined} onChange={val => handleGroupInfoChange(lead.id, 'hasJoined', val)} /></td>
                                        <td className="px-4 py-3 text-center"><CheckboxCell checked={!!groupInfo.isStillInGroup} onChange={val => handleGroupInfoChange(lead.id, 'isStillInGroup', val)} /></td>
                                        <td className="px-4 py-3 text-center"><CheckboxCell checked={!!groupInfo.hasOnboarded} onChange={val => handleGroupInfoChange(lead.id, 'hasOnboarded', val)} /></td>
                                        <td className="px-4 py-3">
                                            <input type="date" value={formatDateForInput(groupInfo.onboardingCallDate)} onChange={e => handleGroupInfoChange(lead.id, 'onboardingCallDate', e.target.valueAsDate?.toISOString())} className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-violet-500" />
                                        </td>
                                        <td className="px-4 py-3 text-center"><CheckboxCell checked={!!groupInfo.churned} onChange={val => handleGroupInfoChange(lead.id, 'churned', val)} /></td>
                                        <td className="px-4 py-3">
                                            <input type="date" value={formatDateForInput(groupInfo.exitDate)} onChange={e => handleGroupInfoChange(lead.id, 'exitDate', e.target.valueAsDate?.toISOString())} className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-violet-500" />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button onClick={() => setLeadToRemove(lead)} className="p-2 text-slate-400 hover:text-red-500 rounded-md hover:bg-slate-700/50" title={`Remover ${lead.name} do grupo`}>
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                )}) : (
                                    <tr>
                                        <td colSpan={8} className="text-center py-10 text-slate-500">
                                            Nenhum membro encontrado neste grupo.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </FlatCard>
            </div>
            <AnimatePresence>
                {leadToRemove && (
                    <ConfirmDeleteModal
                        onClose={() => setLeadToRemove(null)}
                        onConfirm={handleConfirmRemove}
                        title={`Remover ${leadToRemove.name}?`}
                        message={`Tem certeza que deseja remover ${leadToRemove.name} do grupo "${group.name}"? Esta ação marcará o lead como churn e inativo no grupo.`}
                        confirmText="Remover"
                        confirmVariant="danger"
                    />
                )}
            </AnimatePresence>
        </>
    );
};

export default GroupsView;
