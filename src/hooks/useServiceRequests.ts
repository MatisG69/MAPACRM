import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import type { ServiceRequest, ServiceRequestStatus } from '../lib/types';

export function useServiceRequests() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isSupabaseEnabled() && supabase) {
        const { data, error: err } = await supabase
          .from('service_requests')
          .select('*')
          .order('created_at', { ascending: false });
        if (err) throw err;
        setRequests(data || []);
      } else {
        setRequests([]);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const updateStatus = async (id: string, status: ServiceRequestStatus) => {
    if (!supabase) return;
    const { data, error: err } = await supabase
      .from('service_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (err) throw err;
    setRequests((prev) => prev.map((r) => (r.id === id ? data : r)));
    return data as ServiceRequest;
  };

  const deleteRequest = async (id: string) => {
    if (supabase) {
      const { error: err } = await supabase.from('service_requests').delete().eq('id', id);
      if (err) throw err;
    }
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  const newCount = requests.filter((r) => r.status === 'new').length;

  return { requests, loading, error, newCount, updateStatus, deleteRequest, refetch: fetchRequests };
}
