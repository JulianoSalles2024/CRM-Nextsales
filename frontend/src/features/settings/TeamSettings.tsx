import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, InviteLink, UserRole } from '@/types';
import { Users, UserPlus, Copy, Check, Trash2, Shield, Loader2, Ban, RefreshCw, Archive, CalendarDays } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/features/auth/AuthContext';
import GoalsTab from './GoalsTab';
import FlatCard from '@/components/ui/FlatCard';
import { PlanGuard } from '@/src/components/PlanGuard';

interface TeamMember {
    id: string;
    email: string;
    name: string;
    role: string;
    joinedAt: string;
    isActive: boolean;
    isArchived: boolean;
    archivedAt?: string;
    inviteId?: string;
    inviteExpiresAt?: string | null;
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

// ── Reusable sliding-pill tab bar ─────────────────────────────────────────────
const SlidingPillTabs: React.FC<{
    tabs: { v: string; l: string; badge?: number }[];
    active: string;
    onChange: (v: string) => void;
}> = ({ tabs, active, onChange }) => {
    const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const [pill, setPill] = useState({ left: 0, width: 0 });

    const measure = () => {
        const idx = tabs.findIndex(t => t.v === active);
        const el = btnRefs.current[idx];
        if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
    };

    useEffect(() => { measure(); }, [active]);
    useEffect(() => { measure(); }, []);

    return (
        <div className="relative flex items-center bg-slate-900/60 border border-blue-500/10 rounded-xl p-1">
            <div
                className="absolute top-1 bottom-1 rounded-lg bg-sky-500/5 border border-sky-500/20 transition-all duration-300 ease-in-out pointer-events-none"
                style={{ left: pill.left, width: pill.width }}
            />
            {tabs.map(({ v, l, badge }, i) => (
                <button
                    key={v}
                    ref={el => { btnRefs.current[i] = el; }}
                    onClick={() => onChange(v)}
                    className={`relative z-10 flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg transition-colors duration-200 whitespace-nowrap ${
                        active === v ? 'text-sky-400' : 'text-slate-500 hover:text-slate-300'
                    }`}
                >
                    {l}
                    {!!badge && <span className="text-xs opacity-60">({badge})</span>}
                </button>
            ))}
        </div>
    );
};

const TeamSettings: React.FC<TeamSettingsProps> = ({ users, currentUser, onUpdateUsers }) => {
    const { currentPermissions, currentUserRole, companyId } = useAuth();
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

    // Delete state
    const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Extend access state
    const [extendTarget, setExtendTarget] = useState<TeamMember | null>(null);
    const [isExtending, setIsExtending] = useState(false);

    const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
    const [inviteModalTab, setInviteModalTab] = useState<'create' | 'history'>('create');
    const [sentInvites, setSentInvites] = useState<any[]>([]);
    const [isFetchingInvites, setIsFetchingInvites] = useState(false);
    const [copiedHistoryToken, setCopiedHistoryToken] = useState<string | null>(null);

    // Tab state
    const [activeTab, setActiveTab] = useState<'active' | 'archived' | 'goals'>('active');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 4;
    const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'seller'>('all');

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchMembers = useCallback(async () => {
        setIsFetchingUsers(true);
        const [{ data, error }, { data: inviteData }] = await Promise.all([
            supabase
                .from('profiles')
                .select('id, name, email, role, company_id, created_at, is_active, is_archived, archived_at')
                .eq('company_id', companyId ?? '')
                .order('created_at', { ascending: true }),
            supabase
                .from('invites')
                .select('id, role, expires_at, used_at')
                .eq('company_id', companyId ?? ''),
        ]);
        if (error) {
            console.error('[TeamSettings] fetchMembers error:', error.message, '| code:', error.code);
        } else if (data) {
            const invites = inviteData ?? [];
            setSupabaseMembers(data.map(p => {
                const joinedMs = new Date(p.created_at).getTime();
                const matched = invites.find((inv: any) =>
                    inv.used_at &&
                    inv.role === p.role &&
                    Math.abs(new Date(inv.used_at).getTime() - joinedMs) < 15000
                );
                return {
                    id: p.id,
                    email: p.email ?? '',
                    name: p.name ?? p.email ?? '',
                    role: p.role === 'admin' ? 'Admin' : 'Vendedor',
                    joinedAt: p.created_at,
                    isActive: p.is_active !== false,
                    isArchived: p.is_archived === true,
                    archivedAt: p.archived_at ?? undefined,
                    inviteId: matched?.id ?? undefined,
                    inviteExpiresAt: matched?.expires_at ?? undefined,
                };
            }));
        }
        setIsFetchingUsers(false);
    }, [companyId]);

    useEffect(() => { fetchMembers(); }, [fetchMembers]);

    const displayMembers = supabaseMembers.length > 0
        ? supabaseMembers
        : users.map(u => ({ ...u, role: u.role ?? 'Vendedor', joinedAt: u.joinedAt ?? '', isActive: true, isArchived: false }));

    const activeMembers = displayMembers.filter(m => m.isActive && !m.isArchived);
    const archivedMembers = displayMembers.filter(m => m.isArchived || !m.isActive);
    const tabMembers = activeTab === 'active' ? activeMembers : archivedMembers;

    const filteredMembers = activeTab === 'active'
        ? tabMembers.filter(member => {
            if (roleFilter === 'all')    return true;
            if (roleFilter === 'admin')  return member.role === 'Admin';
            if (roleFilter === 'seller') return member.role === 'Vendedor';
            return true;
        })
        : tabMembers;

    const totalPages       = Math.ceil(filteredMembers.length / pageSize);
    const paginatedMembers = filteredMembers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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

    const handleDeleteUser = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        const [blockResult, archiveResult] = await Promise.all([
            supabase.rpc('admin_block_user', { p_user_id: deleteTarget.id }),
            supabase.rpc('admin_archive_user', { p_user_id: deleteTarget.id }),
        ]);
        setIsDeleting(false);
        setDeleteTarget(null);
        const error = blockResult.error ?? archiveResult.error;
        if (error) {
            showToast(`Erro ao excluir: ${error.message}`, 'error');
        } else {
            await fetchMembers();
            showToast('Usuário removido com sucesso', 'success');
        }
    };

