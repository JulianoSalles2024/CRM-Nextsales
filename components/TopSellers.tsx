
import React, { useMemo } from 'react';
import { Lead, User } from '../types';
import { Trophy, Users } from 'lucide-react';
import FlatCard from './ui/FlatCard';

interface TopSellersProps {
    leads: Lead[];
    users: User[];
    selectedPeriod: string;
}

function getWonDateRange(period: string): { start: Date | null; end: Date | null } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (period) {
        case 'Hoje':
            return { start: today, end: new Date(today.getTime() + 86_400_000 - 1) };
        case 'Ontem': {
            const y = new Date(today); y.setDate(today.getDate() - 1);
            return { start: y, end: new Date(today.getTime() - 1) };
        }
        case 'Últimos 7 dias': {
            const s = new Date(today); s.setDate(today.getDate() - 6);
            return { start: s, end: now };
        }
        case 'Últimos 30 dias': {
            const s = new Date(today); s.setDate(today.getDate() - 29);
            return { start: s, end: now };
        }
        case 'Este Mês':
            return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
        case 'Mês Passado':
            return {
                start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
                end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
            };
        case 'Este Trimestre': {
            const q = Math.floor(now.getMonth() / 3);
            return { start: new Date(now.getFullYear(), q * 3, 1), end: now };
        }
        case 'Último Trimestre': {
            const q = Math.floor(now.getMonth() / 3);
            return {
                start: new Date(now.getFullYear(), (q - 1) * 3, 1),
                end: new Date(now.getFullYear(), q * 3, 0, 23, 59, 59, 999),
            };
        }
        case 'Este Ano':
            return { start: new Date(now.getFullYear(), 0, 1), end: now };
        case 'Ano Passado':
            return {
                start: new Date(now.getFullYear() - 1, 0, 1),
                end: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999),
            };
        default: // 'Todo o Período'
            return { start: null, end: null };
    }
}

const TopSellers: React.FC<TopSellersProps> = ({ leads, users, selectedPeriod }) => {
    const currencyFormatter = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
    });

    const topSellers = useMemo(() => {
        const { start, end } = getWonDateRange(selectedPeriod);

        // Filtra: status='GANHO', won_at no período, não arquivado, com owner
        const wonLeads = leads.filter(lead => {
            if (lead.status !== 'GANHO') return false;
            if (lead.isArchived) return false;
            if (!lead.ownerId) return false;
            if (!lead.wonAt) return false;
            const wonDate = new Date(lead.wonAt);
            if (start && wonDate < start) return false;
            if (end && wonDate > end) return false;
            return true;
        });

        // Agrupa por ownerId
        const salesByUser: Record<string, { totalValue: number; count: number }> = {};
        wonLeads.forEach(lead => {
            const id = lead.ownerId!;
            if (!salesByUser[id]) salesByUser[id] = { totalValue: 0, count: 0 };
            salesByUser[id].totalValue += Number(lead.value || 0);
            salesByUser[id].count += 1;
        });

        // Mapeia para objetos de usuário, exclui admins, ordena DESC
        return Object.entries(salesByUser)
            .map(([userId, stats]) => {
                const user = users.find(u => u.id === userId);
                return {
                    id: userId,
                    name: user?.name || 'Vendedor Desconhecido',
                    avatarUrl: user?.avatarUrl,
                    role: user?.role,
                    ...stats,
                };
            })
            .filter(s => s.role !== 'Admin')
            .sort((a, b) => b.totalValue - a.totalValue)
            .slice(0, 3);
    }, [leads, users, selectedPeriod]);

    return (
        <FlatCard className="p-6 rounded-xl h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    <h2 className="font-bold text-white text-lg">Top Vendedores</h2>
                </div>
            </div>

            <div className="flex-1 space-y-4">
                {topSellers.length > 0 ? (
                    topSellers.map((seller, index) => (
                        <div key={seller.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800/50 hover:border-slate-700 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <img
                                        src={seller.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(seller.name)}&background=random`}
                                        alt={seller.name}
                                        className="w-10 h-10 rounded-full border-2 border-slate-800"
                                    />
                                    <div className={`absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg
                                        ${index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-slate-400' : 'bg-amber-700'}`}>
                                        {index + 1}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-white">{seller.name}</p>
                                    <p className="text-xs text-slate-500">{seller.count} {seller.count === 1 ? 'deal fechado' : 'deals fechados'}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-emerald-400">{currencyFormatter.format(seller.totalValue)}</p>
                                <div className="w-24 bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 rounded-full"
                                        style={{ width: `${Math.min((seller.totalValue / (topSellers[0]?.totalValue || 1)) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-full py-10 text-slate-500">
                        <Users className="w-12 h-12 mb-3 opacity-20" />
                        <p className="text-sm">Nenhum deal fechado no período.</p>
                    </div>
                )}
            </div>
        </FlatCard>
    );
};

export default TopSellers;
