import type { Client, Project } from './types'

export interface InvoiceLine {
  project: Project
  amount: number
}

/**
 * Type de pièce facturée.
 *  - 'acompte' : facture d'acompte émise à la commande / signature
 *  - 'solde'   : facture de solde émise à la livraison (déduit l'acompte déjà perçu)
 *  - 'full'    : facture totale (cas sans acompte préalable)
 */
export type InvoiceKind = 'acompte' | 'solde' | 'full'

/**
 * Statut juridique du prestataire — détermine la mention légale obligatoire
 * sur la facture (loi du 14 février 2022, art. R. 123-237 C. com.) :
 *  - 'liberal' : « Dispensé d'immatriculation au RCS et au RM »
 *  - 'commercial' : « RCS [Ville] [SIREN] »
 *  - 'artisan' : « RM [Ville] [SIREN] »
 */
export type LegalRegime = 'liberal' | 'commercial' | 'artisan'

export interface InvoiceParams {
  client: Client
  /** Projet principal (peut être null pour prestation hors projet) */
  project: Project | null
  /** Total HT de la prestation complète */
  totalAmount: number
  /** Numéro de la facture (chronologique strict, ex. FAC-2026-001) */
  invoiceNumber: string
  /** Type de pièce — détermine ce qui est facturé sur cette facture */
  kind: InvoiceKind
  /** Pourcentage d'acompte (0-100) — utilisé pour kind='acompte' ou 'solde' */
  depositPercent?: number
  /** Date d'émission ISO YYYY-MM-DD */
  issueDateISO?: string
  /** Date d'échéance ISO YYYY-MM-DD */
  dueDateISO?: string
  /**
   * Date de prestation / livraison (article 242 nonies A CGI — obligatoire).
   *  - Pour kind='acompte' : date d'encaissement prévue de l'acompte
   *  - Pour kind='solde' / 'full' : date de livraison du projet
   */
  serviceDateISO?: string
  /** Notes / référence devis source / etc. */
  customNotes?: string
  /** Référence du devis source (ex. "DEV-2024-001") */
  sourceQuoteRef?: string
  /** Date de signature du devis source */
  sourceQuoteSignedISO?: string
  /** Lignes additionnelles (multi-projets) */
  additionalLines?: InvoiceLine[]
  /** RIB pour règlement (rien en dur côté template — dépend du prestataire) */
  iban: string
  bic: string
  /** Identité prestataire — passées en paramètres pour zéro hardcoding */
  vendor: VendorInfo
  /** Pour la facture de solde : numéro de la facture d'acompte associée */
  acompteInvoiceRef?: string
  /** Pour la facture de solde : date d'émission de la facture d'acompte */
  acompteInvoiceDateISO?: string
}

export interface VendorInfo {
  /** Raison sociale */
  name: string
  /** Personne physique exploitante (pour EI) */
  exploitantName: string
  /** « EI » ou « Entrepreneur individuel » obligatoire (loi 14/02/2022) */
  legalEntity: 'EI' | 'Entrepreneur individuel' | string
  /** Régime d'immatriculation */
  legalRegime: LegalRegime
  /** Ville de greffe (pour mention RCS [Ville]) — optionnel si liberal */
  rcsCity?: string
  address: string
  postalCode: string
  city: string
  siren: string
  siret: string
  /** Code APE / NAF — informatif (non obligatoire sur facture) */
  apeCode?: string
  email: string
  phone: string
  /** Mention TVA — par défaut « TVA non applicable, art. 293 B du CGI » pour micro-entrepreneur */
  vatMention?: string
  /** Pénalités de retard — clause exacte recopiée des CGV pour cohérence légale */
  penaltyClause?: string
}