    const handleExtendAccess = async (days: number | null) => {
        if (!extendTarget?.inviteId) return;
        setIsExtending(true);
        const newExpiresAt = days === null ? null : (() => {
            const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString();
        })();
        const { error } = await supabase
            .from('invites')
            .update({ expires_at: newExpiresAt })
            .eq('id', extendTarget.inviteId);
        setIsExtending(false);
        setExtendTarget(null);
        if (error) {
            showToast(`Erro ao atualizar acesso: ${error.message}`, 'error');
        } else {
            await fetchMembers();
            showToast('Período de acesso atualizado', 'success');
        }
    };

    // Invite Modal State
    const [inviteRole, setInviteRole] = useState<UserRole>('Vendedor');
    const [inviteExpiration, setInviteExpiration] = useState<'7 days' | '30 days' | 'never'>('7 days');
    const [inviteEmail, setInviteEmail] = useState('');
    const [emailSentSuccess, setEmailSentSuccess] = useState(false);

    const handleGenerateInvite = async () => {
        setIsGenerating(true);
        setGenerateError(null);
        setEmailSentSuccess(false);
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
                .from('profiles').select('company_id, name').eq('id', user!.id).single();
            const companyId = profile?.company_id ?? null;
            const { data, error } = await supabase
                .from('invites')
                .insert({ token, role: roleValue, company_id: companyId, expires_at: expiresAt, email: inviteEmail.trim() || null })
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

            // Se email preenchido, envia via Edge Function
            if (inviteEmail.trim()) {
                const inviteLink = `${window.location.origin}/invite/${token}`;
                const { error: fnError } = await supabase.functions.invoke('send-invite', {
                    body: {
                        email: inviteEmail.trim(),
                        invite_link: inviteLink,
                        invited_by_name: profile?.name ?? currentUser.name ?? 'Admin',
                        role: roleValue,
                        expires_at: expiresAt,
                    },
                });
                if (fnError) throw new Error('Convite gerado, mas falha ao enviar email: ' + fnError.message);
                setEmailSentSuccess(true);
                setInviteEmail('');
            }
        } catch (err: any) {
            setGenerateError(err.message ?? 'Erro ao gerar convite.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDeleteInvite = (id: string) => setInviteLinks(prev => prev.filter(l => l.id !== id));
    const copyToClipboard = (text: string, inviteId: string) => {
        navigator.clipboard.writeText(text);
        setCopiedInviteId(inviteId);
        setTimeout(() => setCopiedInviteId(null), 2000);
    };

    const getInviteStatus = (invite: { used_at: string | null; expires_at: string | null }) => {
        if (invite.used_at) return 'usado' as const;
        if (invite.expires_at && new Date(invite.expires_at) < new Date()) return 'expirado' as const;
        return 'ativo' as const;
    };

    const fetchSentInvites = async () => {
        if (!companyId) return;
        setIsFetchingInvites(true);
        try {
            const [{ data: inviteData }, { data: profileData }] = await Promise.all([
                supabase
                    .from('invites')
                    .select('id, token, role, created_at, expires_at, used_at')
                    .eq('company_id', companyId)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('profiles')
                    .select('email, name, role, created_at')
                    .eq('company_id', companyId),
            ]);

            const profiles = profileData ?? [];
            const invites = (inviteData ?? []).map((invite: any) => {
                let usedByEmail: string | null = null;
                if (invite.used_at) {
                    const usedAt = new Date(invite.used_at).getTime();
                    const match = profiles.find(
                        (p: any) =>
                            p.role === invite.role &&
                            Math.abs(new Date(p.created_at).getTime() - usedAt) < 15000
                    );
                    usedByEmail = match?.email ?? null;
                }
                return { ...invite, usedByEmail };
            });

            setSentInvites(invites);
        } finally {
            setIsFetchingInvites(false);
        }
    };

    const deleteSentInvite = async (id: string) => {
        await supabase.from('invites').delete().eq('id', id);
        setSentInvites(prev => prev.filter((i: any) => i.id !== id));
    };

    const copyHistoryLink = (token: string) => {
        navigator.clipboard.writeText(`${window.location.origin}/invite/${token}`);
        setCopiedHistoryToken(token);
        setTimeout(() => setCopiedHistoryToken(null), 2000);
    };
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
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 12 }}
                        className={`fixed bottom-5 right-5 z-[100] px-5 py-3 rounded-xl text-sm font-medium shadow-lg border ${
                            toast.type === 'success'
                                ? 'bg-blue-950 border-blue-700 text-sky-300'
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
                    <PlanGuard limit="max_users" current={activeMembers.length} reason="Limite de usuários atingido no seu plano">
                        <button
                            onClick={() => setInviteModalOpen(true)}
                            className="flex items-center gap-2 border border-sky-500/30 text-sky-400 bg-sky-500/5 hover:bg-sky-500/10 hover:border-sky-500/50 transition-all px-4 py-2 rounded-xl font-semibold transition-all duration-200"
                        >
                            <UserPlus className="w-4 h-4" />
                            Convidar
                        </button>
                    </PlanGuard>
                )}
            </div>

            {/* Tabs + Role Filter */}
            <div className="flex items-center justify-between gap-6">
                {/* Ativos / Arquivados / Metas — sliding pill */}
                <SlidingPillTabs
                    tabs={[
                        { v: 'active',   l: 'Ativos',    badge: activeMembers.length   },
                        { v: 'archived', l: 'Arquivados', badge: archivedMembers.length },
                        { v: 'goals',    l: 'Metas'                                     },
                    ]}
                    active={activeTab}
                    onChange={v => { setActiveTab(v as typeof activeTab); setCurrentPage(1); }}
                />

                {/* Todos / Admin / Vendedores — sliding pill */}
                {activeTab === 'active' && (
                    <SlidingPillTabs
                        tabs={[
                            { v: 'all',    l: 'Todos'     },
                            { v: 'admin',  l: 'Admin'     },
                            { v: 'seller', l: 'Vendedores'},
                        ]}
                        active={roleFilter}
                        onChange={v => { setRoleFilter(v as typeof roleFilter); setCurrentPage(1); }}
                    />
                )}
            </div>

            {/* Members List — só para abas de equipe */}
            {activeTab !== 'goals' && (
            <FlatCard className="overflow-hidden">
                <div className="divide-y divide-slate-800">
                    {isFetchingUsers ? (
                        <div className="p-6 flex justify-center">
                            <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
                        </div>
                    ) : (currentPermissions.canManageTeam ? paginatedMembers : paginatedMembers.filter(u => u.id === currentUser.id)).map(member => (
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
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-sky-400 uppercase tracking-wider">
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
                                        {member.inviteExpiresAt && new Date(member.inviteExpiresAt) < new Date() && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/15 text-orange-400 uppercase tracking-wider border border-orange-500/20">
                                                Expirado
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
                                        {member.inviteExpiresAt && (
                                            <>
                                                <span>•</span>
                                                <span className={`flex items-center gap-1 ${new Date(member.inviteExpiresAt) < new Date() ? 'text-orange-400' : 'text-slate-500'}`}>
                                                    <CalendarDays className="w-3 h-3" />
                                                    {new Date(member.inviteExpiresAt) < new Date() ? 'Expirou em ' : 'Expira em '}
                                                    {new Date(member.inviteExpiresAt).toLocaleDateString('pt-BR')}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Actions — only admin, not for self */}
                            {isAdmin && member.id !== currentUser.id && (
                                <div className="flex items-center gap-2">
                                    {activeTab === 'archived' ? (
                                        <>
                                        <button
                                            onClick={() => setUnarchiveTarget(member)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/10 hover:border-amber-500/50 transition-all"
                                            title="Desarquivar usuário"
                                        >
                                            <Archive className="w-3.5 h-3.5" />
                                            Desarquivar
                                        </button>
                                        <button
                                            onClick={() => setDeleteTarget(member)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 hover:border-red-500/50 transition-all"
                                            title="Excluir usuário"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Excluir
                                        </button>
                                        </>
                                    ) : (
                                        <>
                                            {member.inviteId && (
                                                <button
                                                    onClick={() => setExtendTarget(member)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-400 border border-sky-500/30 rounded-lg hover:bg-sky-500/5 hover:border-sky-500/50 transition-all"
                                                    title="Editar período de acesso"
                                                >
                                                    <CalendarDays className="w-3.5 h-3.5" />
                                                    Acesso
                                                </button>
                                            )}
                                            {member.isActive ? (
                                                <button
                                                    onClick={() => setBlockTarget(member)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/10 hover:border-amber-500/50 transition-all"
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
                                            <button
                                                onClick={() => setDeleteTarget(member)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 hover:border-red-500/50 transition-all"
                                                title="Excluir usuário"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Excluir
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                {activeTab === 'active' && !isFetchingUsers && totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                disabled={page === currentPage}
                                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                    page === currentPage
                                        ? 'bg-slate-700 text-white cursor-default'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                )}
            </FlatCard>
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

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
                        >
                            <div className="p-6">
                                <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                                    <Trash2 className="w-6 h-6 text-red-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white text-center">Excluir usuário?</h3>
                                <p className="text-sm text-slate-400 text-center mt-2">
                                    Realmente gostaria de excluir o usuário{' '}
                                    <span className="text-white font-medium">{deleteTarget.name}</span>?
                                    Os leads cadastrados por ele serão mantidos.
                                </p>
                            </div>
                            <div className="px-6 pb-6 flex gap-3">
                                <button
                                    onClick={() => setDeleteTarget(null)}
                                    disabled={isDeleting}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-300 border border-slate-700 hover:bg-slate-800 transition-colors disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleDeleteUser}
                                    disabled={isDeleting}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isDeleting
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : <Trash2 className="w-4 h-4" />
                                    }
                                    {isDeleting ? 'Excluindo...' : 'Excluir'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Extend Access Modal */}
            <AnimatePresence>
                {extendTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
                        >
                            <div className="p-6">
                                <div className="w-12 h-12 rounded-xl bg-sky-500/5 border border-sky-500/20 flex items-center justify-center mx-auto mb-4">
                                    <CalendarDays className="w-6 h-6 text-sky-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white text-center">Editar período de acesso</h3>
                                <p className="text-sm text-slate-400 text-center mt-1 mb-1">
                                    <span className="text-white font-medium">{extendTarget.name}</span>
                                </p>
                                {extendTarget.inviteExpiresAt && (
                                    <p className="text-xs text-center mb-4 text-slate-500">
                                        Acesso atual:{' '}
                                        <span className={new Date(extendTarget.inviteExpiresAt) < new Date() ? 'text-orange-400' : 'text-slate-300'}>
                                            {new Date(extendTarget.inviteExpiresAt).toLocaleDateString('pt-BR')}
                                            {new Date(extendTarget.inviteExpiresAt) < new Date() ? ' (expirado)' : ''}
                                        </span>
                                    </p>
                                )}
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { label: '+30 dias', days: 30 },
                                        { label: '+90 dias', days: 90 },
                                        { label: '+1 ano',   days: 365 },
                                        { label: 'Sem expiração', days: null },
                                    ].map(({ label, days }) => (
                                        <button
                                            key={label}
                                            onClick={() => handleExtendAccess(days)}
                                            disabled={isExtending}
                                            className="py-2.5 rounded-xl text-sm font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500/40 text-slate-300 hover:text-white transition-all disabled:opacity-50"
                                        >
                                            {isExtending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="px-6 pb-6">
                                <button
                                    onClick={() => setExtendTarget(null)}
                                    disabled={isExtending}
                                    className="w-full py-2.5 rounded-xl text-sm font-medium text-slate-400 border border-slate-700 hover:bg-slate-800 transition-colors disabled:opacity-50"
                                >
                                    Cancelar
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
                            className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-slate-800 flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-sky-500/5 text-blue-500">
                                    <UserPlus className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Convites</h3>
                                    <p className="text-sm text-slate-400">Gerencie os acessos da sua equipe</p>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex border-b border-slate-800">
                                <button
                                    onClick={() => setInviteModalTab('create')}
                                    className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${inviteModalTab === 'create' ? 'text-white border-blue-500' : 'text-slate-400 border-transparent hover:text-white'}`}
                                >
                                    Criar Convite
                                </button>
                                <button
                                    onClick={() => { setInviteModalTab('history'); fetchSentInvites(); }}
                                    className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${inviteModalTab === 'history' ? 'text-white border-blue-500' : 'text-slate-400 border-transparent hover:text-white'}`}
                                >
                                    Convites Enviados
                                </button>
                            </div>

                            {inviteModalTab === 'create' ? (
                                <>
                                    {/* Criar convite — corpo original inalterado */}
                                    <div className="p-6 space-y-6">
                                        {inviteLinks.length > 0 && (
                                            <div className="space-y-3">
                                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Links Ativos</label>
                                                <div className="space-y-2">
                                                    {inviteLinks.map(link => (
                                                        <div key={link.id} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 flex items-center justify-between group">
                                                            <div className="overflow-hidden">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 uppercase">
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
                                                                    onClick={() => copyToClipboard(`${window.location.origin}/invite/${link.token}`, link.id)}
                                                                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                                                    title="Copiar Link"
                                                                >
                                                                    {copiedInviteId === link.id
                                                                        ? <Check className="w-4 h-4 text-green-400" />
                                                                        : <Copy className="w-4 h-4" />
                                                                    }
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
                                                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${inviteRole === 'Vendedor' ? 'bg-sky-500/5 border-blue-500 text-sky-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                                                    >
                                                        <BriefcaseIcon className="w-4 h-4" />
                                                        <span className="font-medium">Vendedor</span>
                                                        {inviteRole === 'Vendedor' && <div className="w-2 h-2 rounded-full bg-blue-500 ml-1" />}
                                                    </button>
                                                    <button
                                                        onClick={() => setInviteRole('Admin')}
                                                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${inviteRole === 'Admin' ? 'bg-sky-500/5 border-blue-500 text-sky-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}
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

                                    <div className="px-6 pb-2">
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Enviar por email <span className="text-slate-500 font-normal">(opcional)</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={inviteEmail}
                                            onChange={e => { setInviteEmail(e.target.value); setEmailSentSuccess(false); }}
                                            placeholder="email@exemplo.com"
                                            className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-blue-500/40 transition-all"
                                        />
                                        {emailSentSuccess && (
                                            <p className="mt-1.5 text-xs text-green-400 flex items-center gap-1">
                                                <Check className="w-3 h-3" /> Email enviado com sucesso!
                                            </p>
                                        )}
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
                                                className="border border-sky-500/30 text-sky-400 bg-sky-500/5 hover:bg-sky-500/10 hover:border-sky-500/50 transition-all px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all duration-200"
                                            >
                                                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                                                {isGenerating ? 'Gerando...' : inviteEmail.trim() ? 'Gerar e Enviar' : 'Gerar Link'}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Convites Enviados */}
                                    <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                                        {isFetchingInvites ? (
                                            <div className="flex items-center justify-center py-10">
                                                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                                            </div>
                                        ) : (
                                            <>
                                                {/* Dashboard */}
                                                {(() => {
                                                    const total = sentInvites.length;
                                                    const ativos = sentInvites.filter(i => getInviteStatus(i) === 'ativo').length;
                                                    const usados = sentInvites.filter(i => getInviteStatus(i) === 'usado').length;
                                                    const expirados = sentInvites.filter(i => getInviteStatus(i) === 'expirado').length;
                                                    return (
                                                        <div className="grid grid-cols-4 gap-3">
                                                            {[
                                                                { label: 'Total', value: total, color: 'text-slate-300' },
                                                                { label: 'Ativos', value: ativos, color: 'text-emerald-400' },
                                                                { label: 'Usados', value: usados, color: 'text-sky-400' },
                                                                { label: 'Expirados', value: expirados, color: 'text-red-400' },
                                                            ].map(({ label, value, color }) => (
                                                                <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center">
                                                                    <p className={`text-xl font-bold ${color}`}>{value}</p>
                                                                    <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })()}

                                                {/* Lista */}
                                                {sentInvites.length === 0 ? (
                                                    <p className="text-sm text-slate-500 text-center py-6">Nenhum convite enviado ainda.</p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {sentInvites.map((invite) => {
                                                            const status = getInviteStatus(invite);
                                                            const statusConfig = {
                                                                ativo:    { label: 'Ativo',    cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
                                                                usado:    { label: 'Usado',    cls: 'bg-sky-500/5 text-sky-400 border-sky-500/20' },
                                                                expirado: { label: 'Expirado', cls: 'bg-red-500/15 text-red-400 border-red-500/20' },
                                                            };
                                                            const sc = statusConfig[status];
                                                            return (
                                                                <div key={invite.token} className="bg-slate-800/40 border border-slate-700/50 rounded-lg px-3 py-2.5 flex items-center justify-between gap-2">
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 mb-0.5">
                                                                            <span className="text-xs font-semibold text-slate-300">
                                                                                {invite.role === 'seller' ? 'Vendedor' : 'Admin'}
                                                                            </span>
                                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${sc.cls}`}>
                                                                                {sc.label}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center gap-3 text-[10px] text-slate-500">
                                                                            <span>Criado: {new Date(invite.created_at).toLocaleDateString('pt-BR')}</span>
                                                                            <span>Expira: {invite.expires_at ? new Date(invite.expires_at).toLocaleDateString('pt-BR') : 'Nunca'}</span>
                                                                        </div>
                                                                        {status === 'usado' && (
                                                                            <div className="mt-0.5 text-[10px] text-slate-400 truncate">
                                                                                {invite.usedByEmail
                                                                                    ? <span>Usado por: <span className="text-slate-300 font-medium">{invite.usedByEmail}</span></span>
                                                                                    : <span className="text-slate-600 italic">email não identificado</span>
                                                                                }
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                                        {status === 'ativo' && (
                                                                            <button
                                                                                onClick={() => copyHistoryLink(invite.token)}
                                                                                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                                                                title="Copiar link de convite"
                                                                            >
                                                                                {copiedHistoryToken === invite.token
                                                                                    ? <Check className="w-3.5 h-3.5 text-green-400" />
                                                                                    : <Copy className="w-3.5 h-3.5" />
                                                                                }
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            onClick={() => deleteSentInvite(invite.id)}
                                                                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                                            title="Excluir convite"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    <div className="p-4 border-t border-slate-800 flex justify-between items-center bg-slate-900/50">
                                        <button
                                            onClick={() => setInviteModalOpen(false)}
                                            className="text-slate-400 hover:text-white font-medium transition-colors text-sm"
                                        >
                                            Fechar
                                        </button>
                                        <button
                                            onClick={fetchSentInvites}
                                            disabled={isFetchingInvites}
                                            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                                        >
                                            <RefreshCw className={`w-4 h-4 ${isFetchingInvites ? 'animate-spin' : ''}`} />
                                            Atualizar
                                        </button>
                                    </div>
                                </>
                            )}
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
