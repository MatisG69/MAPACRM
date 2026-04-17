import type { Client, Project } from './types'
import { generateQuoteNumber } from './utils'

export interface DevisParams {
  client: Client
  project: Project | null
  amount: number
  quoteNumber?: string
  validityDays?: number
  depositPercent?: number
  customNotes?: string
}

const PROJECT_PRICES: Partial<Record<string, number>> = {
  website: 600,
  redesign: 600,
  webapp: 1000,
  ecommerce: 1000,
}

export function getPriceForProject(project: Project | null): number | null {
  if (!project?.type) return null
  return PROJECT_PRICES[project.type] ?? null
}

function prestationsForType(project: Project | null): string[] {
  const type = project?.type ?? 'other'
  switch (type) {
    case 'website':
    case 'redesign':
      return [
        'Design sur mesure — maquette validée avant intégration',
        'Intégration responsive — mobile, tablette, desktop',
        'Structure & contenus fournis par le client intégrés',
        'Référencement local SEO de base — balises, métadonnées',
        'Mise en ligne, nom de domaine & hébergement configurés',
        'Accompagnement post-livraison inclus — 30 jours',
      ]
    case 'webapp':
      return [
        'Design sur mesure — maquette validée avant intégration',
        'Intégration responsive — mobile, tablette, desktop',
        'Système de réservation ou de gestion intégré',
        'Base de données & back-office d\'administration',
        'Référencement local SEO de base — balises, métadonnées',
        'Mise en ligne, configuration serveur & domaine',
        'Accompagnement post-livraison inclus — 30 jours',
      ]
    case 'ecommerce':
      return [
        'Design sur mesure — maquette validée avant intégration',
        'Boutique en ligne — catalogue, fiches produits, panier',
        'Système de paiement sécurisé — Stripe ou équivalent',
        'Gestion des commandes & tableau de bord vendeur',
        'Référencement SEO produits & pages catégories',
        'Mise en ligne, configuration serveur & domaine',
        'Accompagnement post-livraison inclus — 30 jours',
      ]
    case 'seo':
      return [
        'Audit SEO complet — analyse positionnement actuel',
        'Optimisation on-page — balises, structure, mots-clés',
        'Optimisation technique — vitesse, Core Web Vitals',
        'Création ou optimisation de la fiche Google Business',
        'Rapport de suivi mensuel — positions & recommandations',
      ]
    case 'maintenance':
      return [
        'Maintenance corrective — correction des anomalies',
        'Mises à jour CMS, plugins et dépendances',
        'Sauvegardes régulières & monitoring disponibilité',
        'Support réactif par messagerie — délai garanti 24h',
      ]
    default:
      return [
        'Analyse du besoin & cadrage de la mission',
        'Conception & développement sur mesure',
        'Tests & recette en collaboration avec le client',
        'Livraison, déploiement & documentation',
        'Accompagnement post-livraison inclus — 30 jours',
      ]
  }
}

