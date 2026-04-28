import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import type { ClientDocument, ClientDocumentCategory, RequestPriority } from '../lib/types';

const BUCKET = 'client-documents';

export interface UploadDocumentInput {
  clientId: string;
  projectId?: string | null;
  category: ClientDocumentCategory;
  name: string;
  description?: string | null;
  file: File;
}

export interface CreateRequestInput {
  clientId: string;
  projectId?: string | null;
  category: ClientDocumentCategory;
  name: string;
  description?: string | null;
  dueDate?: string | null;
  priority?: RequestPriority;
  adminNotes?: string | null;
}

/**
 * Gère les documents arbitraires partagés avec le client via le portail.
 *  - clientId requis (RLS scope)
 *  - projectId optionnel : filtre l'affichage côté admin et tag les documents
 *
 * Stockage : bucket privé `client-documents` ; chaque document a un chemin
 * `{clientId}/{uuid}-{filename}` pour éviter les collisions.
 */
export function useClientDocuments(clientId: string | null, projectId?: string | null) {
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!clientId || !isSupabaseEnabled() || !supabase) {
      setDocuments([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let q = supabase
        .from('client_documents')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error: err } = await q;
      if (err) throw err;
      setDocuments((data ?? []) as ClientDocument[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [clientId, projectId]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const upload = useCallback(
    async (input: UploadDocumentInput): Promise<ClientDocument> => {
      if (!isSupabaseEnabled() || !supabase) {
        throw new Error('Supabase non configuré');
      }
      const safeBase = input.file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
      const uid =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const path = `${input.clientId}/${uid}-${safeBase}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, input.file, {
          contentType: input.file.type || 'application/octet-stream',
          upsert: false,
        });
      if (upErr) throw upErr;

      const { data, error: insErr } = await supabase
        .from('client_documents')
        .insert({
          client_id: input.clientId,
          project_id: input.projectId ?? null,
          category: input.category,
          name: input.name.trim() || input.file.name,
          description: input.description?.trim() || null,
          file_path: path,
          mime_type: input.file.type || null,
          file_size: input.file.size,
        })
        .select('*')
        .single();
      if (insErr) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw insErr;
      }

      const created = data as ClientDocument;
      setDocuments((prev) => [created, ...prev]);
      return created;
    },
    []
  );

  const remove = useCallback(
    async (doc: ClientDocument): Promise<void> => {
      if (!isSupabaseEnabled() || !supabase) {
        throw new Error('Supabase non configuré');
      }
      const { error: delErr } = await supabase
        .from('client_documents')
        .delete()
        .eq('id', doc.id);
      if (delErr) throw delErr;
      await supabase.storage.from(BUCKET).remove([doc.file_path]);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    },
    []
  );

  const getSignedUrl = useCallback(
    async (doc: ClientDocument, ttlSeconds = 300): Promise<string | null> => {
      if (!isSupabaseEnabled() || !supabase || !doc.file_path) return null;
      const { data, error: err } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(doc.file_path, ttlSeconds);
      if (err) return null;
      return data?.signedUrl ?? null;
    },
    []
  );

  /* ───────────────────────── Resource requests ───────────────────────── */

  /**
   * Crée une demande de ressource — l'admin réclame un document au client.
   * Pas de fichier uploadé à ce stade : juste un emplacement vide en attente.
   */
  const createRequest = useCallback(
    async (input: CreateRequestInput): Promise<ClientDocument> => {
      if (!isSupabaseEnabled() || !supabase) {
        throw new Error('Supabase non configuré');
      }
      const { data, error: err } = await supabase
        .from('client_documents')
        .insert({
          client_id: input.clientId,
          project_id: input.projectId ?? null,
          category: input.category,
          name: input.name.trim(),
          description: input.description?.trim() || null,
          file_path: null,
          mime_type: null,
          file_size: null,
          is_request: true,
          request_status: 'requested',
          request_due_date: input.dueDate ?? null,
          request_priority: input.priority ?? 'normal',
          request_admin_notes: input.adminNotes?.trim() || null,
        })
        .select('*')
        .single();
      if (err) throw err;
      const created = data as ClientDocument;
      setDocuments((prev) => [created, ...prev]);
      return created;
    },
    []
  );

  /** Marque une demande reçue comme « validée » par l'admin. */
  const validateRequest = useCallback(async (doc: ClientDocument): Promise<ClientDocument> => {
    if (!isSupabaseEnabled() || !supabase) {
      throw new Error('Supabase non configuré');
    }
    const { data, error: err } = await supabase
      .from('client_documents')
      .update({
        request_status: 'validated',
        validated_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq('id', doc.id)
      .select('*')
      .single();
    if (err) throw err;
    const updated = data as ClientDocument;
    setDocuments((prev) => prev.map((d) => (d.id === doc.id ? updated : d)));
    return updated;
  }, []);

  /** Refuse une demande reçue (motif obligatoire). Le client devra ré-uploader. */
  const rejectRequest = useCallback(
    async (doc: ClientDocument, reason: string): Promise<ClientDocument> => {
      if (!isSupabaseEnabled() || !supabase) {
        throw new Error('Supabase non configuré');
      }
      const cleanReason = reason.trim();
      if (!cleanReason) throw new Error('Le motif de refus est requis');

      // On efface le fichier précédent du bucket et on remet status='requested'
      if (doc.file_path) {
        await supabase.storage.from(BUCKET).remove([doc.file_path]);
      }
      const { data, error: err } = await supabase
        .from('client_documents')
        .update({
          request_status: 'requested',
          rejection_reason: cleanReason,
          file_path: null,
          mime_type: null,
          file_size: null,
          received_at: null,
          validated_at: null,
        })
        .eq('id', doc.id)
        .select('*')
        .single();
      if (err) throw err;
      const updated = data as ClientDocument;
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? updated : d)));
      return updated;
    },
    []
  );

  return {
    documents,
    loading,
    error,
    refetch: fetchAll,
    upload,
    remove,
    getSignedUrl,
    createRequest,
    validateRequest,
    rejectRequest,
  };
}
