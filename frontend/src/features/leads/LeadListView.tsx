import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Lead, ColumnData, Tag, ListDisplaySettings, User, Board } from '@/types';
import { ChevronUp, ChevronDown, ChevronsUpDown, Pencil, Trash2 } from 'lucide-react';
import LeadListHeader from './LeadListHeader';
import FlatCard from '@/components/ui/FlatCard';
import { getLeadComputedStatus, STATUS_BADGE, STATUS_DOT_COLOR } from '@/src/lib/leadStatus';
import { useAuth } from '@/src/features/auth/AuthContext';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';

function getActivityLabel(type?: string | null): string {
    switch (type) {
        case 'move_stage':  return 'Movido no pipeline';
        case 'email':       return 'Email enviado';
        case 'call':        return 'Ligação';
        case 'note':        return 'Nota adicionada';
        case 'task':        return 'Tarefa criada';
        case 'created':     return 'Lead criado';
        case 'edited':      return 'Lead atualizado';
        case 'lost':        return 'Lead perdido';
        case 'reactivated': return 'Lead reativado';
        default:            return 'Atividade';
    }
}

function formatRelativeTime(ts: string | null | undefined): string {
    if (!ts) return 'Sem atividade';
    const diff = Date.now() - new Date(ts).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'agora há pouco';
    if (minutes < 60) return `há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `há ${hours} h`;
    const days = Math.floor(hours / 24);
    return `há ${days} dia${days !== 1 ? 's' : ''}`;
}

// ── Avatar helper — fixed blue to match platform accent ──────
const getAvatarColor = (_name: string) => 'bg-blue-600';

const TagPill: React.FC<{ tag: Tag }> = ({ tag }) => (
    <span 
        className="px-2 py-0.5 text-xs font-medium rounded-full text-white/90"
        style={{ backgroundColor: tag.color }}
    >
        {tag.name}
    </span>
);

type SortableKeys = keyof Lead | 'status';

interface LeadListViewProps {
    leads: Lead[];
    columns: ColumnData[];
    users: User[];
    boards: Board[];
    onLeadClick: (lead: Lead) => void;
    onEditLead: (lead: Lead) => void;
    onDeleteLead: (id: string) => void;
    viewType: 'Leads' | 'Clientes';
    listDisplaySettings: ListDisplaySettings;
    onUpdateListSettings: (newSettings: ListDisplaySettings) => void;
    allTags: Tag[];
    selectedTags: Tag[];
    onSelectedTagsChange: React.Dispatch<React.SetStateAction<Tag[]>>;
    statusFilter: 'all' | 'Ativo' | 'Perdido';
    onStatusFilterChange: (status: 'all' | 'Ativo' | 'Perdido') => void;
    onExportPDF: () => void;
    onOpenCreateLeadModal: () => void;
    onOpenCreateTaskModal: () => void;
}

const LeadListView: React.FC<LeadListViewProps> = ({
    leads,
    columns,
    users,
    boards,
    onLeadClick,
    onEditLead,
    onDeleteLead,
    viewType,
    listDisplaySettings,
    onUpdateListSettings,
    allTags,
    selectedTags,
    onSelectedTagsChange,
    statusFilter,
    onStatusFilterChange,
    onExportPDF,
    onOpenCreateLeadModal,
    onOpenCreateTaskModal
}) => {
    const { currentUserRole } = useAuth();
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' } | null>({ key: 'name', direction: 'ascending'});
    const [searchQuery, setSearchQuery] = useState('');
    const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
    const PAGE_SIZE = 8;
    const [currentPage, setCurrentPage] = useState(1);

    // Reset para página 1 ao mudar busca ou ordenação
    useEffect(() => { setCurrentPage(1); }, [searchQuery, sortConfig]);

    const currencyFormatter = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });

    const formatDate = (dateString: string | undefined) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
    }

    const columnMap = useMemo(() => {
        return columns.reduce((acc, col) => {
            acc[col.id] = col.title;
            return acc;
        }, {} as Record<string, string>);
    }, [columns]);

    // Maps column id → linked_lifecycle_stage type for computed status derivation
    const columnTypeMap = useMemo(() => {
        return columns.reduce((acc, col) => {
            acc[col.id] = col.type;
            return acc;
        }, {} as Record<string, ColumnData['type']>);
    }, [columns]);

    const sortedLeads = useMemo(() => {
        let sortableLeads = [...leads];
        if (sortConfig !== null) {
            sortableLeads.sort((a, b) => {
                let aValue: any;
                let bValue: any;

                if (sortConfig.key === 'status') {
                    aValue = columnMap[a.columnId] || '';
                    bValue = columnMap[b.columnId] || '';
                } else {
                    aValue = a[sortConfig.key as keyof Lead];
                    bValue = b[sortConfig.key as keyof Lead];
                }
                
                if (aValue == null) return 1;
                if (bValue == null) return -1;
                
                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            sortableLeads = sortableLeads.filter(l =>
                l.name?.toLowerCase().includes(q) ||
                l.email?.toLowerCase().includes(q)
            );
        }
        return sortableLeads;
    }, [leads, sortConfig, columnMap, searchQuery]);

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    // --- CSV EXPORT LOGIC ---
    const handleExportCSV = () => {
        const headers = ['Nome', 'Empresa'];
        if (listDisplaySettings.showStatus) headers.push('Status');
        if (listDisplaySettings.showValue) headers.push('Valor');
        if (listDisplaySettings.showEmail) headers.push('Email');
        if (listDisplaySettings.showPhone) headers.push('Telefone');
        if (listDisplaySettings.showTags) headers.push('Tags');
        if (listDisplaySettings.showCreatedAt) headers.push('Data de Criação');
        if (listDisplaySettings.showLastActivity) headers.push('Última Atividade');

        const escapeCsvCell = (cellData: any) => {
            if (cellData == null) return '';
            const stringData = String(cellData);
            if (stringData.includes(',') || stringData.includes('"') || stringData.includes('\n')) {
                return `"${stringData.replace(/"/g, '""')}"`;
            }
            return stringData;
        };

        const rows = sortedLeads.map(lead => {
            const rowData: (string | number)[] = [
                escapeCsvCell(lead.name),
                escapeCsvCell(lead.company)
            ];
            if (listDisplaySettings.showStatus) rowData.push(escapeCsvCell(columnMap[lead.columnId] || 'N/A'));
            if (listDisplaySettings.showValue) rowData.push(lead.value);
            if (listDisplaySettings.showEmail) rowData.push(escapeCsvCell(lead.email || ''));
            if (listDisplaySettings.showPhone) rowData.push(escapeCsvCell(lead.phone || ''));
            if (listDisplaySettings.showTags) rowData.push(escapeCsvCell(lead.tags.map(t => t.name).join(', ')));
            if (listDisplaySettings.showCreatedAt) rowData.push(escapeCsvCell(lead.createdAt ? new Date(lead.createdAt).toISOString().split('T')[0] : ''));
            if (listDisplaySettings.showLastActivity) rowData.push(escapeCsvCell(lead.lastActivityTimestamp ? `${getActivityLabel(lead.lastActivityType)} — ${formatRelativeTime(lead.lastActivityTimestamp)}` : 'Sem atividade'));
            return rowData.join(',');
        });

        const csvString = '\uFEFF' + [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        const today = new Date().toISOString().split('T')[0];
        const fileName = `${viewType.toLowerCase()}_export_${today}.csv`;

        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const totalPages = useMemo(() => Math.ceil(sortedLeads.length / PAGE_SIZE), [sortedLeads.length]);
    const paginatedLeads = useMemo(() =>
        sortedLeads.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [sortedLeads, currentPage]);

    // --- SELECTION LOGIC (após paginatedLeads) ---
    const toggleSelect = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };
    const isAllOnPageSelected = paginatedLeads.length > 0 && paginatedLeads.every(l => selectedIds.has(l.id as string));
    const toggleSelectAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (isAllOnPageSelected) {
                paginatedLeads.forEach(l => next.delete(l.id as string));
            } else {
                paginatedLeads.forEach(l => next.add(l.id as string));
            }
            return next;
        });
    };

    // --- VIRTUALIZATION LOGIC ---
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [virtualRange, setVirtualRange] = useState({ start: 0, end: 30 });
    const ROW_HEIGHT = 73; // Estimated height of a single row in pixels. Adjust if row styling changes.
    const OVERSCAN = 5;    // Number of items to render above and below the viewport for smoother scrolling.

    const onScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, clientHeight } = event.currentTarget;
        const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
        const endIndex = Math.min(
            paginatedLeads.length - 1,
            Math.ceil((scrollTop + clientHeight) / ROW_HEIGHT) + OVERSCAN
        );

        if (startIndex !== virtualRange.start || endIndex !== virtualRange.end) {
            setVirtualRange({ start: startIndex, end: endIndex });
        }
    }, [paginatedLeads.length, virtualRange.start, virtualRange.end]);

    const virtualLeads = useMemo(() => {
        return paginatedLeads.slice(virtualRange.start, virtualRange.end + 1);
    }, [paginatedLeads, virtualRange.start, virtualRange.end]);

    const topPaddingHeight = virtualRange.start * ROW_HEIGHT;
    const bottomPaddingHeight = Math.max(0, (paginatedLeads.length - (virtualRange.end + 1)) * ROW_HEIGHT);

    // checkbox + 5 blocks admin (identity / status+value / pipeline+owner / activity / actions)
    // checkbox + 4 blocks non-admin (no pipeline block)
    const numberOfColumns = currentUserRole === 'admin' ? 6 : 5;
    // --- END VIRTUALIZATION LOGIC ---
    
    const TableHeader: React.FC<{ sortKey: SortableKeys; label: string; className?: string }> = ({ sortKey, label, className }) => {
        const isActive = sortConfig?.key === sortKey;
        const isAscending = isActive && sortConfig?.direction === 'ascending';

        return (
            <th className={`px-4 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap ${className} ${isActive ? 'text-white' : 'text-slate-400'}`}>
                <button className="flex items-center gap-1 group" onClick={() => requestSort(sortKey)}>
                    {label}
                    <span className={isActive ? 'opacity-100' : 'opacity-50 group-hover:opacity-100 transition-opacity'}>
                        {isActive 
                            ? (isAscending ? <ChevronUp className="w-4 h-4 text-blue-400" /> : <ChevronDown className="w-4 h-4 text-blue-400" />)
                            : <ChevronsUpDown className="w-4 h-4 text-blue-400" />
                        }
                    </span>
                </button>
            </th>
        );
    };

    return (
        <div className="flex flex-col gap-4 h-full">
            <LeadListHeader
                viewType={viewType}
                listDisplaySettings={listDisplaySettings}
                onUpdateListSettings={onUpdateListSettings}
                allTags={allTags}
                selectedTags={selectedTags}
                onSelectedTagsChange={onSelectedTagsChange}
                statusFilter={statusFilter}
                onStatusFilterChange={onStatusFilterChange}
                onExportCSV={handleExportCSV}
                onExportPDF={onExportPDF}
                onOpenCreateLeadModal={onOpenCreateLeadModal}
                onOpenCreateTaskModal={onOpenCreateTaskModal}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
            />
            <FlatCard className="overflow-hidden flex-1 flex flex-col p-0">

                {/* ── Action bar — visível quando há seleção ────────── */}
                {selectedIds.size > 0 && (
                    <div className="px-4 py-2.5 bg-blue-600/10 border-b border-blue-500/20 flex items-center gap-4 flex-shrink-0">
                        <span className="text-sm text-blue-300 font-medium">
                            {selectedIds.size} contato{selectedIds.size !== 1 ? 's' : ''} selecionado{selectedIds.size !== 1 ? 's' : ''}
                        </span>
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="text-xs text-slate-400 hover:text-white transition-colors"
                        >
                            Limpar seleção
                        </button>
                        <button
                            onClick={() => setShowBulkDeleteModal(true)}
                            className="ml-auto flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-red-600/20 text-red-400 hover:bg-red-600/30 hover:text-red-300 border border-red-500/20 transition-colors"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Excluir selecionados
                        </button>
                    </div>
                )}

                {sortedLeads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64">
                        <h3 className="text-lg font-semibold text-slate-300">Nenhum {viewType === 'Clientes' ? 'cliente' : 'lead'} encontrado</h3>
                        <p className="text-slate-500 mt-1">Tente ajustar seus filtros ou adicione um novo lead!</p>
                    </div>
                ) : (
                    <div ref={scrollContainerRef} onScroll={onScroll} className="overflow-auto h-full">
                        <table className="min-w-full divide-y divide-slate-700" style={{ borderSpacing: 0 }}>
                            <thead className="bg-slate-900 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 w-10">
                                        <input
                                            type="checkbox"
                                            checked={isAllOnPageSelected}
                                            onChange={() => {}}
                                            onClick={toggleSelectAll}
                                            className="w-4 h-4 rounded accent-blue-500 cursor-pointer"
                                            title="Selecionar todos"
                                        />
                                    </th>
                                    <TableHeader sortKey="name" label="Lead" />
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 tracking-wide whitespace-nowrap">Status / Valor</th>
                                    {currentUserRole === 'admin' && (
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 tracking-wide whitespace-nowrap">Pipeline</th>
                                    )}
                                    <TableHeader sortKey="createdAt" label="Atividade" />
                                    <th className="px-4 py-3 w-20" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700 relative">
                                {topPaddingHeight > 0 && (
                                    <tr style={{ height: topPaddingHeight }}>
                                        <td colSpan={numberOfColumns} />
                                    </tr>
                                )}
                                {virtualLeads.map(lead => (
                                    <tr key={lead.id} onClick={() => onLeadClick(lead)} className="group hover:bg-slate-800/50 cursor-pointer transition-colors duration-150">

                                        {/* ── Checkbox ────────────────────────────────────── */}
                                        <td className="px-4 py-4 w-10 align-top" onClick={e => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(lead.id as string)}
                                                onChange={() => {}}
                                                onClick={e => toggleSelect(lead.id as string, e)}
                                                className="w-4 h-4 rounded accent-blue-500 cursor-pointer mt-0.5"
                                            />
                                        </td>

                                        {/* ── Bloco 1: Identidade ─────────────────────────── */}
                                        <td className="px-4 py-4 w-64">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white ${getAvatarColor(lead.name ?? '')}`}>
                                                    {(lead.name ?? '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-semibold text-white truncate leading-snug">{lead.name}</div>
                                                    <div className="text-xs text-slate-500 truncate leading-snug mt-0.5">{lead.email || lead.company || '—'}</div>
                                                    {listDisplaySettings.showPhone && lead.phone && (
                                                        <div className="text-xs text-slate-600 truncate leading-snug mt-0.5">{lead.phone}</div>
                                                    )}
                                                    {currentUserRole !== 'admin' && listDisplaySettings.showTags && lead.tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                                            {lead.tags.map(tag => <TagPill key={tag.id} tag={tag} />)}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* ── Bloco 2: Status + Valor ─────────────────────── */}
                                        <td className="px-4 py-4 whitespace-nowrap align-top">
                                            <div className="flex flex-col gap-2">
                                                {(() => {
                                                    const s = getLeadComputedStatus(lead, columnTypeMap[lead.columnId]);
                                                    const b = STATUS_BADGE[s];
                                                    return (
                                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border w-fit ${b.classes}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_COLOR[s]}`} />
                                                            {b.label}
                                                        </span>
                                                    );
                                                })()}
                                                <span className="text-sm font-semibold text-white tabular-nums">
                                                    {currencyFormatter.format(lead.value)}
                                                </span>
                                            </div>
                                        </td>

                                        {/* ── Bloco 3: Pipeline + Criado por (admin) ──────── */}
                                        {currentUserRole === 'admin' && (
                                            <td className="px-4 py-4 whitespace-nowrap align-top">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-sm text-slate-300 truncate leading-snug">
                                                        {boards.find(b => b.id === lead.boardId)?.name ?? '—'}
                                                    </span>
                                                    <span className="text-xs text-slate-500 leading-snug">
                                                        {users.find(u => u.id === lead.ownerId)?.name
                                                            ? `por ${users.find(u => u.id === lead.ownerId)?.name}`
                                                            : '—'}
                                                    </span>
                                                    {listDisplaySettings.showAssignedTo && (
                                                        <span className="text-xs text-slate-600 leading-snug">
                                                            {users.find(u => u.id === lead.assignedTo)?.name
                                                                ? `resp. ${users.find(u => u.id === lead.assignedTo)?.name}`
                                                                : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        )}

                                        {/* ── Bloco 4: Criação + Última atividade ─────────── */}
                                        <td className="px-4 py-4 whitespace-nowrap align-top">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs text-slate-400 tabular-nums leading-snug">
                                                    {formatDate(lead.createdAt)}
                                                </span>
                                                <span className="text-xs text-slate-500 leading-snug">
                                                    {lead.lastActivityTimestamp
                                                        ? `${getActivityLabel(lead.lastActivityType)} — ${formatRelativeTime(lead.lastActivityTimestamp)}`
                                                        : 'Sem atividade'}
                                                </span>
                                            </div>
                                        </td>

                                        {/* ── Bloco 5: Ações ──────────────────────────────── */}
                                        <td className="px-3 py-4 whitespace-nowrap align-top w-20">
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={e => { e.stopPropagation(); onEditLead(lead); }}
                                                    className="p-1.5 rounded-md text-slate-500 hover:text-blue-400 hover:bg-slate-700/60 transition-colors"
                                                    title="Editar"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={e => { e.stopPropagation(); setLeadToDelete(lead); }}
                                                    className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-slate-700/60 transition-colors"
                                                    title="Excluir"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>

                                    </tr>
                                ))}
                                {bottomPaddingHeight > 0 && (
                                    <tr style={{ height: bottomPaddingHeight }}>
                                        <td colSpan={numberOfColumns} />
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
                {totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                disabled={page === currentPage}
                                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                    page === currentPage
                                        ? 'bg-slate-700 text-white cursor-default'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                )}
            </FlatCard>

            {leadToDelete && (
                <ConfirmDeleteModal
                    title="Excluir Lead"
                    message={<>Tem certeza que deseja excluir o lead <strong className="text-white">{leadToDelete.name}</strong>? Esta ação não pode ser desfeita.</>}
                    confirmText="Excluir"
                    confirmVariant="danger"
                    onClose={() => setLeadToDelete(null)}
                    onConfirm={() => {
                        onDeleteLead(leadToDelete.id as string);
                        setLeadToDelete(null);
                    }}
                />
            )}

            {showBulkDeleteModal && (
                <ConfirmDeleteModal
                    title="Excluir contatos em massa"
                    message={
                        <div className="flex flex-col gap-2">
                            <p>Tem certeza que deseja excluir <strong className="text-white">{selectedIds.size} contato{selectedIds.size !== 1 ? 's' : ''}</strong>?</p>
                            <p className="text-red-400/90 text-xs mt-1">
                                Todos os negócios vinculados também serão excluídos. Esta ação não pode ser desfeita.
                            </p>
                        </div>
                    }
                    confirmText="Excluir"
                    confirmVariant="danger"
                    onClose={() => setShowBulkDeleteModal(false)}
                    onConfirm={() => {
                        selectedIds.forEach(id => onDeleteLead(id));
                        setSelectedIds(new Set());
                        setShowBulkDeleteModal(false);
                    }}
                />
            )}
        </div>
    );
};

export default LeadListView;