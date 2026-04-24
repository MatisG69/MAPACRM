import { useState, useCallback } from 'react';

export type VitalScore = 'good' | 'needs-improvement' | 'poor';
export type PsStrategy = 'mobile' | 'desktop';

export interface PageSpeedResult {
  strategy: PsStrategy;
  performance: number | null;
  seo: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  lcp: string;
  fcp: string;
  cls: string;
  tbt: string;
  speedIndex: string;
  lcpScore: VitalScore | null;
  fcpScore: VitalScore | null;
  clsScore: VitalScore | null;
  tbtScore: VitalScore | null;
  fetchedAt: Date;
}

const SITE_URL = 'https://mapa-developpement.fr/';

function vitalScore(score: number | null | undefined): VitalScore | null {
  if (score == null) return null;
  if (score >= 0.9) return 'good';
  if (score >= 0.5) return 'needs-improvement';
  return 'poor';
}

function toScore(v: number | null | undefined): number | null {
  if (v == null) return null;
  return Math.round(v * 100);
}

function auditValue(audits: Record<string, unknown>, key: string): string {
  const audit = audits[key] as { displayValue?: string } | undefined;
  return audit?.displayValue ?? '—';
}

function auditScore(audits: Record<string, unknown>, key: string): VitalScore | null {
  const audit = audits[key] as { score?: number } | undefined;
  return vitalScore(audit?.score);
}

function isQuotaError(message: string): boolean {
  return message.includes('Quota exceeded') || message.includes('quota') || message.includes('RESOURCE_EXHAUSTED');
}

export function usePageSpeed() {
  const [data, setData] = useState<PageSpeedResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const run = useCallback(async (strategy: PsStrategy = 'mobile') => {
    setLoading(true);
    setError(null);
    setQuotaExceeded(false);
    try {
      const apiKey = import.meta.env.VITE_PAGESPEED_API_KEY as string | undefined;

      const params = new URLSearchParams({ url: SITE_URL, strategy });
      params.append('category', 'performance');
      params.append('category', 'seo');
      params.append('category', 'accessibility');
      params.append('category', 'best-practices');
      if (apiKey) params.set('key', apiKey);

      const res = await fetch(
        `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`
      );

      const json = await res.json();

      if (!res.ok) {
        const msg: string =
          json?.error?.message ?? json?.error?.errors?.[0]?.message ?? `HTTP ${res.status}`;
        if (isQuotaError(msg)) setQuotaExceeded(true);
        throw new Error(msg);
      }

      const lhr = json.lighthouseResult;
      if (!lhr) throw new Error('Reponse Lighthouse invalide — le site est peut-etre inaccessible.');

      const cats = (lhr.categories ?? {}) as Record<string, { score?: number }>;
      const audits = (lhr.audits ?? {}) as Record<string, unknown>;

      const perf = toScore(cats['performance']?.score);
      const seo = toScore(cats['seo']?.score);
      const a11y = toScore(cats['accessibility']?.score);
      const bp = toScore(cats['best-practices']?.score);

      // Guard: if all are 0, Lighthouse likely failed silently
      if (perf === 0 && seo === 0 && a11y === 0 && bp === 0) {
        throw new Error('Lighthouse n\'a pas pu analyser le site (scores tous a 0). Reessayez dans quelques secondes.');
      }

      setData({
        strategy,
        performance: perf,
        seo,
        accessibility: a11y,
        bestPractices: bp,
        lcp: auditValue(audits, 'largest-contentful-paint'),
        fcp: auditValue(audits, 'first-contentful-paint'),
        cls: auditValue(audits, 'cumulative-layout-shift'),
        tbt: auditValue(audits, 'total-blocking-time'),
        speedIndex: auditValue(audits, 'speed-index'),
        lcpScore: auditScore(audits, 'largest-contentful-paint'),
        fcpScore: auditScore(audits, 'first-contentful-paint'),
        clsScore: auditScore(audits, 'cumulative-layout-shift'),
        tbtScore: auditScore(audits, 'total-blocking-time'),
        fetchedAt: new Date(),
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setData(null);
    setError(null);
    setQuotaExceeded(false);
  }, []);

  return { data, loading, error, quotaExceeded, run, clear };
}
