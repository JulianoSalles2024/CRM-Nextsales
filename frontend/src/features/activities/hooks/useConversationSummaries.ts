import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';

export interface ConversationSummary {
  id: string;
  contact_name: string | null;
  contact_identifier: string;
  ai_summary: string;
  ai_summary_at: string;
  last_message_at: string | null;
}

export function useConversationSummaries(leadId: string | null) {
  const [summaries, setSummaries] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSummaries = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    const { data, error } = await supabase
      .rpc('get_lead_conversation_summaries', { p_lead_id: leadId });

    if (!error && data) setSummaries(data as ConversationSummary[]);
    setLoading(false);
  }, [leadId]);

  useEffect(() => { fetchSummaries(); }, [fetchSummaries]);

  return { summaries, loading, refetch: fetchSummaries };
}
