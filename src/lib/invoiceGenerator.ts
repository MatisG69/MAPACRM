import type { Client, Project } from './types'
import { generateInvoiceNumber } from './utils'

export interface InvoiceLine {
  project: Project
  amount: number
}

export interface InvoiceParams {
  client: Client
  project: Project | null
  /** Total HT de la facture */
  amount: number
  invoiceNumber?: string
  /** Date d'émission ISO YYYY-MM-DD ; par défaut aujourd'hui */
  issueDateISO?: string
  /** Date d'échéance ISO YYYY-MM-DD ; par défaut +30j */
  dueDateISO?: string
  /** Acompte déjà perçu (en €) — affiché en déduction sur la facture */
  alreadyPaid?: number
  /** Notes / référence devis source / etc. */
  customNotes?: string
  /** Référence du devis source (ex. "DEV-2024-001") affichée pour traçabilité */
  sourceQuoteRef?: string
  /** Multi-projets : lignes additionnelles à combiner sur la même facture */
  additionalLines?: InvoiceLine[]
  /** RIB MAPA pour règlement (par défaut, valeurs ci-dessous) */
  iban?: string
  bic?: string
}

const DEFAULT_IBAN = 'FR76 1670 6050 8763 5180 1129 014'
const DEFAULT_BIC = 'AGRIFRPP867'

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
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function todayLong(): string {
  return new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatISODate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function upperLastName(fullName: string | null | undefined): string {
  if (!fullName) return ''
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].toUpperCase()
  const last = parts.pop()!.toUpperCase()
  return parts.join(' ') + ' ' + last
}

export function generateInvoiceHTML(params: InvoiceParams): string {
  const {
    client,
    project,
    amount,
    invoiceNumber = generateInvoiceNumber(),
    issueDateISO,
    dueDateISO,
    alreadyPaid = 0,
    customNotes,
    sourceQuoteRef,
    additionalLines = [],
    iban = DEFAULT_IBAN,
    bic = DEFAULT_BIC,
  } = params

  const allLines: InvoiceLine[] = [
    ...(project ? [{ project, amount }] : []),
    ...additionalLines,
  ]
  const totalHT = allLines.length > 0
    ? allLines.reduce((s, l) => s + l.amount, 0)
    : amount
  const balance = Math.max(0, totalHT - (alreadyPaid || 0))
  const isMulti = allLines.length > 1
  const issueDate = formatISODate(issueDateISO) || todayLong()
  const dueDate = formatISODate(dueDateISO) || formatISODate(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  ) || ''

  const missionTitle = isMulti
    ? `Prestations combinées (${allLines.length} projets)`
    : project
    ? `${projectTypeLabel(project.type)} - ${project.name}`
    : 'Prestation digitale sur mesure'

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Facture ${invoiceNumber} - ${client.name}</title>
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
  }
  .header,.footer{flex-shrink:0;}
  .invoice-body{flex:1 1 auto;display:flex;flex-direction:column;justify-content:flex-start;gap:10px;}

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
  .doc-title{
    font-family:'Playfair Display',serif;font-style:italic;
    font-size:12pt;color:#E8E0D0;
  }
  .doc-kind{
    font-size:6pt;letter-spacing:.4em;color:#C9A84C;
    text-transform:uppercase;margin-top:4px;font-weight:600;
  }

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
  .info-block .line{color:#C8BFB0;font-size:7.5pt;line-height:1.7;}

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
  .price-table .amt{
    font-family:'JetBrains Mono',monospace;
    color:#E2C97E;font-weight:500;text-align:right;white-space:nowrap;
  }

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
  .tline.main{
    font-size:10.5pt;font-weight:600;color:#E8E0D0;
    padding-top:8px;margin-top:2px;
  }
  .tline.balance{color:#E2C97E;}
  .tline .val{
    font-family:'JetBrains Mono',monospace;
    color:#C9A84C;
  }
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

  .footer{
    text-align:center;
    padding-top:10px;border-top:1px solid rgba(201,168,76,.15);
    margin-top:auto;
  }
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
      width:210mm;height:297mm;min-height:297mm;
      padding:11mm 14mm;
      overflow:hidden;
    }
    .logo{font-size:22pt;}
    .agency{font-size:5.8pt;}
    .doc-title{font-size:12pt;}
    .header{padding-bottom:8px;margin-bottom:9px;}
    .slabel{font-size:5.6pt;margin-top:8px;margin-bottom:6px;}
    .info-block{padding:9px 12px;}
    .info-block .val{font-size:8.5pt;}
    .info-block .line{font-size:7.5pt;line-height:1.6;}
    .price-table th{padding:4px 8px;font-size:5.5pt;}
    .price-table td{padding:5px 8px;font-size:8pt;}
    .total-block{padding:9px 12px;margin-top:7px;}
    .tline{padding:3px 0;font-size:8.5pt;}
    .tline.main{font-size:10.5pt;padding-top:6px;}
    .tline.main .val{font-size:12.5pt;}
    .pay-block{padding:9px 12px;}
    .cond-block{padding:8px 12px;font-size:7.5pt;line-height:1.65;}
    .footer{padding-top:8px;}
    .stamp{top:11mm;right:14mm;}
  }

  @media screen{
    html{
      background:#0d0d0d;
      min-height:100vh;
      padding:40px 16px;
    }
    body{display:flex;flex-direction:column;align-items:center;gap:24px;margin:0;}
    .page{box-shadow:0 24px 80px rgba(0,0,0,.7);border-radius:2px;}
  }
</style>
</head>
<body>