/** Vendor MAPA Développement — peut être surchargé par paramètre si besoin */
export const MAPA_VENDOR: VendorInfo = {
  name: 'MAPA Développement',
  exploitantName: 'Matis Gouyet',
  legalEntity: 'Entrepreneur individuel',
  legalRegime: 'liberal',
  address: '89 Rue Yves Decugis',
  postalCode: '59650',
  city: "Villeneuve-d'Ascq",
  siren: '919 461 301',
  siret: '919 461 301 00021',
  email: 'contact@mapa-developpement.fr',
  phone: '+33 6 79 62 39 42',
  vatMention: 'TVA non applicable, art. 293 B du CGI',
  // Harmonisé avec l'art. 9.1/9.2 des CGV (B2B, art. L. 441-10 C. com.)
  penaltyClause:
    "Pénalités de retard au taux d'intérêt appliqué par la Banque centrale européenne à son opération de refinancement la plus récente, majoré de dix (10) points de pourcentage. Indemnité forfaitaire pour frais de recouvrement de quarante euros (40 €) due de plein droit en cas de retard de paiement entre professionnels (art. L. 441-10 et D. 441-5 du Code de commerce). Aucun escompte n'est consenti pour paiement anticipé.",
}

const PROJECT_PRICES: Partial<Record<string, number>> = {
  website: 600,
  redesign: 600,
  webapp: 1000,
  ecommerce: 1000,
}

export function getPriceForProject(project: Project | null): number | null {
  if (!project) return null
  if (typeof project.budget === 'number' && project.budget > 0) return project.budget
  if (!project.type) return null
  return PROJECT_PRICES[project.type] ?? null
}

function projectTypeLabel(type: string | null | undefined): string {
  const map: Record<string, string> = {
    website: 'Site vitrine',
    ecommerce: 'Site e-commerce',
    webapp: 'Application web',
    redesign: 'Refonte de site',
    maintenance: 'Maintenance',
    seo: 'Référencement SEO',
    automation: 'Automatisation',
    other: 'Prestation sur mesure',
  }
  return type ? (map[type] ?? 'Prestation sur mesure') : 'Prestation sur mesure'
}

function formatEur(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n)
}

