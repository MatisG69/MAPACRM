import { supabase } from '../supabase'
import { classifyPresence, computeDigitalScore } from './qualify'
import type { WebsiteStatus } from '../types'

export interface ApifyBusinessResult {
  title: string
  categoryName?: string
  address?: string
  city?: string
  phone?: string
  phoneUnformatted?: string
  website?: string
  url?: string
  email?: string
  reviewsCount?: number
  totalScore?: number
}

export interface ImportStats {
  total: number
  qualified: number
  imported: number
  skipped: number
  errors: number
}

const AVATAR_COLORS = [
  '#8B7355', '#6B5B93', '#88B04B', '#92A8D1',
  '#955251', '#B565A7', '#009B77', '#DD4132',
]

function randomAvatarColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  const clean = phone.replace(/\s+/g, '').replace(/[^+\d]/g, '')
  return clean.length >= 8 ? clean : null
}

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}

export async function importLeadsToSupabase(
  results: ApifyBusinessResult[],
  onProgress?: (done: number, total: number) => void,
  searchQuery?: string,
): Promise<ImportStats> {
  if (!supabase) throw new Error('Supabase non disponible — vérifiez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY')

  const stats: ImportStats = { total: results.length, qualified: 0, imported: 0, skipped: 0, errors: 0 }

  const { data: existing } = await supabase
    .from('clients')
    .select('id, name, phone, source_url')

  const existingPhones = new Set<string>(
    (existing || []).map((c: { phone: string | null }) => normalizePhone(c.phone)).filter((v): v is string => v !== null),
  )
  const existingNames = new Set<string>(
    (existing || []).map((c: { name: string }) => normalizeName(c.name)),
  )
  const existingSourceUrls = new Set<string>(
    (existing || []).map((c: { source_url?: string | null }) => c.source_url).filter((v): v is string => Boolean(v)),
  )

  for (let i = 0; i < results.length; i++) {
    onProgress?.(i, results.length)

    const item = results[i]
    const rawPhone = item.phoneUnformatted || item.phone || null
    const phone = normalizePhone(rawPhone)
    const name = item.title?.trim()
    if (!name) { stats.errors++; continue }

    const websiteStatus: WebsiteStatus = classifyPresence(item.website, item.reviewsCount, item.totalScore)
    const digitalScore = computeDigitalScore({
      websiteStatus,
      hasPhone: Boolean(phone),
      hasEmail: Boolean(item.email),
      reviewCount: item.reviewsCount,
    })
    stats.qualified++

    if (
      (phone && existingPhones.has(phone)) ||
      existingNames.has(normalizeName(name)) ||
      (item.url && existingSourceUrls.has(item.url))
    ) {
      stats.skipped++
      continue
    }

    const payload = {
      name,
      company: name,
      email: item.email || null,
      phone: rawPhone || null,
      address: item.address || null,
      city: item.city || null,
      website: websiteStatus === 'website_ok' ? (item.website || null) : null,
      status: 'prospect',
      source: 'scraping',
      profession: item.categoryName || searchQuery || null,
      notes: null,
      satisfaction_rating: null,
      feedback: null,
      avatar_color: randomAvatarColor(),
      is_scraped: true,
      source_platform: 'google_maps',
      source_url: item.url || null,
      website_raw: item.website || null,
      website_status: websiteStatus,
      digital_score: digitalScore,
      scraped_at: new Date().toISOString(),
    }

    try {
      const { error } = await supabase.from('clients').insert([payload])
      if (error) {
        stats.errors++
      } else {
        stats.imported++
        if (phone) existingPhones.add(phone)
        existingNames.add(normalizeName(name))
        if (item.url) existingSourceUrls.add(item.url)
      }
    } catch {
      stats.errors++
    }
  }

  onProgress?.(results.length, results.length)
  return stats
}