function formatEur(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function today(): string {
  return new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function validUntil(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function projectTypeLabel(type: string | null | undefined): string {
  const map: Record<string, string> = {
    website: 'Site vitrine',
    ecommerce: 'Site e-commerce',
    webapp: 'Application web',
    redesign: 'Refonte de site',
    maintenance: 'Maintenance',
    seo: 'Référencement SEO',
    other: 'Prestation sur mesure',
  }
  return type ? (map[type] ?? 'Prestation sur mesure') : 'Prestation sur mesure'
}

export function generateDevisHTML(params: DevisParams): string {
  const {
    client,
    project,
    amount,
    quoteNumber = generateQuoteNumber(),
    validityDays = 30,
    depositPercent = 30,
    customNotes,
  } = params

  const deposit = Math.round(amount * depositPercent / 100)
  const solde = amount - deposit
  const prestations = prestationsForType(project)
  const missionTitle = project
    ? `${projectTypeLabel(project.type)} — ${project.name}`
    : 'Prestation digitale sur mesure'

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Devis ${quoteNumber} — ${client.name}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

  *{margin:0;padding:0;box-sizing:border-box;}

  html,body{
    width:210mm;height:297mm;
    background:#0A0A0A;color:#E8E0D0;
    font-family:'Inter',sans-serif;font-size:8.5pt;line-height:1.6;
  }

  body{
    padding:12mm 14mm;
    display:flex;flex-direction:column;
  }

  /* ── En-tête ── */
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

  /* ── Section label ── */
  .slabel{
    display:flex;align-items:center;gap:10px;
    font-size:5.5pt;font-weight:600;letter-spacing:.22em;
    text-transform:uppercase;color:#C9A84C;
    margin-bottom:8px;margin-top:10px;
  }
  .slabel::before,.slabel::after{
    content:'';flex:1;height:1px;
    background:rgba(201,168,76,.18);
  }

  /* ── Grid 2 colonnes ── */
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}

  /* ── Info bloc ── */
  .info-block{background:#111;border:1px solid rgba(201,168,76,.12);border-radius:2px;padding:10px 12px;}
  .info-block .key{font-size:5.5pt;letter-spacing:.15em;text-transform:uppercase;color:#9E9080;margin-bottom:2px;}
  .info-block .val{color:#E2C97E;font-size:8pt;font-weight:500;}
  .info-block .line{color:#C8BFB0;font-size:7.5pt;line-height:1.7;}

  /* ── Prestations ── */
  .prest-list{list-style:none;margin:0;}
  .prest-list li{
    display:flex;gap:10px;padding:5px 0;
    border-bottom:1px solid #161616;font-size:7.5pt;color:#C8BFB0;
  }
  .prest-list li:last-child{border-bottom:none;}
  .prest-list li::before{content:'—';color:#C9A84C;flex-shrink:0;}

  /* ── Tableau tarif ── */
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

  /* ── Total ── */
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
    font-size:10pt;font-weight:600;color:#E8E0D0;
    padding-top:8px;margin-top:2px;
  }
  .tline .val{
    font-family:'JetBrains Mono',monospace;
    color:#C9A84C;
  }
  .tline.main .val{font-size:12pt;}

  /* ── Conditions ── */
  .cond-block{
    background:#111;border-left:2px solid #C9A84C;
    padding:8px 12px;font-size:7pt;color:#9E9080;line-height:1.7;
  }
  .cond-block strong{color:#C9A84C;}

  /* ── Footer ── */
  .footer{
    margin-top:auto;padding-top:8px;
    border-top:1px solid rgba(201,168,76,.15);
    text-align:center;
  }
  .footer .brand{font-weight:600;color:#E8E0D0;font-size:8pt;letter-spacing:.05em;}
  .footer .name{
    font-family:'Playfair Display',serif;font-style:italic;
    color:#9E9080;font-size:7.5pt;margin-top:1px;
  }

  @media print{
    @page{margin:0;size:A4 portrait;}
    html,body{width:210mm;height:297mm;}
    body{
      padding:6mm 10mm;
      height:297mm;
      overflow:hidden;
      font-size:7pt;
      line-height:1.4;
    }
    .logo{font-size:16pt;}
    .agency{font-size:4.5pt;}
    .doc-title{font-size:9pt;}
    .diamond-row{margin:4px 0;}
    .header{padding-bottom:6px;margin-bottom:7px;}
    .slabel{margin-top:6px;margin-bottom:4px;font-size:4.5pt;}
    .info-block{padding:7px 10px;}
    .info-block .val{font-size:7pt;}
    .info-block .line{font-size:6.5pt;}
    .prest-list li{padding:3px 0;font-size:6.5pt;}
    .price-table td{padding:5px 8px;font-size:6.5pt;}
    .price-table th{padding:4px 8px;font-size:4.5pt;}
    .total-block{padding:7px 12px;margin-top:5px;}
    .tline{padding:2px 0;font-size:6.5pt;}
    .tline.main{font-size:8.5pt;padding-top:5px;}
    .tline.main .val{font-size:10pt;}
    .cond-block{padding:6px 10px;font-size:6pt;}
    .footer{margin-top:auto;padding-top:6px;}
  }

  @media screen{
    html{
      background:#0d0d0d;
      min-height:100vh;
      display:flex;
      justify-content:center;
      align-items:flex-start;
      padding:40px 16px;
      width:auto;height:auto;
    }
    body{
      width:210mm;
      min-height:297mm;
      height:auto;
      margin:0;
      box-shadow:0 24px 80px rgba(0,0,0,.7);
      border-radius:2px;
    }
  }
</style>
</head>
<body>

  <div class="header">
    <div class="logo">MAPA</div>
    <div class="agency">Développement · Solutions Digitales</div>
    <div class="diamond-row">♦</div>
    <div class="doc-title">${missionTitle}</div>
  </div>

  <div class="slabel">Parties</div>
  <div class="grid2">
    <div class="info-block">
      <div class="key">Client</div>
      <div class="val">${client.name}</div>
      <div class="line">
        ${client.company && client.company !== client.name ? `${client.company}<br>` : ''}
        ${client.city ? `${client.address ? client.address + ', ' : ''}${client.city}<br>` : ''}
        ${client.email ? `${client.email}<br>` : ''}
        ${client.phone ? `${client.phone}` : ''}
      </div>
    </div>
    <div class="info-block">
      <div class="key">Référence devis</div>
      <div class="val">${quoteNumber}</div>
      <div class="line">
        Émis le ${today()}<br>
        Valable jusqu'au ${validUntil(validityDays)}<br>
        ${project?.name ? `Projet : ${project.name}` : 'MAPA Développement — Matis Gouyet'}
      </div>
    </div>
  </div>

  <div class="slabel">Périmètre de la prestation</div>
  <ul class="prest-list">
    ${prestations.map((p) => `<li>${p}</li>`).join('\n    ')}
  </ul>

  ${customNotes ? `<div class="cond-block" style="margin-top:8px"><strong>Note :</strong> ${customNotes}</div>` : ''}

  <div class="slabel">Tarification</div>
  <table class="price-table">
    <thead>
      <tr>
        <th>Prestation</th>
        <th>Description</th>
        <th style="text-align:right">Montant</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong style="color:#E2C97E">${projectTypeLabel(project?.type)}</strong></td>
        <td>${project?.name ?? 'Prestation sur mesure'}</td>
        <td class="amt">${formatEur(amount)}</td>
      </tr>
    </tbody>
  </table>
  <div class="total-block">
    <div class="tline"><span>Acompte à la commande (${depositPercent}%)</span><span class="val">${formatEur(deposit)}</span></div>
    <div class="tline"><span>Solde à la livraison</span><span class="val">${formatEur(solde)}</span></div>
    <div class="tline main"><span>Total TTC</span><span class="val">${formatEur(amount)}</span></div>
  </div>

  <div class="slabel">Conditions</div>
  <div class="cond-block">
    <strong>Acompte</strong> — ${depositPercent}% du montant total (${formatEur(deposit)}) à la signature du devis, avant démarrage des travaux.<br>
    <strong>Solde</strong> — ${formatEur(solde)} à réception de la livraison finale, après validation du client.<br>
    <strong>Validité</strong> — Ce devis est valable 30 jours à compter de sa date d'émission.<br>
    <strong>Propriété</strong> — Les éléments livrés deviennent propriété du client après règlement intégral.
  </div>

  <div class="footer">
    <div class="diamond-row">♦</div>
    <div class="brand">MAPA Développement</div>
    <div class="name">Matis Gouyet</div>
  </div>

</body>
</html>`
}