function formatISODateLong(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function plusDaysISO(base: string | undefined, days: number): string {
  const d = base ? new Date(base) : new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function upperLastName(fullName: string | null | undefined): string {
  if (!fullName) return ''
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].toUpperCase()
  const last = parts.pop()!.toUpperCase()
  return parts.join(' ') + ' ' + last
}

function vendorLegalLine(v: VendorInfo): string {
  // Mention obligatoire de la forme juridique selon le régime
  let regimeMention = ''
  if (v.legalRegime === 'liberal') {
    regimeMention = "Dispensé d'immatriculation au RCS et au RM"
  } else if (v.legalRegime === 'commercial') {
    regimeMention = `RCS ${v.rcsCity ?? v.city} ${v.siren}`
  } else if (v.legalRegime === 'artisan') {
    regimeMention = `RM ${v.rcsCity ?? v.city} ${v.siren}`
  }
  return regimeMention
}

function vendorIdentityBlock(v: VendorInfo): string {
  // Bloc complet pour le footer / partie « Émetteur »
  return `${v.name} · ${v.exploitantName}, ${v.legalEntity} (${v.legalEntity === 'EI' ? 'EI' : 'EI'})<br>
${v.address}, ${v.postalCode} ${v.city}<br>
SIREN ${v.siren} · SIRET ${v.siret}${v.apeCode ? ` · APE ${v.apeCode}` : ''}<br>
${vendorLegalLine(v)}<br>
${v.email} · ${v.phone}<br>
<em>${v.vatMention ?? 'TVA non applicable, art. 293 B du CGI'}</em>`
}

function buildInvoicePage(params: InvoiceParams): string {
  const {
    client,
    project,
    totalAmount,
    invoiceNumber,
    kind,
    depositPercent = 0,
    issueDateISO,
    dueDateISO,
    serviceDateISO,
    customNotes,
    sourceQuoteRef,
    sourceQuoteSignedISO,
    additionalLines = [],
    iban,
    bic,
    vendor,
    acompteInvoiceRef,
    acompteInvoiceDateISO,
  } = params

  const allLines: InvoiceLine[] = [
    ...(project ? [{ project, amount: totalAmount - additionalLines.reduce((s, l) => s + l.amount, 0) }] : []),
    ...additionalLines,
  ]
  const isMulti = allLines.length > 1
  const issueDate = formatISODateLong(issueDateISO || todayISO())
  const dueDate = formatISODateLong(dueDateISO || plusDaysISO(issueDateISO, 30))
  const serviceDate = formatISODateLong(serviceDateISO || issueDateISO || todayISO())

  // Calcul des montants selon le type de pièce
  const acompteAmount = Math.round((totalAmount * depositPercent) / 100)
  const soldeAmount = totalAmount - acompteAmount
  let invoiceAmount = totalAmount
  let kindLabel = 'Facture'
  let serviceLabel = "Date de prestation"
  let descriptionSuffix = ''
  if (kind === 'acompte') {
    invoiceAmount = acompteAmount
    kindLabel = "Facture d'acompte"
    serviceLabel = "Date d'encaissement de l'acompte (prévue)"
    descriptionSuffix = ` — Acompte ${depositPercent}% sur prestation à venir`
  } else if (kind === 'solde') {
    invoiceAmount = soldeAmount
    kindLabel = 'Facture de solde'
    serviceLabel = "Date de livraison de la prestation"
    descriptionSuffix = ` — Solde après acompte de ${formatEur(acompteAmount)} déjà perçu`
  } else {
    kindLabel = 'Facture'
    serviceLabel = 'Date de prestation'
  }

  const missionTitle = isMulti
    ? `Prestations combinées (${allLines.length} projets)${descriptionSuffix}`
    : project
    ? `${projectTypeLabel(project.type)} - ${project.name}${descriptionSuffix}`
    : `Prestation digitale sur mesure${descriptionSuffix}`

  return `
<section class="page page-invoice">

  <div class="stamp">${kindLabel}</div>

  <div class="header">
    <div class="logo">${vendor.name.split(' ')[0].toUpperCase()}</div>
    <div class="agency">${vendor.name} · ${vendor.exploitantName} · ${vendor.legalEntity === 'EI' ? 'EI' : 'EI'}</div>
    <div class="diamond-row">♦</div>
    <div class="doc-title">${missionTitle}</div>
    <div class="doc-kind">${kindLabel} ${invoiceNumber}</div>
  </div>

  <div class="invoice-body">

  <div class="slabel">Parties</div>
  <div class="grid2">
    <div class="info-block">
      <div class="key">Émetteur</div>
      <div class="val">${vendor.name}</div>
      <div class="line">
        ${vendor.exploitantName}, ${vendor.legalEntity}<br>
        ${vendor.address}<br>
        ${vendor.postalCode} ${vendor.city}<br>
        SIREN ${vendor.siren} · SIRET ${vendor.siret}<br>
        <em style="color:#9E9080">${vendorLegalLine(vendor)}</em><br>
        ${vendor.email} · ${vendor.phone}
      </div>
    </div>
    <div class="info-block">
      <div class="key">Client</div>
      <div class="val">${client.company || upperLastName(client.name)}</div>
      <div class="line">
        ${client.legal_form ? `${client.legal_form}<br>` : ''}
        ${client.address ? `${client.address}${client.city ? ', ' : '<br>'}` : ''}${client.city ? `${client.city}<br>` : ''}
        ${client.siret ? `SIRET : ${client.siret}<br>` : ''}
        ${client.vat_number ? `TVA : ${client.vat_number}<br>` : ''}
        ${client.name && client.company && client.name !== client.company ? `<strong style="color:#C8BFB0">Contact :</strong> ${upperLastName(client.name)}${client.contact_role ? `, ${client.contact_role}` : ''}<br>` : ''}
        ${client.email ? `${client.email}<br>` : ''}
        ${client.phone ? `${client.phone}` : ''}
      </div>
    </div>
  </div>

  <div class="grid2" style="margin-top:8px">
    <div class="info-block">
      <div class="key">Référence facture</div>
      <div class="val">${invoiceNumber}</div>
      <div class="line">
        Émise le <strong style="color:#C8BFB0">${issueDate}</strong><br>
        Échéance : <strong style="color:#E2C97E">${dueDate}</strong><br>
        ${sourceQuoteRef ? `Devis d'origine : ${sourceQuoteRef}${sourceQuoteSignedISO ? ` (signé le ${formatISODateLong(sourceQuoteSignedISO)})` : ''}<br>` : ''}
        ${kind === 'solde' && acompteInvoiceRef ? `Acompte : facture <strong>${acompteInvoiceRef}</strong>${acompteInvoiceDateISO ? ` du ${formatISODateLong(acompteInvoiceDateISO)}` : ''}<br>` : ''}
        ${project?.name ? `Projet : ${project.name}` : ''}
      </div>
    </div>
    <div class="info-block">
      <div class="key">${serviceLabel}</div>
      <div class="val">${serviceDate}</div>
      <div class="line" style="font-style:italic;color:#9E9080">
        Article 242 nonies A du Code général des impôts.
      </div>
    </div>
  </div>

  <div class="slabel">Détail facturé</div>
  <table class="price-table">
    <thead>
      <tr>
        <th>Prestation</th>
        <th>Description</th>
        <th style="text-align:right">Montant HT</th>
      </tr>
    </thead>
    <tbody>
      ${kind === 'acompte' ? `
      <tr>
        <td style="vertical-align:top"><strong style="color:#E2C97E">Acompte ${depositPercent}%</strong></td>
        <td>
          <div style="margin-bottom:4px">${
            isMulti
              ? `Acompte ${depositPercent}% sur prestations combinées :`
              : `Acompte ${depositPercent}% sur prestation :`
          }</div>
          ${
            allLines.length > 0
              ? `<ul style="margin:0 0 4px 14px;padding:0;color:#C8BFB0;font-size:7pt;line-height:1.55">${allLines
                  .map(
                    (l) =>
                      `<li><strong style="color:#E2C97E">${projectTypeLabel(l.project.type)}</strong> · ${l.project.name} <span style="color:#9E9080">(${formatEur(l.amount)} HT)</span></li>`
                  )
                  .join('')}</ul>`
              : `<div style="color:#9E9080;margin-bottom:4px">Prestation sur mesure</div>`
          }
          <div style="color:#9E9080;font-size:6.5pt;line-height:1.5;margin-top:4px;border-top:1px dotted rgba(201,168,76,.18);padding-top:4px">
            Total prestation HT : <strong style="color:#C8BFB0">${formatEur(totalAmount)}</strong>
            · Acompte ${depositPercent}% : <strong style="color:#E2C97E">${formatEur(acompteAmount)}</strong>
            · Solde restant à régler : <strong style="color:#C8BFB0">${formatEur(soldeAmount)}</strong>
            ${sourceQuoteRef ? `<br>Détail au devis <strong style="color:#C8BFB0">${sourceQuoteRef}</strong>${sourceQuoteSignedISO ? ` du ${formatISODateLong(sourceQuoteSignedISO)}` : ''}.` : ''}
          </div>
        </td>
        <td class="amt" style="vertical-align:top">${formatEur(acompteAmount)}</td>
      </tr>
      ` : kind === 'solde' ? `
      ${allLines.length > 0
        ? allLines.map((l) => `
      <tr>
        <td><strong style="color:#E2C97E">${projectTypeLabel(l.project.type)}</strong></td>
        <td>${l.project.name}${sourceQuoteRef ? ` <span style="color:#9E9080;font-size:6.5pt">(devis ${sourceQuoteRef}${sourceQuoteSignedISO ? ` du ${formatISODateLong(sourceQuoteSignedISO)}` : ''})</span>` : ''}</td>
        <td class="amt">${formatEur(l.amount)}</td>
      </tr>`).join('')
        : `<tr><td colspan="3">Prestation</td></tr>`}
      <tr>
        <td colspan="2" style="color:#9E9080;font-style:italic;font-size:6.8pt;padding-top:6px;border-top:1px dotted rgba(201,168,76,.2)">
          Sous-total prestation HT
        </td>
        <td class="amt" style="color:#C8BFB0;border-top:1px dotted rgba(201,168,76,.2)">${formatEur(totalAmount)}</td>
      </tr>
      <tr style="background:rgba(201,168,76,.04)">
        <td colspan="2" style="color:#9E9080;font-style:italic">
          Acompte déjà perçu — facture <strong style="color:#C8BFB0">${acompteInvoiceRef ?? '—'}</strong>${acompteInvoiceDateISO ? ` du ${formatISODateLong(acompteInvoiceDateISO)}` : ''}
        </td>
        <td class="amt" style="color:#9E9080">- ${formatEur(acompteAmount)}</td>
      </tr>
      ` : `
      ${allLines.length > 0
        ? allLines.map((l) => `
      <tr>
        <td><strong style="color:#E2C97E">${projectTypeLabel(l.project.type)}</strong></td>
        <td>${l.project.name}${sourceQuoteRef ? ` <span style="color:#9E9080;font-size:6.5pt">(devis ${sourceQuoteRef}${sourceQuoteSignedISO ? ` du ${formatISODateLong(sourceQuoteSignedISO)}` : ''})</span>` : ''}</td>
        <td class="amt">${formatEur(l.amount)}</td>
      </tr>`).join('')
        : `<tr><td colspan="3">Prestation</td></tr>`}
      `}
    </tbody>
  </table>

  <div class="total-block">
    <div class="tline"><span>${kind === 'acompte' ? "Montant de l'acompte HT" : kind === 'solde' ? 'Solde HT à régler' : 'Total HT'}</span><span class="val">${formatEur(invoiceAmount)}</span></div>
    <div class="tline"><span>TVA <span style="font-size:5.5pt;color:#9E9080;font-weight:400;margin-left:6px">(${vendor.vatMention ?? 'non applicable - art. 293 B du CGI'})</span></span><span class="val">—</span></div>
    <div class="tline main balance">
      <span>Net à payer</span>
      <span class="val">${formatEur(invoiceAmount)}</span>
    </div>
  </div>

  <div class="slabel">Modalités de règlement</div>
  <div class="pay-block">
    <div class="row"><span class="k">Mode de paiement</span><span class="v">Virement bancaire</span></div>
    <div class="row"><span class="k">IBAN</span><span class="v">${iban}</span></div>
    <div class="row"><span class="k">BIC</span><span class="v">${bic}</span></div>
    <div class="row"><span class="k">Bénéficiaire</span><span class="v">${vendor.name} - ${vendor.exploitantName}</span></div>
    <div class="row"><span class="k">Référence à indiquer</span><span class="v">${invoiceNumber}</span></div>
  </div>

  ${customNotes ? `<div class="cond-block" style="margin-top:8px"><strong>Note :</strong> ${customNotes}</div>` : ''}

  <div class="slabel">Conditions de paiement</div>
  <div class="cond-block">
    <strong>Échéance</strong> - Paiement par virement à réception de la facture, au plus tard le ${dueDate}.<br>
    <strong>Pénalités de retard et frais de recouvrement</strong> - ${vendor.penaltyClause ?? "Conformément à l'art. L. 441-10 du Code de commerce."}<br>
    <strong>Mention TVA</strong> - ${vendor.vatMention ?? 'TVA non applicable, art. 293 B du CGI.'}
  </div>

  </div><!-- /invoice-body -->

  <div class="footer">
    <div class="diamond-row">♦</div>
    <div class="brand">${vendor.name} · ${vendor.exploitantName} · ${vendor.legalEntity === 'EI' ? 'EI' : 'EI'}</div>
    <div class="legal">
      ${vendor.address}, ${vendor.postalCode} ${vendor.city} · SIREN ${vendor.siren} · SIRET ${vendor.siret}<br>
      ${vendorLegalLine(vendor)} · ${vendor.email} · ${vendor.phone}<br>
      ${vendor.vatMention ?? 'TVA non applicable, art. 293 B du CGI'}
    </div>
  </div>

</section>`
}

/** Wrappe une ou plusieurs pages dans un document HTML complet. */
function wrapHtml(pages: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

  *{margin:0;padding:0;box-sizing:border-box;
    -webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact;}

  @page{size:A4 portrait;margin:0;}
  html,body{
    background:#0A0A0A;color:#E8E0D0;
    font-family:'Inter',sans-serif;font-size:9pt;line-height:1.6;
  }

  .page{
    width:210mm;min-height:297mm;
    padding:14mm 16mm;
    display:flex;flex-direction:column;
    background:#0A0A0A;
    position:relative;
    box-sizing:border-box;
    page-break-after:always;
    break-after:page;
  }
  .page:last-child{page-break-after:auto;break-after:auto;}

  .header,.footer{flex-shrink:0;}
  /* min-height:0 + overflow:hidden : empêche le contenu interne de pousser le footer
     hors page lorsque la facture est dense (cas typique : facture de solde avec
     ligne de déduction d'acompte). Le footer reste collé en bas de la page A4. */
  .invoice-body{flex:1 1 auto;display:flex;flex-direction:column;justify-content:flex-start;gap:10px;min-height:0;}

  .header{
    text-align:center;
    padding-bottom:9px;
    border-bottom:1px solid rgba(201,168,76,.25);
    margin-bottom:10px;
  }
  .logo{
    font-family:'Playfair Display',serif;font-weight:700;
    font-size:22pt;letter-spacing:.15em;color:#E8E0D0;line-height:1;
  }
  .agency{
    font-size:5.5pt;letter-spacing:.35em;color:#9E9080;
    text-transform:uppercase;margin-top:3px;
  }
  .diamond-row{
    display:flex;align-items:center;justify-content:center;gap:12px;
    margin:7px 0;color:#C9A84C;font-size:7pt;
  }
  .diamond-row::before,.diamond-row::after{
    content:'';display:block;width:60px;height:1px;
    background:rgba(201,168,76,.35);
  }
  .doc-title{font-family:'Playfair Display',serif;font-style:italic;font-size:12pt;color:#E8E0D0;}
  .doc-kind{font-size:6pt;letter-spacing:.4em;color:#C9A84C;text-transform:uppercase;margin-top:4px;font-weight:600;}

  .slabel{
    display:flex;align-items:center;gap:10px;
    font-size:5.5pt;font-weight:600;letter-spacing:.22em;
    text-transform:uppercase;color:#C9A84C;
    margin-bottom:8px;margin-top:6px;
  }
  .slabel::before,.slabel::after{
    content:'';flex:1;height:1px;
    background:rgba(201,168,76,.18);
  }

  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
  .info-block{background:#111;border:1px solid rgba(201,168,76,.12);border-radius:2px;padding:10px 12px;}
  .info-block .key{font-size:5.5pt;letter-spacing:.15em;text-transform:uppercase;color:#9E9080;margin-bottom:2px;}
  .info-block .val{color:#E2C97E;font-size:8pt;font-weight:500;}
  .info-block .line{color:#C8BFB0;font-size:7pt;line-height:1.7;}

  .price-table{width:100%;border-collapse:collapse;margin-top:6px;}
  .price-table th{
    text-align:left;font-size:5.5pt;letter-spacing:.18em;
    text-transform:uppercase;color:#9E9080;
    padding:5px 8px;border-bottom:1px solid rgba(201,168,76,.18);
  }
  .price-table td{
    padding:7px 8px;border-bottom:1px solid #161616;
    color:#C8BFB0;font-size:7.5pt;vertical-align:top;
  }
  .price-table tr:last-child td{border-bottom:none;}
  .price-table .amt{font-family:'JetBrains Mono',monospace;color:#E2C97E;font-weight:500;text-align:right;white-space:nowrap;}

  .total-block{
    border:1px solid rgba(201,168,76,.2);
    background:rgba(201,168,76,.04);
    border-radius:2px;padding:10px 14px;margin-top:8px;
  }
  .tline{
    display:flex;justify-content:space-between;align-items:center;
    padding:3px 0;font-size:7.5pt;color:#9E9080;
    border-bottom:1px solid #161616;
  }
  .tline:last-child{border-bottom:none;}
  .tline.main{font-size:10.5pt;font-weight:600;color:#E8E0D0;padding-top:8px;margin-top:2px;}
  .tline.balance{color:#E2C97E;}
  .tline .val{font-family:'JetBrains Mono',monospace;color:#C9A84C;}
  .tline.main .val{font-size:12pt;color:#E2C97E;}

  .pay-block{
    margin-top:10px;
    border:1px solid rgba(201,168,76,.18);
    background:#111;border-radius:2px;padding:10px 14px;
  }
  .pay-block .row{display:flex;justify-content:space-between;gap:10px;padding:3px 0;font-size:7.5pt;color:#C8BFB0;}
  .pay-block .row .k{color:#9E9080;font-size:5.5pt;letter-spacing:.18em;text-transform:uppercase;}
  .pay-block .row .v{font-family:'JetBrains Mono',monospace;color:#E2C97E;}

  .cond-block{
    margin-top:8px;
    background:#111;border-left:2px solid #C9A84C;
    padding:8px 12px;font-size:7pt;color:#9E9080;line-height:1.7;
  }
  .cond-block strong{color:#E2C97E;font-weight:500;}

  .footer{text-align:center;padding-top:10px;border-top:1px solid rgba(201,168,76,.15);margin-top:auto;}
  .footer .brand{font-size:7pt;letter-spacing:.05em;color:#E8E0D0;font-weight:500;}
  .footer .legal{font-size:6.5pt;letter-spacing:.05em;color:#9E9080;line-height:1.55;margin-top:3px;font-style:normal;}

  .stamp{
    position:absolute;top:14mm;right:16mm;
    padding:5px 12px;font-size:6.5pt;letter-spacing:.2em;text-transform:uppercase;
    border:1px solid rgba(201,168,76,.4);color:#C9A84C;font-weight:600;
    border-radius:2px;background:rgba(201,168,76,.05);
  }

  @media print{
    html,body{width:210mm;background:#0A0A0A;}
    body{font-size:8.5pt;line-height:1.5;}
    .page{
      width:210mm;height:297mm;min-height:297mm;max-height:297mm;
      padding:10mm 14mm;
      overflow:hidden;
      display:flex;flex-direction:column;
    }
    .invoice-body{flex:1 1 auto;min-height:0;overflow:hidden;gap:7px;}
    .doc-title{font-size:11.5pt;}
    .doc-kind{font-size:5.8pt;letter-spacing:.35em;}
    .header{padding-bottom:7px;margin-bottom:8px;}
    .slabel{font-size:5.4pt;margin-top:6px;margin-bottom:5px;}
    .info-block{padding:8px 11px;}
    .info-block .val{font-size:8pt;}
    .info-block .line{font-size:6.8pt;line-height:1.5;}
    .price-table th{padding:3.5px 7px;font-size:5.4pt;}
    .price-table td{padding:4.5px 7px;font-size:7.6pt;line-height:1.45;}
    .total-block{padding:7px 11px;margin-top:6px;}
    .tline{padding:2.5px 0;font-size:8pt;}
    .tline.main{font-size:10pt;padding-top:5px;}
    .tline.main .val{font-size:12pt;}
    .pay-block{padding:7px 11px;}
    .pay-block .row{padding:2px 0;font-size:7pt;}
    .cond-block{padding:7px 10px;font-size:6.6pt;line-height:1.5;}
    .footer{padding-top:7px;font-size:6.2pt;}
    .footer .brand{font-size:7pt;}
    .footer .legal{font-size:6pt;line-height:1.5;}
    .stamp{top:10mm;right:14mm;padding:4px 10px;font-size:6pt;}
  }

  @media screen{
    html{background:#0d0d0d;min-height:100vh;padding:40px 16px;}
    body{display:flex;flex-direction:column;align-items:center;gap:24px;margin:0;}
    .page{box-shadow:0 24px 80px rgba(0,0,0,.7);border-radius:2px;}
  }
</style>
</head>
<body>
${pages}
</body>
</html>`
}

/**
 * Génère **une seule** facture (HTML complet) pour un kind donné.
 * Utilisée pour : facture totale (sans acompte), facture d'acompte seule,
 * facture de solde seule.
 */
export function generateInvoiceHTML(params: InvoiceParams): string {
  const page = buildInvoicePage(params)
  return wrapHtml(page, `Facture ${params.invoiceNumber} - ${params.client.name}`)
}

/**
 * Génère un PDF combiné contenant **2 factures** :
 *   - Page 1 : facture d'acompte (kind='acompte')
 *   - Page 2 : facture de solde  (kind='solde')
 *
 * Utilisé quand le client a signé un devis avec acompte.
 * Les deux pages sont des factures complètes et indépendantes (en-tête,
 * pied, mentions légales) avec leur propre numéro chronologique.
 */
export interface PairedInvoiceInput {
  /** Paramètres communs aux deux factures (client, projet, totaux, vendor…) */
  shared: Omit<InvoiceParams, 'invoiceNumber' | 'kind' | 'acompteInvoiceRef' | 'acompteInvoiceDateISO'>
  /** Numéro de la facture d'acompte (ex. FAC-2026-001) */
  acompteNumber: string
  /** Numéro de la facture de solde (ex. FAC-2026-002) */
  soldeNumber: string
  /** Date d'émission de la facture d'acompte */
  acompteIssueDateISO?: string
  /** Date d'émission de la facture de solde (typiquement à la livraison) */
  soldeIssueDateISO?: string
  /** Date d'encaissement prévue de l'acompte (date de prestation acompte) */
  acompteServiceDateISO?: string
  /** Date de livraison effective (date de prestation solde) */
  soldeServiceDateISO?: string
  /**
   * Échéance de paiement de la facture d'acompte (override).
   * À défaut, recalculée comme acompteIssueDate + delai (delai déduit de shared.dueDateISO).
   */
  acompteDueDateISO?: string
  /**
   * Échéance de paiement de la facture de solde (override).
   * À défaut, calculée comme soldeIssueDate + le MÊME délai que la facture
   * d'acompte (préserve le délai contractuel pour les deux pièces).
   */
  soldeDueDateISO?: string
}

/** Calcule le délai (en jours) entre deux dates ISO YYYY-MM-DD. */
function delayDaysBetween(fromISO: string | undefined, toISO: string | undefined): number {
  if (!fromISO || !toISO) return 30
  const a = new Date(fromISO)
  const b = new Date(toISO)
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 30
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)))
}

