import React, { useMemo } from 'react';
import { Radar } from 'lucide-react';
import FlatCard from '@/components/ui/FlatCard';
import type { User, Task, Lead } from '@/types';
import type { OpportunityScore } from '@/src/hooks/useOpportunityScores';

interface AdminSalesRadarProps {
    users: User[];
    tasks: Task[];
    leads: Lead[];
    overdueTasks: Task[];
    scopedOpportunities: OpportunityScore[];
    churnRiskLeads: Lead[];
}

const AdminSalesRadar: React.FC<AdminSalesRadarProps> = ({
    users,
    tasks,
    leads,
    overdueTasks,
    scopedOpportunities,
    churnRiskLeads,
}) => {
    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    const rows = useMemo(() => {
        return users
            .filter(u => u.role === 'seller' || u.role === 'admin')
            .map(user => {
                const myOverdue = overdueTasks.filter(t => t.userId === user.id).length;

                const myToday = tasks.filter(t => {
                    if (t.status !== 'pending' || t.userId !== user.id) return false;
                    const d = new Date(t.dueDate);
                    d.setHours(0, 0, 0, 0);
                    return d.getTime() === today.getTime();
                }).length;

                const myHot = scopedOpportunities.filter(
                    o => o.owner_id === user.id && (o.priority_band === 'hot' || o.priority_band === 'upsell')
                ).length;

                const myRisk = churnRiskLeads.filter(l => l.ownerId === user.id).length;

                return { user, myOverdue, myToday, myHot, myRisk };
            });
    }, [users, tasks, overdueTasks, scopedOpportunities, churnRiskLeads, today]);

    if (rows.length === 0) return null;

    return (
        <FlatCard className="overflow-hidden">
            <div className="flex items-center gap-2 p-5 border-b border-slate-800">
                <Radar className="w-4 h-4 text-blue-400" />
                <h3 className="font-semibold text-white">Radar Comercial</h3>
                <span className="text-xs text-slate-500 ml-1">{rows.length} vendedor{rows.length !== 1 ? 'es' : ''}</span>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead>
                        <tr className="bg-slate-900">
                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400">Vendedor</th>
                            <th className="px-5 py-3 text-center text-xs font-semibold text-slate-400">Atrasadas</th>
                            <th className="px-5 py-3 text-center text-xs font-semibold text-slate-400">Hoje</th>
                            <th className="px-5 py-3 text-center text-xs font-semibold text-slate-400">Hot</th>
                            <th className="px-5 py-3 text-center text-xs font-semibold text-slate-400">Em risco</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {rows.map(({ user, myOverdue, myToday, myHot, myRisk }) => (
                            <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                                <td className="px-5 py-3.5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-white truncate">{user.name}</p>
                                            <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-5 py-3.5 text-center">
                                    <span className={`text-sm font-semibold ${myOverdue > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                                        {myOverdue}
                                    </span>
                                </td>
                                <td className="px-5 py-3.5 text-center">
                                    <span className={`text-sm font-semibold ${myToday > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                                        {myToday}
                                    </span>
                                </td>
                                <td className="px-5 py-3.5 text-center">
                                    <span className={`text-sm font-semibold ${myHot > 0 ? 'text-blue-400' : 'text-slate-500'}`}>
                                        {myHot}
                                    </span>
                                </td>
                                <td className="px-5 py-3.5 text-center">
                                    <span className={`text-sm font-semibold ${myRisk > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                                        {myRisk}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </FlatCard>
    );
};

export default AdminSalesRadar;
