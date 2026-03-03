
import React, { useMemo } from 'react';
import { ColumnData, Lead } from '../types';
import { ChevronsRight } from 'lucide-react';
import FlatCard from '@/components/ui/FlatCard';

interface PipelineOverviewProps {
    columns: ColumnData[];
    leads: Lead[];
    onNavigate: (view: string) => void;
}

const PipelineOverview: React.FC<PipelineOverviewProps> = ({ columns, leads, onNavigate }) => {
    
    const currencyFormatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    });

    const overviewData = useMemo(() => {
        return columns.map(column => {
            const leadsInColumn = leads.filter(lead => lead.columnId === column.id);
            const value = leadsInColumn.reduce((sum, lead) => sum + lead.value, 0);
            return {
                ...column,
                leadCount: leadsInColumn.length,
                value: value
            };
        });
    }, [columns, leads]);

    return (
        <div onClick={() => onNavigate('Pipeline')} className="h-full">
        <FlatCard className="p-6 h-full flex flex-col cursor-pointer hover:border-slate-700 hover:shadow-lg transition-all duration-200">
            <div className="flex justify-between items-center mb-6">
                <h2 className="font-bold text-white text-lg">Funil de Vendas</h2>
                <ChevronsRight className="w-5 h-5 text-slate-500" />
            </div>
            <div className="flex-1 space-y-4">
                {overviewData.map(stage => (
                    <div key={stage.id} className="group flex items-center justify-between p-3 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-700/50">
                        <div className="flex-1">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{stage.title}</span>
                                <span className="text-xs text-slate-500 font-mono">{stage.leadCount}</span>
                            </div>
                            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800/50">
                                <div 
                                    className="h-full rounded-full opacity-80" 
                                    style={{ width: `${Math.min(stage.leadCount * 10, 100)}%`, backgroundColor: stage.color }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </FlatCard>
        </div>
    );
};

export default PipelineOverview;
