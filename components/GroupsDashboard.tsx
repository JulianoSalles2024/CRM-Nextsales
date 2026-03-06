import React, { useMemo, useState } from 'react';
import { Group, Lead, Id } from '../types';
import { Users, PlusCircle, MoreVertical, Edit, Trash2, Link as LinkIcon, Users as MembersIcon, UserPlus, TrendingDown, CheckCircle, Target, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmDeleteModal from './ConfirmDeleteModal';
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

const GroupCard: React.FC<GroupCardProps> = ({ group, metrics, onSelect, onEdit, onDelete }) => {
    const [isMenuOpen, setMenuOpen] = useState(false);
    const progress = group.memberGoal ? Math.min((metrics.currentMembers / group.memberGoal) * 100, 100) : 0;
    
    const statusStyles = {
        'Ativo': 'bg-green-500/20 text-green-400',
        'Lotado': 'bg-yellow-500/20 text-yellow-400',
        'Arquivado': 'bg-slate-500/20 text-slate-400'
    };

    return (
        <FlatCard className="flex flex-col transition-all duration-200 ease-in-out hover:border-blue-500/80 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-900/30 p-0 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-white/10">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-white text-lg">{group.name}</h3>
                        <p className="text-sm text-slate-400 mt-1 line-clamp-2 h-10">{group.description}</p>
                    </div>
                    <div className="relative">
                        <button onClick={() => setMenuOpen(p => !p)} className="p-2 rounded-full text-slate-400 hover:bg-slate-700"><MoreVertical className="w-5 h-5"/></button>
                         <AnimatePresence>
                            {isMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                    className="absolute top-full right-0 mt-1 w-40 bg-slate-900 rounded-md border border-slate-700 shadow-lg z-10 py-1"
                                    onMouseLeave={() => setMenuOpen(false)}
                                >
                                    <button onClick={() => { onEdit(group); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/50"><Edit className="w-4 h-4"/>Editar</button>
                                    <button onClick={() => { onDelete(group.id); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-slate-700/50"><Trash2 className="w-4 h-4"/>Deletar</button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
                <div className="flex items-center gap-4 mt-4">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusStyles[group.status]}`}>{group.status}</span>
                     {group.accessLink && (
                        <a href={group.accessLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300">
                            <LinkIcon className="w-3 h-3"/> Acessar Grupo <ExternalLink className="w-3 h-3"/>
                        </a>
                    )}
                </div>
            </div>

            {/* Metrics */}
            <div className="p-5 grid grid-cols-3 gap-4 text-center">
                <div>
                    <p className="text-2xl font-bold text-white">{metrics.currentMembers}</p>
                    <p className="text-xs text-slate-400">Membros Atuais</p>
                </div>
                <div>
                    <p className="text-2xl font-bold text-white">+{metrics.newMembers}</p>
                    <p className="text-xs text-slate-400">Novos (30d)</p>
                </div>
                 <div>
                    <p className="text-2xl font-bold text-white">{metrics.churnRate.toFixed(1)}%</p>
                    <p className="text-xs text-slate-400">Churn</p>
                </div>
            </div>
            
            {/* Goal and Footer */}
            <div className="p-5 mt-auto">
                 {group.memberGoal && (
                    <div className="mb-4">
                        <div className="flex justify-between items-center text-xs mb-1">
                            <p className="text-slate-300 font-medium">Meta de Membros</p>
                            <p className="text-slate-400">{metrics.currentMembers} / {group.memberGoal}</p>
                        </div>
                         <div className="w-full bg-slate-700 rounded-full h-2">
                            <div className="bg-gradient-to-r from-sky-500 to-blue-500 h-2 rounded-full"
  style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                )}
                <button
  onClick={() => onSelect(group.id)}
   className="w-full bg-sky-500 text-white font-semibold py-2 rounded-md hover:bg-sky-400 transition-colors text-sm"
>
  Ver Membros
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
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Dashboard de Grupos</h1>
                        <p className="text-slate-400">Visão geral da saúde e performance de suas comunidades</p>
                    </div>
                </div>
                 <button onClick={onAddGroup} className="flex items-center justify-center md:justify-start gap-2 bg-gradient-to-r from-sky-500 to-blue-500 text-white px-4 py-2 rounded-md text-sm font-semibold hover:shadow-[0_0_18px_rgba(29,161,242,0.45)] hover:-translate-y-0.5 transition-all duration-200">
                    <PlusCircle className="w-5 h-5" />
                    <span>Novo Grupo</span>
                </button>
            </div>
            
             {groups.length > 0 ? (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(360px,1fr))] gap-6">
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
                <div className="flex flex-col items-center justify-center flex-1 text-center border border-dashed border-slate-700 rounded-xl py-16">
                     <h3 className="text-lg font-semibold text-white">Nenhum grupo encontrado</h3>
                    <p className="text-slate-500 mt-1 mb-4">Comece criando seu primeiro grupo para gerenciar seus membros.</p>
                    <button onClick={onAddGroup} className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-slate-600 transition-colors">
                        <PlusCircle className="w-5 h-5" />
                        <span>Criar Grupo</span>
                    </button>
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