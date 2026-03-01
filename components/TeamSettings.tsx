import React, { useState, useEffect, useCallback } from 'react';
import { User, InviteLink, UserRole } from '../types';
import { Users, UserPlus, Copy, Trash2, Shield, Loader2, Ban, RefreshCw, Archive } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/features/auth/AuthContext';
import GoalsTab from './GoalsTab';

interface TeamMember {
    id: string;
    email: string;
    name: string;
    role: string;
    joinedAt: string;
    isActive: boolean;
    isArchived: boolean;
    archivedAt?: string;
}

interface Toast {
    message: string;
    type: 'success' | 'error';
}

interface TeamSettingsProps {
    users: User[];
    currentUser: User;
    onUpdateUsers: (users: User[]) => void;
}

const TeamSettings: React.FC<TeamSettingsProps> = ({ users, currentUser, onUpdateUsers }) => {
    const { currentPermissions, currentUserRole } = useAuth();
    const isAdmin = currentUserRole === 'admin';

    const [isInviteModalOpen, setInviteModalOpen] = useState(false);
    const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generateError, setGenerateError] = useState<string | null>(null);
    const [supabaseMembers, setSupabaseMembers] = useState<TeamMember[]>([]);
    const [isFetchingUsers, setIsFetchingUsers] = useState(true);

    // Block / Reactivate state
    const [blockTarget, setBlockTarget] = useState<TeamMember | null>(null);
    const [isBlocking, setIsBlocking] = useState(false);
    const [reactivateTarget, setReactivateTarget] = useState<TeamMember | null>(null);
    const [isReactivating, setIsReactivating] = useState(false);
    const [toast, setToast] = useState<Toast | null>(null);

    // Archive / Unarchive state
    const [archiveTarget, setArchiveTarget] = useState<TeamMember | null>(null);
    const [isArchiving, setIsArchiving] = useState(false);
    const [unarchiveTarget, setUnarchiveTarget] = useState<TeamMember | null>(null);
    const [isUnarchiving, setIsUnarchiving] = useState(false);

    // Tab state
    const [activeTab, setActiveTab] = useState<'active' | 'archived' | 'goals'>('active');

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchMembers = useCallback(async () => {
        setIsFetchingUsers(true);
        const { data } = await supabase
            .from('profiles')
            .select('id, email, name, role, company_id, created_at, is_active, is_archived, archived_at')
            .order('created_at', { ascending: true });
        if (data) {
            setSupabaseMembers(data.map(p => ({
                id: p.id,
                email: p.email,
                name: p.name ?? p.email,
                role: p.role === 'admin' ? 'Admin' : 'Vendedor',
                joinedAt: p.created_at,
                isActive: p.is_active !== false,
                isArchived: p.is_archived === true,
                archivedAt: p.archived_at ?? undefined,
            })));
        }
        setIsFetchingUsers(false);
    }, []);

    useEffect(() => { fetchMembers(); }, [fetchMembers]);

    const displayMembers = supabaseMembers.length > 0
        ? supabaseMembers
        : users.map(u => ({ ...u, role: u.role ?? 'Vendedor', joinedAt: u.joinedAt ?? '', isActive: true, isArchived: false }));

    const activeMembers = displayMembers.filter(m => !m.isArchived);
    const archivedMembers = displayMembers.filter(m => m.isArchived);
    const tabMembers = activeTab === 'active' ? activeMembers : archivedMembers;

    const handleBlockUser = async () => {
        if (!blockTarget) return;
        setIsBlocking(true);
        const { error } = await supabase.rpc('admin_block_user', { p_user_id: blockTarget.id });
        setIsBlocking(false);
        setBlockTarget(null);
        if (error) {
            showToast(`Erro ao bloquear: ${error.message}`, 'error');
        } else {
            await fetchMembers();
            showToast('Usuário bloqueado com sucesso', 'success');
        }
    };

    const handleReactivateUser = async () => {
        if (!reactivateTarget) return;
        setIsReactivating(true);
        const { error } = await supabase.rpc('admin_unblock_user', { p_user_id: reactivateTarget.id });
        setIsReactivating(false);
        setReactivateTarget(null);
        if (error) {
            showToast(`Erro ao reativar: ${error.message}`, 'error');
        } else {
            await fetchMembers();
            showToast('Usuário reativado com sucesso', 'success');
        }
    };

    const handleArchiveUser = async () => {
        if (!archiveTarget) return;
        setIsArchiving(true);
        const { error } = await supabase.rpc('admin_archive_user', { p_user_id: archiveTarget.id });
        setIsArchiving(false);
        setArchiveTarget(null);
        if (error) {
            showToast(`Erro ao arquivar: ${error.message}`, 'error');
        } else {
            await fetchMembers();
            showToast('Usuário arquivado com sucesso', 'success');
        }
    };

    const handleUnarchiveUser = async () => {
        if (!unarchiveTarget) return;
        setIsUnarchiving(true);
        const { error } = await supabase.rpc('admin_unarchive_user', { p_user_id: unarchiveTarget.id });
        setIsUnarchiving(false);
        setUnarchiveTarget(null);
        if (error) {
            showToast(`Erro ao desarquivar: ${error.message}`, 'error');
        } else {
            await fetchMembers();
            showToast('Usuário desarquivado com sucesso', 'success');
        }
    };

    // Invite Modal State
    const [inviteRole, setInviteRole] = useState<UserRole>('Vendedor');
    const [inviteExpiration, setInviteExpiration] = useState<'7 days' | '30 days' | 'never'>('7 days');

    const handleGenerateInvite = async () => {
        setIsGenerating(true);
        setGenerateError(null);
        try {
            const token = crypto.randomUUID();
            let expiresAt: string | null = null;
            if (inviteExpiration === '7 days') {
                const d = new Date(); d.setDate(d.getDate() + 7); expiresAt = d.toISOString();
            } else if (inviteExpiration === '30 days') {
                const d = new Date(); d.setDate(d.getDate() + 30); expiresAt = d.toISOString();
            }
            const roleValue = inviteRole === 'Admin' ? 'admin' : 'seller';
            const { data: { user } } = await supabase.auth.getUser();
            const { data: profile } = await supabase
                .from('profiles').select('company_id').eq('id', user!.id).single();
            const companyId = profile?.company_id ?? null;
            const { data, error } = await supabase
                .from('invites')
                .insert({ token, role: roleValue, company_id: companyId, expires_at: expiresAt })
                .select().single();
            if (error) throw new Error(error.message);
            const newInvite: InviteLink = {
                id: data.id ?? `invite-${Date.now()}`,
                role: inviteRole,
                expiration: inviteExpiration,
                expiresAt,
                token,
                createdAt: new Date().toISOString(),
            };
            setInviteLinks(prev => [newInvite, ...prev]);
        } catch (err: any) {
            setGenerateError(err.message ?? 'Erro ao gerar convite.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDeleteInvite = (id: string) => setInviteLinks(prev => prev.filter(l => l.id !== id));
    const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);
    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(new Date(dateString));
    };

    return (
        <div className="space-y-6">

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        className={`fixed top-5 right-5 z-[100] px-5 py-3 rounded-xl text-sm font-medium shadow-lg border ${
                            toast.type === 'success'
                                ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                                : 'bg-red-950 border-red-700 text-red-300'
                        }`}
                    >
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Sua Equipe</h2>
                    <p className="text-slate-400 mt-1">
                        {activeMembers.length} membro{activeMembers.length !== 1 && 's'} •{' '}
                        {activeMembers.filter(u => u.role === 'Admin').length} admin,{' '}
                        {activeMembers.filter(u => u.role === 'Vendedor').length} vendedores
                    </p>
                </div>
                {currentPermissions.canManageTeam && (
                    <button
                        onClick={() => setInviteModalOpen(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        <UserPlus className="w-4 h-4" />
                        Convidar
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1 w-fit">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'active' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-300'}`}
                >
                    Ativos{activeMembers.length > 0 && <span className="ml-1 text-xs text-slate-500">({activeMembers.length})</span>}
                </button>
                <button
                    onClick={() => setActiveTab('archived')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'archived' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-300'}`}
                >
                    Arquivados{archivedMembers.length > 0 && <span className="ml-1 text-xs text-slate-500">({archivedMembers.length})</span>}
                </button>
                <button
                    onClick={() => setActiveTab('goals')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'goals'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-slate-300'
                    }`}
                >
                    Metas
            </button>
            </div>

            {/* Members List — só para abas de equipe */}
            {activeTab !== 'goals' && (
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                <div className="divide-y divide-slate-800">
                    {isFetchingUsers ? (
                        <div className="p-6 flex justify-center">
                            <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
                        </div>
                    ) : (currentPermissions.canManageTeam ? tabMembers : tabMembers.filter(u => u.id === currentUser.id)).map(member => (
                        <div key={member.id} className={`p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors ${!member.isActive ? 'opacity-60' : ''}`}>
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-lg ${member.role === 'Admin' ? 'from-orange-400 to-orange-600' : 'from-blue-400 to-blue-600'}`}>
                                        {getInitials(member.name)}
                                    </div>
                                    {member.role === 'Admin' && (
                                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-slate-900 rounded-full flex items-center justify-center">
                                            <Shield className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-white">{member.name}</h3>
                                        {member.id === currentUser.id && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-blue-400 uppercase tracking-wider">
                                                Você
                                            </span>
                                        )}
                                        {!member.isActive && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-400 uppercase tracking-wider border border-red-500/20">
                                                Bloqueado
                                            </span>
                                        )}
                                        {member.isArchived && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 uppercase tracking-wider border border-amber-500/20">
                                                Arquivado
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-400">
                                        <span>{member.email}</span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                        <span className="flex items-center gap-1 text-yellow-500">
                                            <Shield className="w-3 h-3" />
                                            {member.role}
                                        </span>
                                        <span>•</span>
                                        <span>Desde {formatDate(member.joinedAt)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions — only admin, not for self */}
                            {isAdmin && member.id !== currentUser.id && (
                                <div className="flex items-center gap-2">
                                    {activeTab === 'archived' ? (
                                        <button
                                            onClick={() => setUnarchiveTarget(member)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/10 hover:border-amber-500/50 transition-all"
                                            title="Desarquivar usuário"
                                        >
                                            <Archive className="w-3.5 h-3.5" />
                                            Desarquivar
                                        </button>
                                    ) : (
                                        <>
                                            {member.isActive ? (
                                                <button
                                                    onClick={() => setBlockTarget(member)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 hover:border-red-500/50 transition-all"
                                                    title="Bloquear acesso"
                                                >
                                                    <Ban className="w-3.5 h-3.5" />
                                                    Bloquear
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setReactivateTarget(member)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all"
                                                    title="Reativar acesso"
                                                >
                                                    <RefreshCw className="w-3.5 h-3.5" />
                                                    Reativar
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setArchiveTarget(member)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 border border-slate-600/50 rounded-lg hover:bg-slate-700/50 hover:border-slate-500 transition-all"
                                                title="Arquivar usuário"
                                            >
                                                <Archive className="w-3.5 h-3.5" />
                                                Arquivar
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            )}

            {/* Goals Tab — isolado */}
            {activeTab === 'goals' && <GoalsTab />}

            {/* Block Confirmation Modal */}
            <AnimatePresence>
                {blockTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
                        >
                            <div className="p-6">
                                <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                                    <Ban className="w-6 h-6 text-red-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white text-center">Bloquear usuário?</h3>
                                <p className="text-sm text-slate-400 text-center mt-2">
                                    <span className="text-white font-medium">{blockTarget.name}</span> perderá o acesso ao sistema imediatamente.
                                </p>
                            </div>
                            <div className="px-6 pb-6 flex gap-3">
                                <button
                                    onClick={() => setBlockTarget(null)}
                                    disabled={isBlocking}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-300 border border-slate-700 hover:bg-slate-800 transition-colors disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleBlockUser}
                                    disabled={isBlocking}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isBlocking
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : <Ban className="w-4 h-4" />
                                    }
                                    {isBlocking ? 'Bloqueando...' : 'Bloquear'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Reactivate Confirmation Modal */}
            <AnimatePresence>
                {reactivateTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
                        >
                            <div className="p-6">
                                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                                    <RefreshCw className="w-6 h-6 text-emerald-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white text-center">Reativar usuário?</h3>
                                <p className="text-sm text-slate-400 text-center mt-2">
                                    <span className="text-white font-medium">{reactivateTarget.name}</span> voltará a ter acesso ao sistema.
                                </p>
                            </div>
                            <div className="px-6 pb-6 flex gap-3">
                                <button
                                    onClick={() => setReactivateTarget(null)}
                                    disabled={isReactivating}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-300 border border-slate-700 hover:bg-slate-800 transition-colors disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleReactivateUser}
                                    disabled={isReactivating}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isReactivating
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : <RefreshCw className="w-4 h-4" />
                                    }
                                    {isReactivating ? 'Reativando...' : 'Reativar'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Archive Confirmation Modal */}
            <AnimatePresence>
                {archiveTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
                        >
                            <div className="p-6">
                                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                                    <Archive className="w-6 h-6 text-amber-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white text-center">Arquivar usuário?</h3>
                                <p className="text-sm text-slate-400 text-center mt-2">
                                    <span className="text-white font-medium">{archiveTarget.name}</span> será removido da equipe ativa. Isso indica que o funcionário saiu da empresa.
                                </p>
                            </div>
                            <div className="px-6 pb-6 flex gap-3">
                                <button
                                    onClick={() => setArchiveTarget(null)}
                                    disabled={isArchiving}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-300 border border-slate-700 hover:bg-slate-800 transition-colors disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleArchiveUser}
                                    disabled={isArchiving}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isArchiving
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : <Archive className="w-4 h-4" />
                                    }
                                    {isArchiving ? 'Arquivando...' : 'Arquivar'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Unarchive Confirmation Modal */}
            <AnimatePresence>
                {unarchiveTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
                        >
                            <div className="p-6">
                                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                                    <Archive className="w-6 h-6 text-emerald-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white text-center">Desarquivar usuário?</h3>
                                <p className="text-sm text-slate-400 text-center mt-2">
                                    <span className="text-white font-medium">{unarchiveTarget.name}</span> voltará para a lista de membros ativos.
                                </p>
                            </div>
                            <div className="px-6 pb-6 flex gap-3">
                                <button
                                    onClick={() => setUnarchiveTarget(null)}
                                    disabled={isUnarchiving}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-300 border border-slate-700 hover:bg-slate-800 transition-colors disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleUnarchiveUser}
                                    disabled={isUnarchiving}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isUnarchiving
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : <Archive className="w-4 h-4" />
                                    }
                                    {isUnarchiving ? 'Desarquivando...' : 'Desarquivar'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Invite Modal */}
            <AnimatePresence>
                {isInviteModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                        >
                            <div className="p-6 border-b border-slate-800 flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                                    <UserPlus className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Gerar Convite</h3>
                                    <p className="text-sm text-slate-400">Crie links de acesso para sua equipe</p>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                {inviteLinks.length > 0 && (
                                    <div className="space-y-3">
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Links Ativos</label>
                                        <div className="space-y-2">
                                            {inviteLinks.map(link => (
                                                <div key={link.id} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 flex items-center justify-between group">
                                                    <div className="overflow-hidden">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 uppercase">
                                                                {link.role}
                                                            </span>
                                                            <span className="text-xs text-slate-500">
                                                                Expira em {link.expiresAt ? new Date(link.expiresAt).toLocaleDateString() : 'Nunca'}
                                                            </span>
                                                        </div>
                                                        <div className="text-sm text-slate-300 font-mono truncate">
                                                            ...{link.token.substring(link.token.length - 8)}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => copyToClipboard(`${window.location.origin}/invite/${link.token}`)}
                                                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                                            title="Copiar Link"
                                                        >
                                                            <Copy className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteInvite(link.id)}
                                                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                            title="Revogar"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Cargo</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => setInviteRole('Vendedor')}
                                                className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${inviteRole === 'Vendedor' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                                            >
                                                <BriefcaseIcon className="w-4 h-4" />
                                                <span className="font-medium">Vendedor</span>
                                                {inviteRole === 'Vendedor' && <div className="w-2 h-2 rounded-full bg-blue-500 ml-1" />}
                                            </button>
                                            <button
                                                onClick={() => setInviteRole('Admin')}
                                                className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${inviteRole === 'Admin' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                                            >
                                                <Shield className="w-4 h-4" />
                                                <span className="font-medium">Admin</span>
                                                {inviteRole === 'Admin' && <div className="w-2 h-2 rounded-full bg-blue-500 ml-1" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Expiração</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {(['7 days', '30 days', 'never'] as const).map((opt) => (
                                                <button
                                                    key={opt}
                                                    onClick={() => setInviteExpiration(opt)}
                                                    className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${inviteExpiration === opt ? 'bg-white text-slate-900 border-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                                                >
                                                    {opt === '7 days' ? '7 dias' : opt === '30 days' ? '30 dias' : 'Nunca'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-800 flex justify-between items-center bg-slate-900/50">
                                <button
                                    onClick={() => setInviteModalOpen(false)}
                                    className="text-slate-400 hover:text-white font-medium transition-colors"
                                >
                                    Fechar
                                </button>
                                <div className="flex flex-col items-end gap-2">
                                    {generateError && <p className="text-xs text-red-400">{generateError}</p>}
                                    <button
                                        onClick={handleGenerateInvite}
                                        disabled={isGenerating}
                                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
                                    >
                                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                                        {isGenerating ? 'Gerando...' : 'Gerar Link'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const BriefcaseIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
);

export default TeamSettings;
