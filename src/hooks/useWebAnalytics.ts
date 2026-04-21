import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';

export interface PageViewRow {
  id: string;
  session_id: string;
  page: string;
  referrer: string | null;
  ua_device: string | null;
  ua_browser: string | null;
  duration_sec: number | null;
  created_at: string;
}

export interface WebAnalytics {
  totalViews30d: number;
  totalViews7d: number;
  uniqueSessions30d: number;
  pagesPerSession: number;
  avgDurationSec: number | null;
  viewsByDay30: number[];
  viewsByDay7: number[];
  viewsLabels30: string[];
  viewsLabels7: string[];
  deviceBreakdown: { label: string; value: number; color: string }[];
  topReferrers: { domain: string; count: number; pct: number }[];
  topPages: { page: string; views: number; pct: number }[];
  todayViews: number;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function referrerDomain(ref: string | null): string {
  if (!ref) return 'Direct';
  try {
    const u = new URL(ref);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return ref.slice(0, 40);
  }
}

function buildDaySeries(rows: PageViewRow[], days: number): { values: number[]; labels: string[] } {
  const map: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    map[d.toISOString().split('T')[0]] = 0;
  }
  rows.forEach((r) => {
    const key = r.created_at.split('T')[0];
    if (key in map) map[key]++;
  });
  const values: number[] = [];
  const labels: string[] = [];
  Object.entries(map).forEach(([date, count]) => {
    const d = new Date(date + 'T12:00:00');
    labels.push(d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }));
    values.push(count);
  });
  return { values, labels };
}

const DEVICE_COLORS: Record<string, string> = {
  mobile: '#C98A4C',
  desktop: '#7C9FC4',
  tablet: '#8E7B5E',
};

export function useWebAnalytics() {
  const [rows, setRows] = useState<PageViewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableExists, setTableExists] = useState(true);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!isSupabaseEnabled() || !supabase) {
        setRows([]);
        return;
      }
      const since = daysAgo(30).toISOString();
      const { data, error: err } = await supabase
        .from('page_views')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: true });
      if (err) {
        if (err.message?.includes('does not exist') || err.code === '42P01') {
          setTableExists(false);
          setRows([]);
          return;
        }
        throw err;
      }
      setTableExists(true);
      setRows(data || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const analytics = useMemo<WebAnalytics>(() => {
    const ago7 = daysAgo(7);
    const ago30 = daysAgo(30);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rows30 = rows.filter((r) => new Date(r.created_at) >= ago30);
    const rows7 = rows.filter((r) => new Date(r.created_at) >= ago7);
    const rowsToday = rows.filter((r) => new Date(r.created_at) >= today);

    const sessions30 = new Set(rows30.map((r) => r.session_id));
    const pps = sessions30.size > 0 ? rows30.length / sessions30.size : 0;

    const durRows = rows30.filter((r) => r.duration_sec != null && r.duration_sec > 0 && r.duration_sec < 3600);
    const avgDur =
      durRows.length > 0
        ? Math.round(durRows.reduce((s, r) => s + (r.duration_sec ?? 0), 0) / durRows.length)
        : null;

    const series30 = buildDaySeries(rows30, 30);
    const series7 = buildDaySeries(rows7, 7);

    const deviceMap: Record<string, number> = { mobile: 0, desktop: 0, tablet: 0 };
    rows30.forEach((r) => {
      const d = (r.ua_device || 'desktop').toLowerCase();
      if (d in deviceMap) deviceMap[d]++;
    });
    const deviceBreakdown = [
      { label: 'Desktop', value: deviceMap.desktop, color: DEVICE_COLORS.desktop },
      { label: 'Mobile', value: deviceMap.mobile, color: DEVICE_COLORS.mobile },
      { label: 'Tablette', value: deviceMap.tablet, color: DEVICE_COLORS.tablet },
    ].filter((d) => d.value > 0);

    const refMap: Record<string, number> = {};
    rows30.forEach((r) => {
      const domain = referrerDomain(r.referrer);
      refMap[domain] = (refMap[domain] || 0) + 1;
    });
    const topReferrers = Object.entries(refMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([domain, count]) => ({
        domain,
        count,
        pct: rows30.length > 0 ? Math.round((count / rows30.length) * 100) : 0,
      }));

    const pageMap: Record<string, number> = {};
    rows30.forEach((r) => {
      const p = r.page || '/';
      pageMap[p] = (pageMap[p] || 0) + 1;
    });
    const topPages = Object.entries(pageMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([page, views]) => ({
        page,
        views,
        pct: rows30.length > 0 ? Math.round((views / rows30.length) * 100) : 0,
      }));

    return {
      totalViews30d: rows30.length,
      totalViews7d: rows7.length,
      uniqueSessions30d: sessions30.size,
      pagesPerSession: Math.round(pps * 10) / 10,
      avgDurationSec: avgDur,
      viewsByDay30: series30.values,
      viewsByDay7: series7.values,
      viewsLabels30: series30.labels,
      viewsLabels7: series7.labels,
      deviceBreakdown,
      topReferrers,
      topPages,
      todayViews: rowsToday.length,
    };
  }, [rows]);

  return { analytics, loading, error, tableExists, refetch: fetchRows };
}
