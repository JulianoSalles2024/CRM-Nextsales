
import React from 'react';
import { LucideProps, TrendingUp, TrendingDown } from 'lucide-react';

interface KpiCardProps {
    title: string;
    value: string;
    icon: React.ElementType;
    iconColor: string; // e.g., "text-blue-500"
    trend?: number; // percentage
    trendDirection?: 'up' | 'down';
    onClick?: () => void;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon: Icon, iconColor, trend, trendDirection = 'up', onClick }) => {
    const bgClass = iconColor.replace('text-', 'bg-') + '/10';
    const borderClass = iconColor.replace('text-', 'border-') + '/20';

    return (
        <div
            onClick={onClick}
            className={`bg-[rgba(10,16,28,0.72)] backdrop-blur-[14px] p-6 rounded-xl border border-white/5 flex flex-col justify-between h-full relative overflow-hidden group ${onClick ? 'cursor-pointer hover:border-slate-600 hover:shadow-lg hover:shadow-slate-950/50 transition-all duration-200' : ''}`}
        >
            <div className="flex justify-between items-start mb-2 relative z-10">
                <div>
                    <p className="text-sm font-medium text-slate-400">{title}</p>
                    <h3 className="text-3xl font-bold text-white mt-3 tracking-tight">{value}</h3>
                </div>
                <div className={`p-3 rounded-lg ${bgClass} border ${borderClass} flex-shrink-0`}>
                    <Icon className={`w-6 h-6 ${iconColor}`} />
                </div>
            </div>

            {trend !== undefined ? (
                <div className="flex items-center gap-2 mt-4 relative z-10">
                    <div className={`flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded-md ${trendDirection === 'up' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {trendDirection === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span>{trend > 0 ? '+' : ''}{trend}%</span>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">vs mês anterior</span>
                </div>
            ) : (
                <div className="mt-4 relative z-10">
                    <span className="text-xs text-slate-600 font-medium">Dados em tempo real</span>
                </div>
            )}

            {/* Subtle gradient glow effect on hover */}
            <div className={`absolute -right-10 -bottom-10 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 ${bgClass.replace('/10', '')}`}></div>
        </div>
    );
};

export default KpiCard;
