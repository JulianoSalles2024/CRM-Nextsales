import React, { useMemo, useState } from 'react';
import { Group, Lead, Id } from '@/types';
import { Users, PlusCircle, MoreVertical, Edit, Trash2, Link as LinkIcon, UserPlus, TrendingDown, Target, ExternalLink, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import FlatCard from '@/components/ui/FlatCard';

interface GroupCardProps {
    group: Group;
    metrics: {
        currentMembers: number;
        newMembers: number;
        churnRate: number;
    };
    onSelect: (id: Id) => void;
    onEdit: (group: Group) => void;
    onDelete: (id: Id) => void;
}

const statusConfig = {
    'Ativo':     { badge: 'bg-green-500/15 text-green-400 border border-green-500/20',  bar: 'bg-green-500' },
    'Lotado':    { badge: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20', bar: 'bg-yellow-400' },
    'Arquivado': { badge: 'bg-slate-500/15 text-slate-400 border border-slate-500/20',  bar: 'bg-slate-500' },
};

const GroupCard: React.FC<GroupCardProps> = ({ group, metrics, onSelect, onEdit, onDelete }) => {
    const [isMenuOpen, setMenuOpen] = useState(false);
    const progress = group.memberGoal ? Math.min((metrics.currentMembers / group.memberGoal) * 100, 100) : 0;
    const cfg = statusConfig[group.status] ?? statusConfig['Arquivado'];

    return (
        <FlatCard className="flex flex-col transition-all duration-200 ease-in-out hover:border-blue-500/50 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/20 p-0 overflow-hidden">

            {/* Accent bar */}
            <div className={`h-0.5 w-full ${cfg.bar} opacity-60`} />

            {/* Header */}
            <div className="p-5 pb-4">
                <div className="flex justify-between items-start gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500/15 to-blue-600/15 border border-sky-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Users className="w-4 h-4 text-sky-400" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-bold text-white text-base leading-tight truncate">{group.name}</h3>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{group.description || 'Sem descrição'}</p>
                        </div>
                    </div>
                    <div className="relative flex-shrink-0">
                        <button onClick={() => setMenuOpen(p => !p)} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors">
                            <MoreVertical className="w-4 h-4"/>
                        </button>
                        <AnimatePresence>
                            {isMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                    transition={{ duration: 0.1 }}
                                    className="absolute top-full right-0 mt-1 w-40 bg-slate-900 rounded-xl border border-slate-700/80 shadow-xl z-10 py-1 overflow-hidden"
                                    onMouseLeave={() => setMenuOpen(false)}
                                >
                                    <button onClick={() => { onEdit(group); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                                        <Edit className="w-3.5 h-3.5 text-slate-500"/>Editar
                                    </button>
                                    <button onClick={() => { onDelete(group.id); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors">
                                        <Trash2 className="w-3.5 h-3.5"/>Deletar
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="flex items-center gap-3 mt-3">
                    <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${cfg.badge}`}>{group.status}</span>
                    {group.accessLink && (
                        <a href={group.accessLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors">
                            <LinkIcon className="w-3 h-3"/> Acessar <ExternalLink className="w-2.5 h-2.5"/>
                        </a>
                    )}
                </div>
            </div>

            {/* Metrics */}
            <div className="px-5 pb-4 grid grid-cols-3 gap-2">
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                        <Users className="w-3 h-3 text-violet-400" />
                    </div>
                    <p className="text-xl font-bold text-white leading-none">{metrics.currentMembers}</p>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">Membros</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                        <UserPlus className="w-3 h-3 text-sky-400" />
                    </div>
                    <p className="text-xl font-bold text-white leading-none">+{metrics.newMembers}</p>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">Novos (30d)</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                        <TrendingDown className="w-3 h-3 text-red-400" />
                    </div>
                    <p className="text-xl font-bold text-white leading-none">{metrics.churnRate.toFixed(1)}%</p>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">Churn</p>
                </div>
            </div>

            {/* Goal + Footer */}
            <div className="px-5 pb-5 mt-auto">
                {group.memberGoal && (
                    <div className="mb-4">
                        <div className="flex justify-between items-center text-xs mb-1.5">
                            <span className="flex items-center gap-1 text-slate-400 font-medium">
                                <Target className="w-3 h-3 text-blue-400" /> Meta
                            </span>
                            <span className="text-slate-400 tabular-nums">{metrics.currentMembers} / {group.memberGoal}</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5">
                            <div
                                className="bg-gradient-to-r from-sky-500 to-blue-500 h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}
                <button
                    onClick={() => onSelect(group.id)}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-blue-500 text-white font-semibold py-2 rounded-xl hover:shadow-[0_0_18px_rgba(29,161,242,0.35)] hover:-translate-y-0.5 transition-all duration-200 text-sm"
                >
                    Ver Membros
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </FlatCard>
    );
};


interface GroupsDashboardProps {
    groups: Group[];
    leads: Lead[];
    onSelectGroup: (id: Id) => void;
    onAddGroup: () => void;
    onEditGroup: (group: Group) => void;
    onDeleteGroup: (id: Id) => void;
}

const GroupsDashboard: React.FC<GroupsDashboardProps> = ({ groups, leads, onSelectGroup, onAddGroup, onEditGroup, onDeleteGroup }) => {

    const [groupToDelete, setGroupToDelete] = useState<Id | null>(null);

    const groupMetrics = useMemo(() => {
        const metricsMap = new Map<Id, { currentMembers: number; newMembers: number; churnRate: number }>();
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        groups.forEach(group => {
            const groupLeads = leads.filter(l => l.groupInfo?.groupId === group.id);
            const currentMembers = groupLeads.filter(l => l.groupInfo?.isStillInGroup).length;
            const newMembers = groupLeads.filter(l => l.groupInfo?.onboardingCallDate && new Date(l.groupInfo.onboardingCallDate) > thirtyDaysAgo).length;
            const churnedMembers = groupLeads.filter(l => l.groupInfo?.churned).length;

            const totalEverInGroup = currentMembers + churnedMembers;
            const churnRate = totalEverInGroup > 0 ? (churnedMembers / totalEverInGroup) * 100 : 0;

            metricsMap.set(group.id, { currentMembers, newMembers, churnRate });
        });
        return metricsMap;
    }, [groups, leads]);

    const confirmDelete = () => {
        if (groupToDelete) {
            onDeleteGroup(groupToDelete);
            setGroupToDelete(null);
        }
    };


    return (
        <>
        <div className="flex flex-col gap-6 h-full">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-1 mb-2">
                        <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border bg-blue-950/40 border-blue-500/30 text-blue-400 shadow-sm shadow-blue-900/20 cursor-default">
                            <Users className="w-4 h-4 flex-shrink-0" />
                            <span>Grupos</span>
                        </button>
                    </div>
                    <p className="text-slate-400 text-sm">Visão geral da saúde e performance de suas comunidades</p>
                </div>
                <button onClick={onAddGroup} className="flex items-center justify-center md:justify-start gap-2 bg-gradient-to-r from-sky-500 to-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:shadow-[0_0_18px_rgba(29,161,242,0.45)] hover:-translate-y-0.5 transition-all duration-200">
                    <PlusCircle className="w-4 h-4" />
                    <span>Novo Grupo</span>
                </button>
            </div>

            {groups.length > 0 ? (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-5">
                    {groups.map(group => (
                        <GroupCard
                            key={group.id}
                            group={group}
                            metrics={groupMetrics.get(group.id) || { currentMembers: 0, newMembers: 0, churnRate: 0 }}
                            onSelect={onSelectGroup}
                            onEdit={onEditGroup}
                            onDelete={setGroupToDelete}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center flex-1 text-center border border-dashed border-slate-800 rounded-2xl py-16">
                    <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-center mb-4">
                        <Users className="w-7 h-7 text-slate-500" />
                    </div>
                    <h3 className="text-base font-semibold text-white">Nenhum grupo encontrado</h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-xs">Use o botão "Novo Grupo" para criar sua primeira comunidade.</p>
                </div>
            )}
        </div>
        <AnimatePresence>
            {groupToDelete && (
                <ConfirmDeleteModal
                    onClose={() => setGroupToDelete(null)}
                    onConfirm={confirmDelete}
                    title="Deletar Grupo?"
                    message="Tem certeza que deseja deletar este grupo? Esta ação não pode ser desfeita e irá desassociar todos os leads deste grupo."
                />
            )}
        </AnimatePresence>
        </>
    );
};

export default GroupsDashboard;
