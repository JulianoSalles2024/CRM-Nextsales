import React, { useState, useRef, useEffect } from 'react';
import { Users, Contact, SlidersHorizontal, Tag, X, Download, Plus, TrendingUp, User as UserIcon, ClipboardList, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import ListCustomizationPopup from './ListCustomizationPopup';
import TagFilterPopup from './TagFilterPopup';
import type { ListDisplaySettings, Tag as TagType } from '@/types';

interface LeadListHeaderProps {
    viewType: 'Leads' | 'Clientes';
    listDisplaySettings: ListDisplaySettings;
    onUpdateListSettings: (newSettings: ListDisplaySettings) => void;
    allTags: TagType[];
    selectedTags: TagType[];
    onSelectedTagsChange: React.Dispatch<React.SetStateAction<TagType[]>>;
    statusFilter: 'all' | 'Ganho' | 'Perdido';
    onStatusFilterChange: (status: 'all' | 'Ganho' | 'Perdido') => void;
    onExportCSV: () => void;
    onExportPDF: () => void;
    onOpenCreateLeadModal: () => void;
    onOpenCreateTaskModal: () => void;
    searchQuery: string;
    onSearchChange: (value: string) => void;
}

const LeadListHeader: React.FC<LeadListHeaderProps> = ({ 
    viewType, 
    listDisplaySettings, 
    onUpdateListSettings,
    allTags,
    selectedTags,
    onSelectedTagsChange,
    statusFilter,
    onStatusFilterChange,
    onExportCSV,
    onExportPDF,
    onOpenCreateLeadModal,
    onOpenCreateTaskModal,
    searchQuery,
    onSearchChange,
}) => {
    const [isCustomizeOpen, setCustomizeOpen] = useState(false);
    const [isTagFilterOpen, setTagFilterOpen] = useState(false);
    const [isCreateMenuOpen, setCreateMenuOpen] = useState(false);
    
    const createMenuRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (createMenuRef.current && !createMenuRef.current.contains(event.target as Node)) {
                setCreateMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isClientsView = viewType === 'Clientes';
    const Icon = isClientsView ? Contact : Users;
    const title = isClientsView ? 'Clientes' : 'Leads';
    const description = isClientsView ? 'Gerencie seus clientes e relacionamentos' : 'Gerencie todos os seus leads e clientes';

    const handleTagToggle = (tagToToggle: TagType) => {
        onSelectedTagsChange(prev => {
            if (prev.find(t => t.id === tagToToggle.id)) {
                return prev.filter(t => t.id !== tagToToggle.id);
            } else {
                return [...prev, tagToToggle];
            }
        });
    };

    const handleClearTags = () => {
        onSelectedTagsChange([]);
    };

    const createMenuItems = [
        { label: 'Novo Lead', icon: TrendingUp, action: onOpenCreateLeadModal },
        { label: 'Novo Cliente', icon: UserIcon, action: onOpenCreateLeadModal },
        { label: 'Nova Atividade', icon: ClipboardList, action: onOpenCreateTaskModal },
    ];

    return (
        <div className="flex flex-col gap-4">
            <div>
                <p className="text-slate-400 text-sm">{description}</p>
            </div>
             <div className="flex items-center gap-4 p-2 min-h-[52px]">
                {/* Status Filter */}
                {(() => {
                    const tabs = [
                        { v: 'all'     as const, l: 'Todos'   },
                        { v: 'Ganho'   as const, l: 'Ganhos'  },
                        { v: 'Perdido' as const, l: 'Perdidos'},
                    ];
                    const activeIdx = tabs.findIndex(t => t.v === statusFilter);
                    const W = 92;
                    return (
                        <div className="relative flex items-center gap-0 bg-slate-900/60 border border-blue-500/10 rounded-xl p-1">
                            <div
                                className="absolute top-1 bottom-1 rounded-lg bg-blue-500/10 border border-blue-500/20 transition-all duration-300 ease-in-out"
                                style={{ width: W, left: `calc(${activeIdx} * ${W}px + 4px)` }}
                            />
                            {tabs.map(({ v, l }) => (
                                <button
                                    key={v}
                                    onClick={() => onStatusFilterChange(v)}
                                    style={{ width: W }}
                                    className={`relative z-10 py-1.5 text-sm rounded-lg transition-colors duration-200 text-center ${
                                        statusFilter === v
                                            ? 'text-blue-400'
                                            : 'text-slate-500 hover:text-slate-300'
                                    }`}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>
                    );
                })()}

                <div className="w-px h-6 bg-zinc-700"></div>

                {/* Search */}
                <div className="w-1/3 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou e-mail..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                    />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 ml-auto">
                     <div className="relative z-50" ref={createMenuRef}>
                        <button
                            onClick={() => setCreateMenuOpen(prev => !prev)}
                            className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-500 text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:shadow-[0_0_18px_rgba(29,161,242,0.45)] hover:-translate-y-0.5 transition-all duration-200"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Criar</span>
                        </button>
                        <AnimatePresence>
                            {isCreateMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute top-full right-0 mt-2 w-56 bg-slate-900 rounded-lg border border-slate-700 shadow-lg z-20 py-1"
                                >
                                    {createMenuItems.map(item => (
                                        <button
                                            key={item.label}
                                            onClick={() => { item.action(); setCreateMenuOpen(false); }}
                                            className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <item.icon className="w-4 h-4 text-slate-400" />
                                                <span>{item.label}</span>
                                            </div>
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="relative z-30">
                        <button
                            onClick={() => setCustomizeOpen(prev => !prev)}
                            className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-500 text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:shadow-[0_0_18px_rgba(29,161,242,0.45)] hover:-translate-y-0.5 transition-all duration-200"
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                            <span>Personalizar Colunas</span>
                        </button>
                        <AnimatePresence>
                            {isCustomizeOpen && (
                                <ListCustomizationPopup
                                    settings={listDisplaySettings}
                                    onUpdate={onUpdateListSettings}
                                    onClose={() => setCustomizeOpen(false)}
                                />
                            )}
                        </AnimatePresence>
                    </div>
                    <button
                        onClick={onExportCSV}
                        className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-500 text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:shadow-[0_0_18px_rgba(29,161,242,0.45)] hover:-translate-y-0.5 transition-all duration-200"
                    >
                        <Download className="w-4 h-4" />
                        <span>Exportar CSV</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LeadListHeader;