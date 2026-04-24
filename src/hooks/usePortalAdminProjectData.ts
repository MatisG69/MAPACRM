import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type {
  CalendarEvent,
  Invoice,
  Project,
  ProjectChecklistItem,
  Quote,
} from '../lib/types';

interface PortalAdminProjectState {
  loading: boolean;
  error: string | null;
  project: Project | null;
  quotes: Quote[];
  invoices: Invoice[];
  events: CalendarEvent[];
  checklist: ProjectChecklistItem[];
}

/**
 * Agrège toutes les données liées à un projet pour la vue admin Identifiants
 * (Overlay plein écran) : projet, devis, factures, agenda, checklist.
 */
export function usePortalAdminProjectData(projectId: string | null | undefined) {
  const [state, setState] = useState<PortalAdminProjectState>({
    loading: false,
    error: null,
    project: null,
    quotes: [],
    invoices: [],
    events: [],
    checklist: [],
  });

  const fetchAll = useCallback(async () => {
    if (!supabase || !projectId) {
      setState({
        loading: false,
        error: null,
        project: null,
        quotes: [],
        invoices: [],
        events: [],
        checklist: [],
      });
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const [projRes, quotesRes, invoicesRes, eventsRes, checklistRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).maybeSingle(),
        supabase
          .from('quotes')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false }),
        supabase
          .from('invoices')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false }),
        supabase
          .from('calendar_events')
          .select('*')
          .eq('project_id', projectId)
          .gte('start_at', new Date(Date.now() - 30 * 24 * 3600_000).toISOString())
          .order('start_at', { ascending: true }),
        supabase
          .from('project_checklist_items')
          .select('*')
          .eq('project_id', projectId)
          .order('position', { ascending: true }),
      ]);

      setState({
        loading: false,
        error: projRes.error?.message ?? null,
        project: (projRes.data ?? null) as Project | null,
        quotes: (quotesRes.error ? [] : quotesRes.data ?? []) as Quote[],
        invoices: (invoicesRes.error ? [] : invoicesRes.data ?? []) as Invoice[],
        events: (eventsRes.error ? [] : eventsRes.data ?? []) as CalendarEvent[],
        checklist: (checklistRes.error ? [] : checklistRes.data ?? []) as ProjectChecklistItem[],
      });
    } catch (e) {
      setState((s) => ({
        ...s,
        loading: false,
        error: e instanceof Error ? e.message : 'Erreur inconnue',
      }));
    }
  }, [projectId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { ...state, refresh: fetchAll };
}
