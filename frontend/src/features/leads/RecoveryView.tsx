import React, { useState, useMemo, useEffect } from 'react';
import { Lead, Id } from '@/types';
import { RefreshCw, User, Calendar, MessageCircle, Download, Trash2, ChevronLeft, ChevronRight, Phone } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import FlatCard from '@/components/ui/FlatCard';
import { useAuth } from '@/src/features/auth/AuthContext';
import { useEncerrados, ENCERRADOS_PAGE_SIZE } from '@/src/hooks/useEncerrados';

interface RecoveryViewProps {
    leads: Lead[];
    onReactivateLead: (leadId: Id) => void;
    onExportPDF: (leads: Lead[]) => void;
    onDeleteLead: (leadId: Id) => void;
    onLeadClick: (lead: Lead) => void;
}

const RecoveryView: React.FC<RecoveryViewProps> = ({ leads, onReactivateLead, onExportPDF, onDeleteLead, onLeadClick }) => {
    const [dateFilter, setDateFilter] = useState({
        start: '',
        end: ''
    });
    const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
    const [recoveryPage, setRecoveryPage] = useState(1);
    const [encerradosPage, setEncerradosPage] = useState(1);

    const { companyId } = useAuth();
    const { encerrados, total: encerradosTotal, loading: encerradosLoading } = useEncerrados(companyId, encerradosPage);

    const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

    // Reset recovery page when date filter changes
    useEffect(() => { setRecoveryPage(1); }, [dateFilter]);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setDateFilter(prev => ({ ...prev, [name]: value }));
    };

    const filteredLeads = useMemo(() => {
        if (!dateFilter.start && !dateFilter.end) {
            return leads;
        }
        return leads.filter(lead => {
            if (!lead.reactivationDate) return false;
            const reactivationDate = new Date(lead.reactivationDate);
            const startDate = dateFilter.start ? new Date(dateFilter.start) : null;
            const endDate = dateFilter.end ? new Date(dateFilter.end) : null;
            
            if (startDate && reactivationDate < startDate) return false;
            if (endDate) {
                // Include the whole day
                const endOfDay = new Date(endDate);
                endOfDay.setHours(23, 59, 59, 999);
                if (reactivationDate > endOfDay) return false;
            }
            return true;
        });
    }, [leads, dateFilter]);
    
    const sortedLeads = [...filteredLeads].sort((a, b) =>
        new Date(a.reactivationDate || 0).getTime() - new Date(b.reactivationDate || 0).getTime()
    );

    const RECOVERY_PAGE_SIZE = 4;
    const recoveryTotalPages = Math.ceil(sortedLeads.length / RECOVERY_PAGE_SIZE);
    const paginatedRecoveryLeads = sortedLeads.slice(
        (recoveryPage - 1) * RECOVERY_PAGE_SIZE,
        recoveryPage * RECOVERY_PAGE_SIZE
    );
    const encerradosTotalPages = Math.ceil(encerradosTotal / ENCERRADOS_PAGE_SIZE);

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' });
    };

    const handleExportCSV = () => {
        const headers = ['Nome', 'Empresa', 'Motivo da Perda', 'Data de Reativação'];
        const rows = sortedLeads.map(lead => [
            `"${lead.name.replace(/"/g, '""')}"`,
            `"${lead.company.replace(/"/g, '""')}"`,
            `"${(lead.lostReason || '').replace(/"/g, '""')}"`,
            formatDate(lead.reactivationDate)
        ].join(','));
        const csvString = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `recuperacao_leads_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleConfirmDelete = () => {
        if (leadToDelete) {
            onDeleteLead(leadToDelete.id);
            setLeadToDelete(null);
        }
    };

    return (
        <>
            <div className="flex flex-col gap-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">
  Recuperação de Leads
</h1>
<p className="text-slate-400 mt-1">
  Leads perdidos com agendamento para reativação.
</p>
                    </div>
                     <div className="flex items-center gap-2 self-start md:self-center">
                        <div className="flex items-center gap-2">
                            <input type="date" name="start" value={dateFilter.start} onChange={handleDateChange} className="bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-white focus:ring-violet-500 h-[36px]" />
                            <span className="text-slate-500">-</span>
                            <input type="date" name="end" value={dateFilter.end} onChange={handleDateChange} className="bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-white focus:ring-violet-500 h-[36px]" />
                        </div>
                        <button onClick={handleExportCSV} className="flex items-center gap-2 text-sm text-slate-300 bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md h-[36px]">
                            <Download className="w-4 h-4" /><span>CSV</span>
                        </button>
                        <button onClick={() => onExportPDF(sortedLeads)} className="flex items-center gap-2 text-sm text-slate-300 bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md h-[36px]">
                            <Download className="w-4 h-4" /><span>PDF</span>
                        </button>
                    </div>
                </div>

                <FlatCard className="p-0">
                    {sortedLeads.length > 0 ? (
                        <>
                        <ul className="divide-y divide-slate-800">
                            {paginatedRecoveryLeads.map(lead => (
                                <li 
                                    key={lead.id} 
                                    onClick={() => onLeadClick(lead)}
                                    className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-slate-800/50 cursor-pointer transition-colors"
                                >
                                    <div className="flex-1">
                                        <p className="font-semibold text-white">{lead.name}</p>
                                        <p className="text-sm text-slate-400">{lead.company}</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-400">
                                        <div className="flex items-center gap-2" title="Motivo da Perda">
                                            <MessageCircle className="w-4 h-4 text-slate-500" />
                                            <span>{lead.lostReason}</span>
                                        </div>
                                        <div className="flex items-center gap-2" title="Data para Reativar">
                                            <Calendar className="w-4 h-4 text-slate-500" />
                                            <span>{formatDate(lead.reactivationDate)}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 self-start sm:self-center">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onReactivateLead(lead.id);
                                            }}
                                            className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-500 text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:shadow-[0_0_18px_rgba(29,161,242,0.45)] hover:-translate-y-0.5 transition-all duration-200"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                            <span>Reativar</span>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setLeadToDelete(lead);
                                            }}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-700/50 rounded-md"
                                            title="Excluir lead permanentemente"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        {recoveryTotalPages > 1 && (
                            <div className="flex items-center justify-center gap-1 p-3 border-t border-slate-800">
                                <button onClick={() => setRecoveryPage(p => Math.max(1, p - 1))} disabled={recoveryPage === 1} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                {Array.from({ length: recoveryTotalPages }, (_, i) => i + 1).map(n => (
                                    <button key={n} onClick={() => setRecoveryPage(n)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${n === recoveryPage ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>{n}</button>
                                ))}
                                <button onClick={() => setRecoveryPage(p => Math.min(recoveryTotalPages, p + 1))} disabled={recoveryPage === recoveryTotalPages} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                        </>
                    ) : (
                        <div className="text-center py-16">
                            <User className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                            <h3 className="font-semibold text-white">Nenhum lead para reativar</h3>
                            <p className="text-sm text-slate-500 mt-1">Nenhum lead perdido foi agendado para reativação neste período.</p>
                        </div>
                    )}
                </FlatCard>
            </div>

            {/* ===== SEÇÃO ENCERRADOS ===== */}
            <div className="flex flex-col gap-6 mt-10">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Encerrados</h2>
                    <p className="text-slate-400 mt-1">Leads finalizados que podem receber follow-up futuro.</p>
                </div>

                <FlatCard className="p-0">
                    {encerradosLoading ? (
                        <div className="text-center py-16">
                            <p className="text-sm text-slate-500">Carregando...</p>
                        </div>
                    ) : encerrados.length > 0 ? (
                        <>
                        <ul className="divide-y divide-slate-800">
                            {encerrados.map(lead => (
                                <li
                                    key={lead.id}
                                    onClick={() => onLeadClick(lead)}
                                    className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-slate-800/50 cursor-pointer transition-colors"
                                >
                                    <div className="flex-1">
                                        <p className="font-semibold text-white">{lead.name}</p>
                                        <p className="text-sm text-slate-400">{lead.company || '—'}</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-400">
                                        {lead.lostReason && (
                                            <div className="flex items-center gap-2" title="Motivo do Encerramento">
                                                <MessageCircle className="w-4 h-4 text-slate-500" />
                                                <span>{lead.lostReason}</span>
                                            </div>
                                        )}
                                        {lead.lastActivityTimestamp && (
                                            <div className="flex items-center gap-2" title="Encerrado em">
                                                <Calendar className="w-4 h-4 text-slate-500" />
                                                <span>{formatDate(lead.lastActivityTimestamp)}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 self-start sm:self-center">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); }}
                                            className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-500 text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:shadow-[0_0_18px_rgba(29,161,242,0.45)] hover:-translate-y-0.5 transition-all duration-200"
                                        >
                                            <Phone className="w-4 h-4" />
                                            <span>Follow-up</span>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setLeadToDelete(lead);
                                            }}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-700/50 rounded-md transition-colors"
                                            title="Excluir lead permanentemente"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        {encerradosTotalPages > 1 && (
                            <div className="flex items-center justify-center gap-1 p-3 border-t border-slate-800">
                                <button onClick={() => setEncerradosPage(p => Math.max(1, p - 1))} disabled={encerradosPage === 1} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                {Array.from({ length: encerradosTotalPages }, (_, i) => i + 1).map(n => (
                                    <button key={n} onClick={() => setEncerradosPage(n)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${n === encerradosPage ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>{n}</button>
                                ))}
                                <button onClick={() => setEncerradosPage(p => Math.min(encerradosTotalPages, p + 1))} disabled={encerradosPage === encerradosTotalPages} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                        </>
                    ) : (
                        <div className="text-center py-16">
                            <User className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                            <h3 className="font-semibold text-white">Nenhum lead encerrado</h3>
                            <p className="text-sm text-slate-500 mt-1">Leads marcados como encerrados aparecerão aqui.</p>
                        </div>
                    )}
                </FlatCard>
            </div>

            <AnimatePresence>
                {leadToDelete && (
                    <ConfirmDeleteModal
                        onClose={() => setLeadToDelete(null)}
                        onConfirm={handleConfirmDelete}
                        title={`Excluir ${leadToDelete.name}?`}
                        message="Tem certeza que deseja excluir este lead permanentemente? Esta ação não pode ser desfeita."
                        confirmText="Excluir"
                        confirmVariant="danger"
                    />
                )}
            </AnimatePresence>
        </>
    );
};

export default RecoveryView;
