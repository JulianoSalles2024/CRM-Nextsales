
import React from 'react';
import { Activity as ActivityIcon, MessageSquare, ArrowRight, ChevronsRight, Mail, MoreVertical } from 'lucide-react';
import { Activity, Lead } from '@/types';
import FlatCard from '@/components/ui/FlatCard';

const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return `${diffSeconds}s atrás`;
    const diffMinutes = Math.round(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m atrás`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
};

interface RecentActivitiesProps {
    activities: Activity[];
    leads: Lead[];
    onNavigate: (view: string) => void;
}

const RecentActivities: React.FC<RecentActivitiesProps> = ({ activities, leads, onNavigate }) => {

    const sortedActivities = [...activities]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5); // Show latest 5 activities on dashboard

    const getLeadName = (leadId: number | string) => {
        return leads.find(l => l.id === leadId)?.name || 'Lead desconhecido';
    }
    
    const getActivityIcon = (type: Activity['type']) => {
        switch (type) {
            case 'note': return <MessageSquare className="w-4 h-4 text-purple-400" />;
            case 'email_sent': return <Mail className="w-4 h-4 text-blue-400" />;
            case 'status_change': return <ArrowRight className="w-4 h-4 text-emerald-400" />;
            default: return <ActivityIcon className="w-4 h-4 text-slate-400" />;
        }
    };

    return (
        <FlatCard className="p-6 rounded-xl h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h2 className="font-bold text-white text-lg">Atividades Recentes</h2>
                <button className="text-slate-500 hover:text-white transition-colors">
                    <MoreVertical className="w-5 h-5" />
                </button>
            </div>
            {sortedActivities.length > 0 ? (
                <ul className="space-y-0 max-h-[320px] overflow-y-auto">
                    {sortedActivities.map((activity, index) => (
                         <li key={activity.id} className={`flex gap-4 items-start py-4 ${index !== sortedActivities.length - 1 ? 'border-b border-slate-800/50' : ''}`}>
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-950 flex items-center justify-center border border-slate-800">
                                {getActivityIcon(activity.type)}
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                                <p className="text-sm text-slate-300 truncate">
                                    <span className="font-semibold text-white">{activity.authorName}</span>
                                    {' '}
                                    <span className="text-slate-500">
                                        {activity.type === 'note' ? 'adicionou nota em' : 
                                         activity.type === 'email_sent' ? 'enviou email para' :
                                         activity.type === 'status_change' ? 'atualizou status de' : 'interagiu com'}
                                    </span>
                                    {' '}
                                    <button onClick={() => {}} className="font-medium text-blue-400 hover:underline truncate align-bottom">
                                        {getLeadName(activity.leadId)}
                                    </button>
                                </p>
                                <p className="text-xs text-slate-600 mt-1">{formatTimestamp(activity.timestamp)}</p>
                                {activity.type === 'note' && (
                                    <div className="mt-2 p-3 bg-slate-950/50 rounded-lg border border-slate-800 text-sm text-slate-400 italic">
                                        "{activity.text}"
                                    </div>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="flex flex-col items-center justify-center flex-1 text-center py-10">
                    <p className="text-slate-500">Nenhuma atividade recente.</p>
                </div>
            )}
            <div className="mt-4 pt-4 border-t border-slate-800">
                <button onClick={() => onNavigate('Tarefas')} className="w-full py-2 text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors text-center border border-slate-800 rounded-lg hover:bg-slate-800">
                    Ver todas as atividades
                </button>
            </div>
        </FlatCard>
    );
};

export default RecentActivities;