/** Ajoute N jours à une date ISO et retourne YYYY-MM-DD. */
function addDaysISO(baseISO: string, days: number): string {
  const d = new Date(baseISO)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function generatePairedInvoiceHTML(input: PairedInvoiceInput): string {
  const acompteIssueISO = input.acompteIssueDateISO ?? input.shared.issueDateISO
  const soldeIssueISO = input.soldeIssueDateISO ?? input.shared.issueDateISO

  // Délai de paiement appliqué : déduit de l'écart entre l'émission de l'acompte
  // et son échéance (telle que saisie). On le réapplique à la date d'émission
  // de la facture de solde pour calculer son échéance — chaque facture a donc
  // SON échéance, alignée sur sa propre date d'émission.
  const paymentDelayDays = delayDaysBetween(acompteIssueISO, input.shared.dueDateISO)

  const acompteDueISO =
    input.acompteDueDateISO ?? input.shared.dueDateISO ??
    (acompteIssueISO ? addDaysISO(acompteIssueISO, paymentDelayDays) : undefined)

  const soldeDueISO =
    input.soldeDueDateISO ??
    (soldeIssueISO ? addDaysISO(soldeIssueISO, paymentDelayDays) : input.shared.dueDateISO)

  const acomptePage = buildInvoicePage({
    ...input.shared,
    invoiceNumber: input.acompteNumber,
    kind: 'acompte',
    issueDateISO: acompteIssueISO,
    dueDateISO: acompteDueISO,
    serviceDateISO: input.acompteServiceDateISO ?? input.shared.serviceDateISO,
  })

  const soldePage = buildInvoicePage({
    ...input.shared,
    invoiceNumber: input.soldeNumber,
    kind: 'solde',
    issueDateISO: soldeIssueISO,
    dueDateISO: soldeDueISO,
    serviceDateISO: input.soldeServiceDateISO ?? input.shared.serviceDateISO,
    acompteInvoiceRef: input.acompteNumber,
    acompteInvoiceDateISO: acompteIssueISO,
  })

  return wrapHtml(
    acomptePage + soldePage,
    `Factures ${input.acompteNumber} & ${input.soldeNumber} - ${input.shared.client.name}`
  )
}
