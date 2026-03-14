import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/features/auth/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompanySettings {
  id: string;
  company_id: string;
  /** Horas de inatividade para encerramento automático. null = desativado. */
  auto_close_hours: number | null;
  created_at: string;
  updated_at: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCompanySettings() {
  const { companyId } = useAuth();

  const [settings,  setSettings]  = useState<CompanySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving,  setIsSaving]  = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchSettings = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);

    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle();  // 0 rows é válido — empresa ainda não configurou

    if (error) {
      setError('Não foi possível carregar as configurações da empresa.');
    } else {
      setSettings(data as CompanySettings | null);
      setError(null);
    }

    setIsLoading(false);
  }, [companyId]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // ── Update auto_close_hours ────────────────────────────────────────────────
  // Usa UPSERT: cria a linha se ainda não existir, atualiza se já existir.
  // O campo updated_at é tocado sempre que há alteração.

  const updateAutoCloseHours = useCallback(async (hours: number | null): Promise<boolean> => {
    if (!companyId) return false;
    setIsSaving(true);
    setError(null);

    const { data, error } = await supabase
      .from('company_settings')
      .upsert(
        { company_id: companyId, auto_close_hours: hours, updated_at: new Date().toISOString() },
        { onConflict: 'company_id' }
      )
      .select()
      .maybeSingle();

    if (error) {
      setError('Não foi possível salvar a configuração. Tente novamente.');
      setIsSaving(false);
      return false;
    }

    if (data) setSettings(data as CompanySettings);
    setIsSaving(false);
    return true;
  }, [companyId]);

  return {
    settings,
    isLoading,
    isSaving,
    error,
    /** Recarrega as configurações do banco. */
    refetch: fetchSettings,
    /** Atualiza horas de inatividade para encerramento automático. null = desativar. */
    updateAutoCloseHours,
  };
}
