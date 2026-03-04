import { useAuth } from '@/src/features/auth/AuthContext';
import React, { useEffect, useMemo, useState } from 'react';
import { Phone, Shield, Check, Save, User, AtSign, Lock, Pencil } from 'lucide-react';
import { ProfileAvatar } from './components/ProfileAvatar';
import FlatCard from '@/components/ui/FlatCard';

// ⚠️ mantenha o mesmo import do seu projeto (o que já está funcionando)
import { supabase } from '@/src/lib/supabase';

type ProfileForm = {
  firstName: string;
  lastName: string;
  nickname: string;
  role: string;
  phone: string;
  avatarUrl: string;
};

export const ProfileView: React.FC = () => {
  const { user: authUser, currentUserRole } = useAuth();

  const defaultProfile: ProfileForm = useMemo(
    () => ({
      firstName: '',
      lastName: '',
      nickname: '',
      role: currentUserRole ? String(currentUserRole).toUpperCase() : 'USER',
      phone: '',
      avatarUrl: 'https://i.pravatar.cc/150',
    }),
    [currentUserRole]
  );

  const [user, setUser] = useState<ProfileForm>(defaultProfile);
  const [editData, setEditData] = useState<ProfileForm>(defaultProfile);
  const [previewUrl, setPreviewUrl] = useState<string>(defaultProfile.avatarUrl);
  const [saved, setSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // 🔹 Carrega do Supabase (inclui name/avatar como fallback)
  useEffect(() => {
    const run = async () => {
      if (!authUser) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('name,avatar,first_name,last_name,nickname,phone,avatar_url')
        .eq('id', authUser.id)
        .single();

      if (error) {
        safeError('[ProfileView] failed to load profile:', error);
        const fallback: ProfileForm = {
          ...defaultProfile,
          role: currentUserRole ? String(currentUserRole).toUpperCase() : defaultProfile.role,
        };
        setUser(fallback);
        setEditData(fallback);
        setPreviewUrl(fallback.avatarUrl);
        setIsEditing(false);
        setSaved(false);
        return;
      }

      // fallback do nome: se não tiver first/last/nickname, tenta quebrar "name"
      const nameStr = (data?.name ?? '').trim();
      const fallbackFirst = nameStr ? nameStr.split(' ')[0] : '';
      const fallbackLast = nameStr ? nameStr.split(' ').slice(1).join(' ') : '';

      const loaded: ProfileForm = {
        firstName: data?.first_name ?? fallbackFirst,
        lastName: data?.last_name ?? fallbackLast,
        nickname: data?.nickname ?? '',
        phone: data?.phone ?? '',
        avatarUrl: data?.avatar_url ?? data?.avatar ?? defaultProfile.avatarUrl,
        role: currentUserRole ? String(currentUserRole).toUpperCase() : defaultProfile.role,
      };

      setUser(loaded);
      setEditData(loaded);
      setPreviewUrl(loaded.avatarUrl);
      setIsEditing(false);
      setSaved(false);
    };

    run();
  }, [authUser, defaultProfile, currentUserRole]);

  const handleImageChange = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setPreviewUrl(base64);
      setEditData(prev => ({ ...prev, avatarUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    const defaultUrl = 'https://i.pravatar.cc/150';
    setPreviewUrl(defaultUrl);
    setEditData(prev => ({ ...prev, avatarUrl: defaultUrl }));
  };

  // 🔹 Salva no Supabase (ATUALIZA TAMBÉM name e avatar para a tela de Equipe refletir)
  const handleSave = async () => {
    if (!authUser) return;

    const roleToShow = currentUserRole ? String(currentUserRole).toUpperCase() : editData.role;

    const fullName = `${editData.firstName} ${editData.lastName}`.trim();
    const nameToSave = (editData.nickname?.trim() || fullName || '—').trim();

    const { data, error } = await supabase
      .from('profiles')
      .update({
        // campos “novos”
        first_name: editData.firstName,
        last_name: editData.lastName,
        nickname: editData.nickname,
        phone: editData.phone,
        avatar_url: editData.avatarUrl,

        // campos “legados” que a tela Equipe costuma usar
        name: nameToSave,
        avatar: editData.avatarUrl,

        updated_at: new Date().toISOString(),
      })
      .eq('id', authUser.id)
      .select('name,avatar,first_name,last_name,nickname,phone,avatar_url')
      .single();

    if (error) {
      safeError('[ProfileView] failed to save profile:', error);
      return; // não fecha edição
    }

    const savedProfile: ProfileForm = {
      firstName: data?.first_name ?? editData.firstName,
      lastName: data?.last_name ?? editData.lastName,
      nickname: data?.nickname ?? editData.nickname,
      phone: data?.phone ?? editData.phone,
      avatarUrl: data?.avatar_url ?? data?.avatar ?? editData.avatarUrl,
      role: roleToShow,
    };

    setUser(savedProfile);
    setEditData(savedProfile);
    setPreviewUrl(savedProfile.avatarUrl);

    window.dispatchEvent(new CustomEvent('profile-updated', { detail: savedProfile }));

    setSaved(true);
    setIsEditing(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCancel = () => {
    setEditData(user);
    setPreviewUrl(user.avatarUrl);
    setIsEditing(false);
  };

  const inputClass = `w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 ${
    isEditing
      ? 'bg-white/[0.04] border border-white/[0.08] focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/40'
      : 'bg-transparent border border-transparent cursor-default'
  }`;

  return (
    <div className="max-w-3xl mx-auto py-10 px-6 space-y-6">
      {/* ── Card 1: User Info ──────────────────────────────── */}
      <FlatCard className="relative rounded-2xl">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="flex items-center justify-between px-8 pt-8 pb-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-5">
            <div className={!isEditing ? 'pointer-events-none' : ''}>
              <ProfileAvatar avatarUrl={previewUrl} onImageChange={handleImageChange} onRemove={handleRemoveAvatar} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white leading-tight">
                {editData.nickname || `${editData.firstName} ${editData.lastName}`.trim()}
              </h2>
              <p className="text-sm text-slate-400 mt-0.5">
                {(editData.firstName || editData.lastName) ? `${editData.firstName} ${editData.lastName}`.trim() : '—'}
              </p>
              <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {currentUserRole ? String(currentUserRole).toUpperCase() : editData.role}
              </span>
            </div>
          </div>

          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 text-sky-400 hover:text-sky-300 transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Editar
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button onClick={handleCancel} className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg transition-all active:scale-[0.97] ${
                  saved ? 'bg-emerald-500 shadow-emerald-500/20 text-white' : 'bg-sky-600 hover:bg-sky-500 shadow-sky-500/20 text-white'
                }`}
              >
                {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saved ? 'Salvo!' : 'Salvar'}
              </button>
            </div>
          )}
        </div>

        {/* Form fields (APENAS QUANDO EDITANDO) */}
        {isEditing && (
          <div className="px-8 py-7 space-y-5">
            {/* Nome + Sobrenome */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 mt-1 rounded-lg bg-slate-700/50 flex items-center justify-center">
                <User className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Nome</label>
                  <input
                    type="text"
                    value={editData.firstName}
                    onChange={e => setEditData({ ...editData, firstName: e.target.value })}
                    disabled={!isEditing}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Sobrenome</label>
                  <input
                    type="text"
                    value={editData.lastName}
                    onChange={e => setEditData({ ...editData, lastName: e.target.value })}
                    disabled={!isEditing}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-white/[0.04]" />

            {/* Apelido */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 mt-1 rounded-lg bg-slate-700/50 flex items-center justify-center">
                <AtSign className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Apelido</label>
                <input
                  type="text"
                  value={editData.nickname}
                  onChange={e => setEditData({ ...editData, nickname: e.target.value })}
                  disabled={!isEditing}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="border-t border-white/[0.04]" />

            {/* Telefone */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 mt-1 rounded-lg bg-slate-700/50 flex items-center justify-center">
                <Phone className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Telefone</label>
                <input
                  type="text"
                  value={editData.phone}
                  onChange={e => setEditData({ ...editData, phone: e.target.value })}
                  disabled={!isEditing}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}
      </FlatCard>

      {/* ── Card 2: Security ──────────────────────────────── */}
      <FlatCard className="relative rounded-2xl">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="flex items-center justify-between px-8 py-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl bg-slate-700/50 flex items-center justify-center">
              <Shield className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Segurança</h3>
              <p className="text-xs text-slate-500 mt-0.5">Gerencie sua senha de acesso.</p>
            </div>
          </div>
          <button
            onClick={() => setShowPasswordForm(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
              showPasswordForm
                ? 'bg-slate-700/60 border-slate-500 text-white'
                : 'border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Alterar Senha
          </button>
        </div>

        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showPasswordForm ? 'max-h-80' : 'max-h-0'}`}>
          <div
            className={`px-8 pb-8 pt-6 border-t border-white/[0.06] space-y-4 transition-all duration-300 ease-in-out ${
              showPasswordForm ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
            }`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="new-password" className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Nova Senha
                </label>
                <input id="new-password" type="password" placeholder="Mínimo 6 caracteres" className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="confirm-password" className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Confirmar Nova Senha
                </label>
                <input id="confirm-password" type="password" placeholder="Digite novamente" className={inputClass} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowPasswordForm(false)}
                className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => setShowPasswordForm(false)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/20 transition-all active:scale-[0.97]"
              >
                <Lock className="w-3.5 h-3.5" />
                Salvar Senha
              </button>
            </div>
          </div>
        </div>
      </FlatCard>
    </div>
  );
};