
import React, { useState, useEffect } from 'react';
import { Search, User, Trophy, FileText, Plus, ArrowRight, ShieldCheck, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { User as UserType, Id } from '../types';
import SellerDetail360 from './SellerDetail360';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '../src/features/auth/AuthContext';

interface Painel360Props {
    users: UserType[];
    onSelectSeller?: (seller: UserType) => void;
}

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const Painel360: React.FC<Painel360Props> = ({ users, onSelectSeller }) => {
    const [activeTab, setActiveTab] = useState<'Vendedores' | 'Score' | 'Normativas'>('Vendedores');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSeller, setSelectedSeller] = useState<UserType | null>(null);
    const [supabaseUsers, setSupabaseUsers] = useState<UserType[]>([]);
    const [isFetchingUsers, setIsFetchingUsers] = useState(true);
    const [rankingMap, setRankingMap] = useState<Record<string, number>>({});
    const [rankingLoading, setRankingLoading] = useState(true);
    const { companyId } = useAuth();

    useEffect(() => {
        const fetchSellers = async () => {
            setIsFetchingUsers(true);
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, email, name, role, created_at')
                    .in('role', ['admin', 'seller'])
                    .eq('is_active', true)
                    .order('created_at', { ascending: true });

                if (error) throw error;

                const mapped: UserType[] = (data ?? []).map(p => ({
                    id: p.id,
                    name: p.name ?? p.email ?? 'Sem nome',
                    email: p.email ?? '',
                    role: p.role === 'admin' ? 'Admin' : 'Vendedor',
                    joinedAt: p.created_at,
                }));
                setSupabaseUsers(mapped);
            } catch (err) {
                console.error('[Painel360] fetchSellers error:', err);
            } finally {
                setIsFetchingUsers(false);
            }
        };

        fetchSellers();
    }, []);

    // ── Ranking: agrupa leads GANHO do mês por owner_id ───────────────────────
    useEffect(() => {
        if (!companyId) return;
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

        (async () => {
            setRankingLoading(true);
            const { data, error } = await supabase
                .from('leads')
                .select('owner_id, value')
                .eq('company_id', companyId)
                .eq('status', 'GANHO')
                .eq('is_archived', false)
                .is('deleted_at', null)
                .gte('won_at', monthStart)
                .lte('won_at', monthEnd);

            if (!error && data) {
                const map: Record<string, number> = {};
                data.forEach((r: { owner_id: string | null; value: number }) => {
                    if (!r.owner_id) return;
                    map[r.owner_id] = (map[r.owner_id] ?? 0) + Number(r.value || 0);
                });
                setRankingMap(map);
            }
            setRankingLoading(false);
        })();
    }, [companyId]);

    const handleSelectSeller = (seller: UserType) => {
        setSelectedSeller(seller);
        onSelectSeller?.(seller);
    };

    const allUsers = supabaseUsers.length > 0 ? supabaseUsers : users;
    const sellers = allUsers.filter(u => u.role === 'Vendedor' || u.role === 'Admin');

    const filteredSellers = sellers.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ── Seller Detail View ─────────────────────────────────────────────────────
    if (selectedSeller) {
        return (
            <SellerDetail360
                seller={selectedSeller}
                onBack={() => setSelectedSeller(null)}
            />
        );
    }

    // ── Main Painel 360 ────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Painel 360</h2>
                    <p className="text-slate-500 text-sm mt-1">Visão completa de performance por vendedor.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-800">
                {(['Vendedores', 'Score', 'Normativas'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-3 text-sm font-medium transition-all relative ${
                            activeTab === tab
                                ? 'text-blue-400'
                                : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        {tab}
                        {activeTab === tab && (
                            <motion.div
                                layoutId="activeTab360"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto">
                <AnimatePresence mode="wait">
                    {activeTab === 'Vendedores' && (
                        <motion.div
                            key="vendedores"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-4"
                        >
                            <div className="relative max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Buscar vendedor..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                                />
                            </div>

                            {isFetchingUsers ? (
                                <div className="flex items-center justify-center py-16">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
                                </div>
                            ) : filteredSellers.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                                    <User className="w-12 h-12 mb-3 opacity-20" />
                                    <p className="text-sm">Nenhum vendedor encontrado.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredSellers.map((seller) => (
                                        <button
                                            key={seller.id}
                                            onClick={() => handleSelectSeller(seller)}
                                            className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-blue-500/50 hover:bg-slate-900 transition-all group text-left"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold border border-slate-700 overflow-hidden">
                                                    {seller.avatarUrl ? (
                                                        <img src={seller.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                                                    ) : (
                                                        seller.name.substring(0, 2).toUpperCase()
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                                                        {seller.name}
                                                    </h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`w-2 h-2 rounded-full ${seller.role === 'Admin' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                                                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                                                            {seller.role ?? 'Vendedor'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-slate-600 group-hover:text-blue-400 transition-colors font-medium">
                                                    Ver 360
                                                </span>
                                                <ArrowRight className="w-4 h-4 text-slate-700 group-hover:text-blue-400 transition-all" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'Score' && (
                        <motion.div
                            key="score"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-white">Ranking de Performance</h3>
                                <span className="text-xs text-slate-500">Mês atual · leads GANHO</span>
                            </div>

                            {rankingLoading || isFetchingUsers ? (
                                <div className="flex items-center justify-center py-16">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
                                </div>
                            ) : (() => {
                                // Apenas vendedores (exclui admins do ranking)
                                const rankableSellers = allUsers
                                    .filter(u => u.role === 'Vendedor')
                                    .map(u => ({ ...u, totalValue: rankingMap[u.id] ?? 0 }))
                                    .sort((a, b) => b.totalValue - a.totalValue);

                                return rankableSellers.length > 0 ? (
                                    <div className="space-y-3">
                                        {rankableSellers.map((seller, idx) => (
                                            <button
                                                key={seller.id}
                                                onClick={() => handleSelectSeller(seller)}
                                                className="w-full flex items-center gap-4 p-4 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-blue-500/30 hover:bg-slate-900 transition-all group text-left"
                                            >
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                                                    idx === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                                    idx === 1 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/30' :
                                                    idx === 2 ? 'bg-orange-700/20 text-orange-400 border border-orange-700/30' :
                                                    'bg-slate-800 text-slate-500 border border-slate-700'
                                                }`}>
                                                    {idx + 1}
                                                </div>
                                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-xs font-bold border border-slate-700 overflow-hidden flex-shrink-0">
                                                    {seller.avatarUrl
                                                        ? <img src={seller.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                        : seller.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                                                        {seller.name}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {seller.totalValue > 0
                                                            ? fmt.format(seller.totalValue)
                                                            : 'Sem vendas no mês'}
                                                    </p>
                                                </div>
                                                <Trophy className={`w-4 h-4 flex-shrink-0 ${
                                                    idx === 0 ? 'text-amber-400' : 'text-slate-700 group-hover:text-blue-400'
                                                } transition-colors`} />
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-4">
                                        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                                            <Trophy className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold">Nenhum vendedor cadastrado</h4>
                                            <p className="text-slate-500 text-sm max-w-xs mx-auto mt-2">
                                                Convide membros para a equipe para ver o ranking aqui.
                                            </p>
                                        </div>
                                    </div>
                                );
                            })()}
                        </motion.div>
                    )}

                    {activeTab === 'Normativas' && (
                        <motion.div
                            key="normativas"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-white">Normativas Bancárias</h3>
                                <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all">
                                    <Plus className="w-4 h-4" /> Cadastrar Banco
                                </button>
                            </div>

                            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-950 border-b border-slate-800">
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Banco</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo de Operação</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        <tr className="hover:bg-slate-800/30 transition-colors">
                                            <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic text-sm">
                                                Nenhum banco cadastrado ainda.
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Painel360;
