import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/features/auth/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlanStatus = 'trial' | 'active' | 'suspended';
export type PlanSlug   = 'trial' | 'legacy' | 'starter' | 'growth' | 'scale';

export interface BillingData {
  plan_status:     PlanStatus;
  plan_slug:       PlanSlug;
  trial_ends_at:   string | null;
  plan_expires_at: string | null;
}

export interface BillingContextValue {
  billing:         BillingData | null;
  isLoading:       boolean;
  /** Dias restantes no trial (0 se expirado ou não é trial) */
  daysRemaining:   number;
  /** true quando é trial E prazo passou */
  isTrialExpired:  boolean;
  /** true quando plan_status === 'trial' */
  isTrial:         boolean;
  /** true quando plan_status === 'active' */
  isActive:        boolean;
  refetch:         () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const BillingContext = createContext<BillingContextValue | null>(null);

export const BillingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { companyId } = useAuth();
  const [billing, setBilling]   = useState<BillingData | null>(null);
  const [isLoading, setLoading] = useState(true);

  const fetchBilling = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('companies')
      .select('plan_status, plan_slug, trial_ends_at, plan_expires_at')
      .eq('id', companyId)
      .maybeSingle();

    if (!error && data) setBilling(data as BillingData);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetchBilling(); }, [fetchBilling]);

  // ── Derivados ──────────────────────────────────────────────
  const now      = Date.now();
  const trialEnd = billing?.trial_ends_at ? new Date(billing.trial_ends_at).getTime() : null;
  const daysRemaining = trialEnd
    ? Math.max(0, Math.ceil((trialEnd - now) / 86_400_000))
    : 0;

  const isTrial        = billing?.plan_status === 'trial';
  const isTrialExpired = isTrial && daysRemaining === 0;
  const isActive       = billing?.plan_status === 'active';

  return (
    <BillingContext.Provider value={{
      billing,
      isLoading,
      daysRemaining,
      isTrialExpired,
      isTrial,
      isActive,
      refetch: fetchBilling,
    }}>
      {children}
    </BillingContext.Provider>
  );
};

export function useBilling(): BillingContextValue {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error('useBilling must be used inside <BillingProvider>');
  return ctx;
}
