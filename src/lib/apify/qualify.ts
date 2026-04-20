import type { WebsiteStatus } from '../types'

const SOCIAL_DOMAINS = [
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
  'linkedin.com', 'tiktok.com', 'youtube.com', 'snapchat.com',
  'pinterest.com', 'whatsapp.com', 'wix.com',
]

const DIRECTORY_DOMAINS = [
  'pagesjaunes.fr', 'yelp.com', 'tripadvisor.com', 'annuaire.fr',
  'europages.fr', 'kompass.com', 'societe.com', 'verif.com',
  'manageo.fr', 'pappers.fr', 'infogreffe.fr',
  'lafourchette.com', 'thefork.com', 'deliveroo.fr', 'ubereats.com',
  'just-eat.fr', 'doctolib.fr', 'treatwell.fr', 'houzz.fr',
  'google.com/maps', 'maps.google', 'goo.gl/maps',
]

export function classifyWebsite(url: string | null | undefined): WebsiteStatus {
  if (!url || url.trim() === '') return 'no_website'

  try {
    const raw = url.toLowerCase().trim()
    const normalized = raw.startsWith('http') ? raw : `https://${raw}`
    const parsed = new URL(normalized)
    const host = parsed.hostname.replace(/^www\./, '')
    const full = host + parsed.pathname

    if (SOCIAL_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) return 'social_only'
    if (DIRECTORY_DOMAINS.some((d) => full.includes(d))) return 'directory_only'

    return 'website_ok'
  } catch {
    return 'no_website'
  }
}

/**
 * Classification enrichie : utilise les signaux Google Maps (reviews, score)
 * pour détecter la faible visibilité même quand un site existe.
 * - < 15 avis ET < 4.0 de note  → low_visibility
 * - < 5 avis                     → low_visibility
 * - site présent sans avis       → low_visibility
 */
export function classifyPresence(
  url: string | null | undefined,
  reviewCount?: number | null,
  totalScore?: number | null,
): WebsiteStatus {
  const base = classifyWebsite(url)
  if (base !== 'website_ok') return base

  const noReviews = reviewCount == null || reviewCount === 0
  const fewReviews = reviewCount != null && reviewCount < 5
  const lowReviewsLowScore =
    reviewCount != null && reviewCount < 15 && totalScore != null && totalScore < 4.0

  if (noReviews || fewReviews || lowReviewsLowScore) return 'low_visibility'

  return 'website_ok'
}

export interface ScoreParams {
  websiteStatus: WebsiteStatus
  hasPhone: boolean
  hasEmail: boolean
  reviewCount?: number | null
}

export function computeDigitalScore({ websiteStatus, hasPhone, hasEmail, reviewCount }: ScoreParams): number {
  let score = 0

  switch (websiteStatus) {
    case 'no_website':       score += 40; break
    case 'social_only':      score += 25; break
    case 'directory_only':   score += 20; break
    case 'broken_website':   score += 20; break
    case 'outdated_website': score += 15; break
    case 'low_visibility':   score += 15; break
    case 'website_ok':       score += 0;  break
  }

  if (hasPhone) score += 10
  if (hasEmail) score += 10

  if (reviewCount != null) {
    if (reviewCount < 5)        score += 15
    else if (reviewCount < 20)  score += 8
    else if (reviewCount < 50)  score += 3
  }

  return Math.min(score, 100)
}
