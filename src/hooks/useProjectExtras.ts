import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import type {
  NdaAgreement,
  NdaStatus,
  ProjectSuggestion,
  SuggestionStatus,
  Testimonial,
} from '../lib/types';

/**
 * Sprint 7 — admin hook regroupant les 3 modules :
 *   · témoignages (lecture / approbation / refus)
 *   · NDA (création / publication / révocation)
 *   · suggestions (lecture / réponse / changement de statut)
 *
 * Fait une seule passe d'init pour limiter les requêtes au montage.
 */
export function useProjectExtras(projectId: string | null) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [ndas, setNdas] = useState<NdaAgreement[]>([]);
  const [suggestions, setSuggestions] = useState<ProjectSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!projectId || !isSupabaseEnabled() || !supabase) {
      setTestimonials([]);
      setNdas([]);
      setSuggestions([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [tRes, nRes, sRes] = await Promise.all([
        supabase
          .from('testimonials')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false }),
        supabase
          .from('nda_agreements')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false }),
        supabase
          .from('project_suggestions')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false }),
      ]);
      if (tRes.error) throw tRes.error;
      if (nRes.error) throw nRes.error;
      if (sRes.error) throw sRes.error;
      setTestimonials((tRes.data ?? []) as Testimonial[]);
      setNdas((nRes.data ?? []) as NdaAgreement[]);
      setSuggestions((sRes.data ?? []) as ProjectSuggestion[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  /* ─── Témoignages ─── */
  const approveTestimonial = useCallback(async (id: string) => {
    if (!supabase) throw new Error('Supabase non configuré');
    const { data, error: err } = await supabase
      .from('testimonials')
      .update({ approved: true, approved_at: new Date().toISOString(), rejection_reason: null })
      .eq('id', id)
      .select('*')
      .single();
    if (err) throw err;
    const updated = data as Testimonial;
    setTestimonials((prev) => prev.map((t) => (t.id === id ? updated : t)));
    return updated;
  }, []);

  const rejectTestimonial = useCallback(async (id: string, reason: string) => {
    if (!supabase) throw new Error('Supabase non configuré');
    const { data, error: err } = await supabase
      .from('testimonials')
      .update({ approved: false, approved_at: null, rejection_reason: reason.trim() || null })
      .eq('id', id)
      .select('*')
      .single();
    if (err) throw err;
    const updated = data as Testimonial;
    setTestimonials((prev) => prev.map((t) => (t.id === id ? updated : t)));
    return updated;
  }, []);

  const removeTestimonial = useCallback(async (id: string) => {
    if (!supabase) throw new Error('Supabase non configuré');
    const { error: err } = await supabase.from('testimonials').delete().eq('id', id);
    if (err) throw err;
    setTestimonials((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /* ─── NDA ─── */
  const createNda = useCallback(
    async (input: {
      clientId: string;
      title: string;
      content: string;
      expiresAt?: string | null;
    }): Promise<NdaAgreement> => {
      if (!projectId) throw new Error('Projet requis');
      if (!supabase) throw new Error('Supabase non configuré');
      const { data, error: err } = await supabase
        .from('nda_agreements')
        .insert({
          project_id: projectId,
          client_id: input.clientId,
          title: input.title,
          content: input.content,
          expires_at: input.expiresAt ?? null,
          status: 'sent',
        })
        .select('*')
        .single();
      if (err) throw err;
      const created = data as NdaAgreement;
      setNdas((prev) => [created, ...prev]);
      return created;
    },
    [projectId],
  );

  const setNdaStatus = useCallback(async (id: string, status: NdaStatus) => {
    if (!supabase) throw new Error('Supabase non configuré');
    const { data, error: err } = await supabase
      .from('nda_agreements')
      .update({ status })
      .eq('id', id)
      .select('*')
      .single();
    if (err) throw err;
    const updated = data as NdaAgreement;
    setNdas((prev) => prev.map((n) => (n.id === id ? updated : n)));
    return updated;
  }, []);

  const removeNda = useCallback(async (id: string) => {
    if (!supabase) throw new Error('Supabase non configuré');
    const { error: err } = await supabase.from('nda_agreements').delete().eq('id', id);
    if (err) throw err;
    setNdas((prev) => prev.filter((n) => n.id !== id));
  }, []);

  /* ─── Suggestions ─── */
  const respondSuggestion = useCallback(
    async (id: string, status: SuggestionStatus, response?: string | null) => {
      if (!supabase) throw new Error('Supabase non configuré');
      const { data, error: err } = await supabase
        .from('project_suggestions')
        .update({
          status,
          admin_response: response?.trim() || null,
        })
        .eq('id', id)
        .select('*')
        .single();
      if (err) throw err;
      const updated = data as ProjectSuggestion;
      setSuggestions((prev) => prev.map((s) => (s.id === id ? updated : s)));
      return updated;
    },
    [],
  );

  const removeSuggestion = useCallback(async (id: string) => {
    if (!supabase) throw new Error('Supabase non configuré');
    const { error: err } = await supabase.from('project_suggestions').delete().eq('id', id);
    if (err) throw err;
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return {
    testimonials,
    ndas,
    suggestions,
    loading,
    error,
    refetch,
    approveTestimonial,
    rejectTestimonial,
    removeTestimonial,
    createNda,
    setNdaStatus,
    removeNda,
    respondSuggestion,
    removeSuggestion,
  };
}