<section class="page">

  <div class="stamp">Facture</div>

  <div class="header">
    <div class="logo">MAPA</div>
    <div class="agency">Développement · Solutions Digitales</div>
    <div class="diamond-row">♦</div>
    <div class="doc-title">${missionTitle}</div>
    <div class="doc-kind">Facture ${invoiceNumber}</div>
  </div>

  <div class="invoice-body">

  <div class="slabel">Parties</div>
  <div class="grid2">
    <div class="info-block">
      <div class="key">Client</div>
      <div class="val">${client.company || upperLastName(client.name)}</div>
      <div class="line">
        ${client.legal_form ? `${client.legal_form}<br>` : ''}
        ${client.address ? `${client.address}${client.city ? ', ' : '<br>'}` : ''}${client.city ? `${client.city}<br>` : ''}
        ${client.siret ? `SIRET : ${client.siret}<br>` : ''}
        ${client.vat_number ? `TVA : ${client.vat_number}<br>` : ''}
        ${client.name && client.company && client.name !== client.company ? `<br><strong style="color:#C8BFB0">Contact :</strong> ${upperLastName(client.name)}${client.contact_role ? `, ${client.contact_role}` : ''}<br>` : ''}
        ${client.email ? `${client.email}<br>` : ''}
        ${client.phone ? `${client.phone}` : ''}
      </div>
    </div>
    <div class="info-block">
      <div class="key">Référence facture</div>
      <div class="val">${invoiceNumber}</div>
      <div class="line">
        Émise le ${issueDate}<br>
        Échéance : <strong style="color:#E2C97E">${dueDate}</strong><br>
        ${sourceQuoteRef ? `Devis d'origine : ${sourceQuoteRef}<br>` : ''}
        ${project?.name ? `Projet : ${project.name}` : 'MAPA Développement - Matis Gouyet'}
      </div>
    </div>
  </div>

  <div class="slabel">Détail des prestations facturées</div>
  <table class="price-table">
    <thead>
      <tr>
        <th>Prestation</th>
        <th>Description</th>
        <th style="text-align:right">Montant HT</th>
      </tr>
    </thead>
    <tbody>
      ${allLines.length > 0
        ? allLines.map((l) => `
      <tr>
        <td><strong style="color:#E2C97E">${projectTypeLabel(l.project.type)}</strong></td>
        <td>${l.project.name}</td>
        <td class="amt">${formatEur(l.amount)}</td>
      </tr>`).join('')
        : `
      <tr>
        <td><strong style="color:#E2C97E">${projectTypeLabel(project?.type)}</strong></td>
        <td>${project?.name ?? 'Prestation sur mesure'}</td>
        <td class="amt">${formatEur(amount)}</td>
      </tr>`}
    </tbody>
  </table>

  <div class="total-block">
    <div class="tline"><span>Total HT</span><span class="val">${formatEur(totalHT)}</span></div>
    <div class="tline"><span>TVA <span style="font-size:5.5pt;color:#9E9080;font-weight:400;margin-left:6px">(non applicable - art. 293 B du CGI)</span></span><span class="val">—</span></div>
    ${alreadyPaid > 0 ? `<div class="tline"><span>Acompte déjà perçu</span><span class="val">- ${formatEur(alreadyPaid)}</span></div>` : ''}
    <div class="tline main balance">
      <span>${alreadyPaid > 0 ? 'Reste à régler' : 'Net à payer'}</span>
      <span class="val">${formatEur(balance)}</span>
    </div>
  </div>

  <div class="slabel">Modalités de règlement</div>
  <div class="pay-block">
    <div class="row"><span class="k">Mode de paiement</span><span class="v">Virement bancaire</span></div>
    <div class="row"><span class="k">IBAN</span><span class="v">${iban}</span></div>
    <div class="row"><span class="k">BIC</span><span class="v">${bic}</span></div>
    <div class="row"><span class="k">Bénéficiaire</span><span class="v">MAPA Développement - Matis Gouyet</span></div>
    <div class="row"><span class="k">Référence à indiquer</span><span class="v">${invoiceNumber}</span></div>
  </div>

  ${customNotes ? `<div class="cond-block" style="margin-top:8px"><strong>Note :</strong> ${customNotes}</div>` : ''}

  <div class="slabel">Conditions de paiement</div>
  <div class="cond-block">
    <strong>Échéance</strong> - Paiement à réception, au plus tard le ${dueDate}.<br>
    <strong>Pénalités de retard</strong> - Tout retard de paiement entraîne, sans rappel préalable et conformément à l'article L. 441-10 du Code de commerce, l'application de pénalités au taux de <strong>3 fois le taux d'intérêt légal en vigueur</strong>, dues à compter du jour suivant la date d'échéance.<br>
    <strong>Indemnité forfaitaire de recouvrement</strong> - Conformément aux articles L. 441-10 et D. 441-5 du Code de commerce, en cas de retard de paiement entre professionnels, le débiteur est de plein droit redevable d'une indemnité forfaitaire pour frais de recouvrement de <strong>quarante euros (40 €)</strong>.<br>
    <strong>Aucun escompte</strong> n'est consenti pour paiement anticipé.
  </div>

  </div><!-- /invoice-body -->

  <div class="footer">
    <div class="diamond-row">♦</div>
    <div class="brand">MAPA Développement · Matis Gouyet</div>
    <div class="legal">
      89 Rue Yves Decugis, 59650 Villeneuve-d'Ascq · SIREN 919 461 301 · SIRET 919 461 301 00021<br>
      contact@mapa-developpement.fr · +33 6 79 62 39 42 · TVA non applicable, art. 293 B du CGI
    </div>
  </div>

</section>

</body>
</html>`
}
