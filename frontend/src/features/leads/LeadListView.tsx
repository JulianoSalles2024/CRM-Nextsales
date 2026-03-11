import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Lead, ColumnData, Tag, ListDisplaySettings, User, Board } from '@/types';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import LeadListHeader from './LeadListHeader';
import FlatCard from '@/components/ui/FlatCard';
import { getLeadComputedStatus, STATUS_BADGE, STATUS_DOT_COLOR } from '@/src/lib/leadStatus';
import { useAuth } from '@/src/features/auth/AuthContext';

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

    const numberOfColumns = useMemo(() => {
        const isAdmin = currentUserRole === 'admin';
        return 1
            + Object.values(listDisplaySettings).filter(Boolean).length
            + (isAdmin ? 2 - (listDisplaySettings.showTags ? 1 : 0) : 0);
            // admin: +2 (Pipeline + Criado por), -1 se showTags estava ligado (Tags fica oculta)
    }, [listDisplaySettings, currentUserRole]);
    // --- END VIRTUALIZATION LOGIC ---
    
    const TableHeader: React.FC<{ sortKey: SortableKeys; label: string; className?: string }> = ({ sortKey, label, className }) => {
        const isActive = sortConfig?.key === sortKey;
        const isAscending = isActive && sortConfig?.direction === 'ascending';

        return (
            <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${className} ${isActive ? 'text-white' : 'text-slate-400'}`}>
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
                {sortedLeads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64">
                        <h3 className="text-lg font-semibold text-slate-300">Nenhum {viewType === 'Clientes' ? 'cliente' : 'lead'} encontrado</h3>
                        <p className="text-slate-500 mt-1">Tente ajustar seus filtros ou adicione um novo lead!</p>
                    </div>
                ) : (
                    <div ref={scrollContainerRef} onScroll={onScroll} className="overflow-auto h-full">
                        <table className="min-w-full divide-y divide-slate-700" style={{ borderSpacing: 0 }}>
                            <thead className="bg-slate-900/50 sticky top-0 z-10">
                                <tr>
                                    <TableHeader sortKey="name" label="Nome" />
                                    {listDisplaySettings.showStatus && <TableHeader sortKey="status" label="Status" />}
                                    {listDisplaySettings.showValue && <TableHeader sortKey="value" label="Valor" />}
                                    {listDisplaySettings.showEmail && <TableHeader sortKey="email" label="Email" />}
                                    {listDisplaySettings.showPhone && <TableHeader sortKey="phone" label="Telefone" />}
                                    {currentUserRole === 'admin'
                                        ? <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 tracking-wider whitespace-nowrap">Pipeline</th>
                                        : listDisplaySettings.showTags && <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Tags</th>
                                    }
                                    {listDisplaySettings.showCreatedAt && <TableHeader sortKey="createdAt" label="Criação" />}
                                    {listDisplaySettings.showLastActivity && <TableHeader sortKey="lastActivity" label="Última Atividade" />}
                                    {listDisplaySettings.showAssignedTo && <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">Responsável</th>}
                                    {currentUserRole === 'admin' && (
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 tracking-wider whitespace-nowrap">
                                            Criado por
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700 relative">
                                {topPaddingHeight > 0 && (
                                    <tr style={{ height: topPaddingHeight }}>
                                        <td colSpan={numberOfColumns} />
                                    </tr>
                                )}
                                {virtualLeads.map(lead => (
                                    <tr key={lead.id} onClick={() => onLeadClick(lead)} className="hover:bg-slate-800/50 cursor-pointer transition-colors duration-150">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-white">{lead.name}</div>
                                                <div className="text-sm text-slate-400">{lead.company}</div>
                                            </div>
                                        </td>
                                        {listDisplaySettings.showStatus && (
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {(() => {
                                                    const s = getLeadComputedStatus(lead, columnTypeMap[lead.columnId]);
                                                    const b = STATUS_BADGE[s];
                                                    return (
                                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${b.classes}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_COLOR[s]}`} />
                                                            {b.label}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                        )}
                                        {listDisplaySettings.showValue && (
                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white">{currencyFormatter.format(lead.value)}</td>
                                        )}
                                        {listDisplaySettings.showEmail && (
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400 truncate max-w-xs">{lead.email || '—'}</td>
                                        )}
                                        {listDisplaySettings.showPhone && (
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400">{lead.phone || '—'}</td>
                                        )}
                                        {currentUserRole === 'admin'
                                            ? <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400">
                                                {boards.find(b => b.id === lead.boardId)?.name ?? '—'}
                                              </td>
                                            : listDisplaySettings.showTags && (
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex flex-wrap gap-1">
                                                        {lead.tags.map(tag => <TagPill key={tag.id} tag={tag} />)}
                                                    </div>
                                                </td>
                                              )
                                        }
                                        {listDisplaySettings.showCreatedAt && (
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400">{formatDate(lead.createdAt)}</td>
                                        )}
                                        {listDisplaySettings.showLastActivity && (
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400">
                                                {lead.lastActivityTimestamp
                                                    ? `${getActivityLabel(lead.lastActivityType)} — ${formatRelativeTime(lead.lastActivityTimestamp)}`
                                                    : 'Sem atividade'}
                                            </td>
                                        )}
                                        {listDisplaySettings.showAssignedTo && (
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400">
                                                {users.find(u => u.id === lead.assignedTo)?.name ?? '—'}
                                            </td>
                                        )}
                                        {currentUserRole === 'admin' && (
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400">
                                                {users.find(u => u.id === lead.ownerId)?.name ?? '—'}
                                            </td>
                                        )}
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
        </div>
    );
};

export default LeadListView;