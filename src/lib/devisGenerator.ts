import type { Client, Project } from './types'
import { generateQuoteNumber } from './utils'

export interface DevisLine {
  project: Project
  amount: number
}

export interface DevisParams {
  client: Client
  project: Project | null
  amount: number
  quoteNumber?: string
  validityDays?: number
  depositPercent?: number
  customNotes?: string
  /** Si true, ajoute les Conditions Générales de Vente sur la page 2 du PDF */
  includeCGV?: boolean
  /**
   * Projets additionnels du même client à inclure dans le devis (multi-prestations).
   * Chaque ligne ajoute une entrée à la table de tarification, et le total s'additionne.
   * Le `project` racine reste le projet « principal » (référence devis, périmètre par défaut).
   */
  additionalLines?: DevisLine[]
}

/** Tarifs catalogue par type (utilisés en repli si aucun budget n'est saisi sur le projet) */
const PROJECT_PRICES: Partial<Record<string, number>> = {
  website: 600,
  redesign: 600,
  webapp: 1000,
  ecommerce: 1000,
}

/**
 * Prix à proposer pour un projet :
 *  1. Le budget saisi sur la fiche projet (priorité absolue - c'est le tarif négocié)
 *  2. À défaut, le tarif catalogue selon le type
 *  3. À défaut, null (devis manuel)
 */
export function getPriceForProject(project: Project | null): number | null {
  if (!project) return null
  if (typeof project.budget === 'number' && project.budget > 0) return project.budget
  if (!project.type) return null
  return PROJECT_PRICES[project.type] ?? null
}

function prestationsForType(project: Project | null): string[] {
  const type = project?.type ?? 'other'
  switch (type) {
    case 'website':
    case 'redesign':
      return [
        'Design sur mesure - maquette validée avant intégration',
        'Intégration responsive - mobile, tablette, desktop',
        'Structure & contenus fournis par le client intégrés',
        'Référencement local SEO de base - balises, métadonnées',
        'Mise en ligne, nom de domaine & hébergement configurés',
        'Accompagnement post-livraison inclus - 30 jours',
      ]
    case 'webapp':
      return [
        'Design sur mesure - maquette validée avant intégration',
        'Intégration responsive - mobile, tablette, desktop',
        'Système de réservation ou de gestion intégré',
        'Base de données & back-office d\'administration',
        'Référencement local SEO de base - balises, métadonnées',
        'Mise en ligne, configuration serveur & domaine',
        'Accompagnement post-livraison inclus - 30 jours',
      ]
    case 'ecommerce':
      return [
        'Design sur mesure - maquette validée avant intégration',
        'Boutique en ligne - catalogue, fiches produits, panier',
        'Système de paiement sécurisé - Stripe ou équivalent',
        'Gestion des commandes & tableau de bord vendeur',
        'Référencement SEO produits & pages catégories',
        'Mise en ligne, configuration serveur & domaine',
        'Accompagnement post-livraison inclus - 30 jours',
      ]
    case 'seo':
      return [
        'Audit SEO complet - analyse positionnement actuel',
        'Optimisation on-page - balises, structure, mots-clés',
        'Optimisation technique - vitesse, Core Web Vitals',
        'Création ou optimisation de la fiche Google Business',
        'Rapport de suivi mensuel - positions & recommandations',
      ]
    case 'maintenance':
      return [
        'Maintenance corrective - correction des anomalies',
        'Mises à jour CMS, plugins et dépendances',
        'Sauvegardes régulières & monitoring disponibilité',
        'Support réactif par messagerie - délai garanti 24h',
      ]
    case 'automation':
      return [
        'Audit des processus & cartographie des tâches répétitives',
        'Conception du workflow d\'automatisation sur mesure',
        'Intégration aux outils existants (CRM, comptabilité, e-mail, API)',
        'Scripts, scénarios ou bots déployés en production',
        'Tests, monitoring & gestion des erreurs',
        'Documentation & accompagnement à la prise en main',
      ]
    default:
      return [
        'Analyse du besoin & cadrage de la mission',
        'Conception & développement sur mesure',
        'Tests & recette en collaboration avec le client',
        'Livraison, déploiement & documentation',
        'Accompagnement post-livraison inclus - 30 jours',
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
    automation: 'Automatisation',
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
    includeCGV = false,
    additionalLines = [],
  } = params

  // Lignes consolidées : projet principal + projets additionnels
  const allLines: DevisLine[] = [
    ...(project ? [{ project, amount }] : []),
    ...additionalLines,
  ]
  // Total HT = somme de toutes les lignes (ou amount seul si pas de projet)
  const totalAmount = allLines.length > 0
    ? allLines.reduce((s, l) => s + l.amount, 0)
    : amount
  const deposit = Math.round(totalAmount * depositPercent / 100)
  const solde = totalAmount - deposit

  const isMulti = allLines.length > 1
  const missionTitle = isMulti
    ? `Prestations combinées (${allLines.length} projets)`
    : project
    ? `${projectTypeLabel(project.type)} - ${project.name}`
    : 'Prestation digitale sur mesure'

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Devis ${quoteNumber} - ${client.name}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

  *{margin:0;padding:0;box-sizing:border-box;
    -webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact;}

  /* Fond noir sur toute la toile Puppeteer, quel que soit le nombre de pages */
  @page{size:A4 portrait;margin:0;}
  html,body{
    background:#0A0A0A;color:#E8E0D0;
    font-family:'Inter',sans-serif;font-size:9pt;line-height:1.6;
  }

  /* Chaque .page = une feuille A4 strictement dimensionnée + fond noir plein */
  .page{
    width:210mm;height:297mm;min-height:297mm;
    padding:14mm 16mm;
    display:flex;flex-direction:column;
    background:#0A0A0A;
    position:relative;
    box-sizing:border-box;
    page-break-after:always;
    break-after:page;
  }
  .page:last-child{page-break-after:auto;break-after:auto;}

  /* Zone centrale du devis qui remplit l'espace disponible */
  .devis-body{
    flex:1;display:flex;flex-direction:column;
    justify-content:space-evenly;
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
  .prest-list li::before{content:'-';color:#C9A84C;flex-shrink:0;}

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

  /* ══════════════════════════════════════════════
     CGV - 2 pages A4, typographie lisible (cabinet d'avocats)
     Flow vertical classique (plus de column-count qui débordait)
     ══════════════════════════════════════════════ */
  .cgv-head{
    border-bottom:1px solid rgba(201,168,76,.3);
    padding-bottom:10px;margin-bottom:14px;
    display:flex;align-items:baseline;justify-content:space-between;gap:12px;
  }
  .cgv-head .eyebrow{
    font-size:6.5pt;letter-spacing:.35em;text-transform:uppercase;color:#9E9080;
    margin-bottom:3px;
  }
  .cgv-head .ttl{
    font-family:'Playfair Display',serif;font-size:17pt;color:#E8E0D0;letter-spacing:.02em;
  }
  .cgv-head .meta{font-size:7pt;color:#9E9080;letter-spacing:.05em;text-align:right;line-height:1.6;}

  .cgv-preamble{
    font-size:8pt;line-height:1.65;color:#B5ABA0;
    background:#0E0E0E;border-left:2px solid #C9A84C;
    padding:10px 14px;margin-bottom:12px;
    text-align:justify;
  }
  .cgv-preamble strong{color:#E2C97E;font-weight:500;}

  .cgv-body{
    flex:1;
    font-size:7.5pt;line-height:1.6;color:#BAB0A0;
    text-align:justify;
  }
  .cgv-art{
    margin-bottom:9px;
    break-inside:avoid;
  }
  .cgv-art h5{
    font-size:7pt;font-weight:600;letter-spacing:.09em;text-transform:uppercase;
    color:#C9A84C;margin-bottom:4px;
  }
  .cgv-art p{margin-bottom:3px;color:#BAB0A0;}
  .cgv-art ul{margin:3px 0 4px 14px;padding:0;}
  .cgv-art li{margin-bottom:2px;list-style:'-  ';padding-left:2px;color:#A89D8D;}
  .cgv-art strong{color:#E2C97E;font-weight:500;}
  .cgv-art em{font-style:italic;color:#C8BFB0;}

  .cgv-continued{
    font-size:6.5pt;letter-spacing:.18em;text-transform:uppercase;color:#6F645A;
    text-align:right;padding-top:8px;
    border-top:1px solid rgba(201,168,76,.12);
  }

  .cgv-sign{
    margin-top:14px;padding-top:10px;
    border-top:1px solid rgba(201,168,76,.25);
    display:grid;grid-template-columns:1fr 1fr;gap:16px;
    font-size:7pt;color:#9E9080;
  }
  .cgv-sign .box{
    border:1px solid rgba(201,168,76,.2);background:#0E0E0E;
    padding:10px 14px;min-height:60px;
  }
  .cgv-sign .box .lbl{
    font-size:6.2pt;letter-spacing:.22em;text-transform:uppercase;
    color:#C9A84C;margin-bottom:5px;font-weight:600;
  }
  .cgv-sign .box .desc{font-size:7pt;color:#A89D8D;line-height:1.65;}

  .cgv-footer{
    margin-top:10px;padding-top:6px;
    border-top:1px solid rgba(201,168,76,.15);
    font-size:6pt;letter-spacing:.2em;text-transform:uppercase;
    color:#6F645A;text-align:center;
  }

  @media print{
    .cgv-head{padding-bottom:7px;margin-bottom:9px;}
    .cgv-head .ttl{font-size:14pt;}
    .cgv-head .eyebrow{font-size:5.8pt;}
    .cgv-head .meta{font-size:6.5pt;}
    .cgv-preamble{font-size:7pt;line-height:1.5;padding:7px 10px;margin-bottom:8px;}
    .cgv-body{font-size:6.9pt;line-height:1.5;}
    .cgv-art h5{font-size:6.6pt;margin-bottom:2px;}
    .cgv-art{margin-bottom:5px;}
    .cgv-art p{margin-bottom:2px;}
    .cgv-sign .box{min-height:50px;padding:9px 12px;}
    .cgv-sign .box .desc{font-size:6.8pt;}
    .cgv-footer{font-size:5.5pt;padding-top:4px;margin-top:6px;}
    .cgv-continued{font-size:5.8pt;padding-top:6px;}
  }

  /* ══════════════════════════════════════════════
     PAGE 4 - Signatures (page dédiée, respiration max)
     ══════════════════════════════════════════════ */
  .page-sign{justify-content:space-between;}
  .sign-head{
    text-align:center;
    padding-bottom:14px;
    border-bottom:1px solid rgba(201,168,76,.3);
  }
  .sign-head .eyebrow{
    font-size:7pt;letter-spacing:.35em;text-transform:uppercase;color:#9E9080;
    margin-bottom:6px;
  }
  .sign-head .ttl{
    font-family:'Playfair Display',serif;font-size:20pt;
    color:#E8E0D0;letter-spacing:.015em;
  }
  .sign-head .sub{
    font-size:8.5pt;color:#9E9080;margin-top:6px;line-height:1.6;
  }

  .sign-recap{
    background:#0E0E0E;border-left:2px solid #C9A84C;
    padding:14px 18px;margin-top:16px;
    font-size:9pt;line-height:1.75;color:#C8BFB0;
  }
  .sign-recap strong{color:#E2C97E;font-weight:500;}
  .sign-recap em{font-style:italic;color:#B5ABA0;}

  .sign-grid{
    display:grid;grid-template-columns:1fr 1fr;gap:20px;
    margin:18px 0;
  }
  .sign-card{
    border:1px solid rgba(201,168,76,.25);
    background:linear-gradient(180deg,#0E0E0E 0%,#0A0A0A 100%);
    padding:16px 18px;
    display:flex;flex-direction:column;
    min-height:155mm; /* grande hauteur pour signature manuscrite confortable */
  }
  .sign-card .lbl{
    font-size:7.5pt;letter-spacing:.28em;text-transform:uppercase;
    color:#C9A84C;margin-bottom:10px;font-weight:600;
    padding-bottom:8px;border-bottom:1px solid rgba(201,168,76,.18);
  }
  .sign-card .entity{
    font-size:9.5pt;color:#E8E0D0;font-weight:500;margin-bottom:4px;
  }
  .sign-card .coords{
    font-size:8pt;color:#9E9080;line-height:1.65;margin-bottom:14px;
  }
  .sign-card .fields{
    display:flex;flex-direction:column;gap:10px;margin-bottom:14px;
    font-size:8pt;color:#9E9080;
  }
  .sign-card .field{
    display:flex;align-items:baseline;gap:8px;
    border-bottom:1px dotted rgba(201,168,76,.25);padding:4px 0;
    min-height:14pt;
  }
  .sign-card .field .k{
    font-size:7.5pt;letter-spacing:.12em;text-transform:uppercase;
    color:#9E9080;min-width:40px;flex-shrink:0;
  }
  .sign-card .hint{
    font-size:7pt;color:#807569;font-style:italic;line-height:1.55;
    padding:6px 0 8px;
  }
  .sign-card .handwritten-zone{
    flex:1;
    border:1px dashed rgba(201,168,76,.2);border-radius:2px;
    min-height:70mm;
    position:relative;
    background:
      linear-gradient(180deg,rgba(201,168,76,.02) 0%,transparent 100%);
  }
  .sign-card .handwritten-zone::after{
    content:'Signature';
    position:absolute;bottom:6px;right:10px;
    font-size:6.5pt;letter-spacing:.22em;text-transform:uppercase;
    color:#4A453E;
  }

  .sign-mention{
    text-align:center;margin-top:14px;
    font-size:8.5pt;color:#B5ABA0;line-height:1.75;
    padding:10px 20px;
    border-top:1px solid rgba(201,168,76,.15);
    border-bottom:1px solid rgba(201,168,76,.15);
    background:rgba(201,168,76,.03);
  }
  .sign-mention strong{color:#E2C97E;font-style:italic;}

  .sign-footer{
    margin-top:14px;padding-top:10px;
    border-top:1px solid rgba(201,168,76,.2);
    text-align:center;
  }
  .sign-footer .brand{
    font-size:8pt;letter-spacing:.05em;color:#E8E0D0;font-weight:500;
    margin-bottom:3px;
  }
  .sign-footer .legal{
    font-size:6.5pt;letter-spacing:.16em;text-transform:uppercase;
    color:#6F645A;line-height:1.7;
  }

  @media print{
    .sign-head .ttl{font-size:18pt;}
    .sign-recap{font-size:8.5pt;padding:12px 16px;}
    .sign-card{min-height:150mm;padding:14px 16px;}
    .sign-card .handwritten-zone{min-height:68mm;}
    .sign-mention{font-size:8pt;}
    .sign-footer .legal{font-size:6pt;}
  }

  @media print{
    html,body{width:210mm;background:#0A0A0A;}
    body{font-size:9pt;line-height:1.55;}
    .page{
      width:210mm;height:297mm;min-height:297mm;
      padding:14mm 16mm;
      overflow:hidden;
    }
    .logo{font-size:24pt;}
    .agency{font-size:6pt;}
    .doc-title{font-size:13pt;}
    .header{padding-bottom:12px;margin-bottom:14px;}
    .slabel{font-size:6pt;margin-top:12px;margin-bottom:10px;}
    .info-block{padding:12px 14px;}
    .info-block .val{font-size:9.5pt;}
    .info-block .line{font-size:8.5pt;line-height:1.75;}
    .prest-list li{padding:6px 0;font-size:9pt;}
    .price-table th{padding:6px 8px;font-size:6pt;}
    .price-table td{padding:8px 8px;font-size:9pt;}
    .total-block{padding:12px 14px;margin-top:10px;}
    .tline{padding:4px 0;font-size:9pt;}
    .tline.main{font-size:11pt;padding-top:8px;}
    .tline.main .val{font-size:13pt;}
    .cond-block{padding:10px 12px;font-size:8.5pt;line-height:1.7;}
    .footer{padding-top:10px;}
  }

  @media screen{
    html{
      background:#0d0d0d;
      min-height:100vh;
      padding:40px 16px;
    }
    body{
      display:flex;flex-direction:column;align-items:center;gap:24px;
      margin:0;
    }
    .page{
      box-shadow:0 24px 80px rgba(0,0,0,.7);
      border-radius:2px;
    }
  }
</style>
</head>
<body>

<section class="page page-devis">

  <div class="header">
    <div class="logo">MAPA</div>
    <div class="agency">Développement · Solutions Digitales</div>
    <div class="diamond-row">♦</div>
    <div class="doc-title">${missionTitle}</div>
  </div>

  <div class="devis-body">

  <div class="slabel">Parties</div>
  <div class="grid2">
    <div class="info-block">
      <div class="key">Client</div>
      <div class="val">${client.company || client.name}</div>
      <div class="line">
        ${client.legal_form ? `${client.legal_form}<br>` : ''}
        ${client.address ? `${client.address}${client.city ? ', ' : '<br>'}` : ''}${client.city ? `${client.city}<br>` : ''}
        ${client.siret ? `SIRET : ${client.siret}<br>` : ''}
        ${client.vat_number ? `TVA : ${client.vat_number}<br>` : ''}
        ${client.name && client.company && client.name !== client.company ? `<br><strong style="color:#C8BFB0">Contact :</strong> ${client.name}${client.contact_role ? `, ${client.contact_role}` : ''}<br>` : ''}
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
        ${project?.name ? `Projet : ${project.name}` : 'MAPA Développement - Matis Gouyet'}
      </div>
    </div>
  </div>

  <div class="slabel">Périmètre de la prestation</div>
  ${isMulti
    ? allLines.map((l) => `
    <div style="margin-bottom:6px">
      <div style="font-size:7pt;color:#C9A84C;font-weight:600;letter-spacing:.04em;margin-bottom:2px">
        - ${projectTypeLabel(l.project.type)} · ${l.project.name}
      </div>
      <ul class="prest-list" style="margin-left:8px">
        ${prestationsForType(l.project).map((p) => `<li>${p}</li>`).join('\n        ')}
      </ul>
    </div>`).join('')
    : `<ul class="prest-list">
    ${(project ? prestationsForType(project) : prestationsForType(null)).map((p) => `<li>${p}</li>`).join('\n    ')}
  </ul>`}

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
    <div class="tline"><span>Acompte à la commande (${depositPercent}%)</span><span class="val">${formatEur(deposit)}</span></div>
    <div class="tline"><span>Solde à la livraison</span><span class="val">${formatEur(solde)}</span></div>
    <div class="tline main"><span>Total HT <span style="font-size:5.5pt;color:#9E9080;font-weight:400;margin-left:6px">(TVA non applicable - art. 293 B du CGI)</span></span><span class="val">${formatEur(totalAmount)}</span></div>
  </div>

  ${includeCGV
    ? `<p style="margin-top:8px;text-align:center;font-size:6.5pt;letter-spacing:.18em;text-transform:uppercase;color:#9E9080;">
        Conditions générales de vente détaillées en pages 2 à 4 · Signature en page 5
      </p>`
    : `<div class="slabel">Conditions</div>
  <div class="cond-block">
    <strong>Acompte</strong> - ${depositPercent}% du montant total (${formatEur(deposit)}) à la signature du devis, avant démarrage des travaux.<br>
    <strong>Solde</strong> - ${formatEur(solde)} à réception de la livraison finale, après validation du client.<br>
    <strong>Validité</strong> - Ce devis est valable 30 jours à compter de sa date d'émission.<br>
    <strong>Propriété</strong> - Les éléments livrés deviennent propriété du client après règlement intégral.
  </div>`}

  </div><!-- /devis-body -->

  <div class="footer">
    <div class="diamond-row">♦</div>
    <div class="brand">MAPA Développement</div>
    <div class="name">Matis Gouyet</div>
  </div>

</section>

${includeCGV ? renderCGVPage({ quoteNumber, client }) : ''}

</body>
</html>`
}

/* ═══════════════════════════════════════════════════════════
   PAGE 2 - Conditions Générales de Vente
   Rédigées pour une présentation à un cabinet d'avocats :
   fondements légaux explicites (Code de commerce, Code civil,
   Code de la propriété intellectuelle, Code de la consommation,
   RGPD), structure ordonnée, zéro clause floue.
   ═══════════════════════════════════════════════════════════ */
function renderCGVPage(ctx: { quoteNumber: string; client: Client }): string {
  const { quoteNumber, client } = ctx
  const clientName = client.company || client.name
  const updatedAt = today()
  const safe = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const cgvHeader = (pageLabel: string) => `
  <div class="cgv-head">
    <div>
      <div class="eyebrow">Annexe contractuelle</div>
      <div class="ttl">Conditions Générales de Vente</div>
    </div>
    <div class="meta">
      En vigueur au ${updatedAt}<br>
      Devis <strong style="color:#E2C97E">${safe(quoteNumber)}</strong> · ${safe(clientName)}<br>
      ${pageLabel}
    </div>
  </div>`

  const articlesPartOne = `
    <div class="cgv-art">
      <h5>Art. 1 - Objet</h5>
      <p>Les présentes CGV ont pour objet de définir les conditions dans lesquelles le Prestataire fournit au Client des prestations de conception, développement, intégration, maintenance et hébergement de sites internet, d'applications web et de logiciels sur mesure, sur la base d'un devis préalablement accepté.</p>
    </div>

    <div class="cgv-art">
      <h5>Art. 2 - Devis et formation du contrat</h5>
      <p>Chaque prestation fait l'objet d'un <strong>devis détaillé</strong>, valable trente (30) jours à compter de son émission. Le contrat est réputé formé à <strong>la date la plus tardive</strong> entre la réception par le Prestataire du devis signé et le versement effectif de l'acompte. Toute modification du périmètre en cours d'exécution fait l'objet d'un <strong>avenant écrit</strong> et d'une révision tarifaire si applicable.</p>
    </div>

    <div class="cgv-art">
      <h5>Art. 3 - Prix et modalités de paiement</h5>
      <p>Les prix sont exprimés en euros, <strong>hors taxes</strong>. Conformément à l'<em>article 293 B du Code général des impôts</em>, le Prestataire bénéficie de la franchise en base de TVA : <em>TVA non applicable</em>. Sauf stipulation contraire au devis : acompte de <strong>trente pour cent (30 %)</strong> à la commande, solde à la livraison. Les paiements sont effectués par virement bancaire sur le compte indiqué sur la facture. Aucun escompte pour paiement anticipé n'est consenti.</p>
    </div>

    <div class="cgv-art">
      <h5>Art. 4 - Pénalités de retard et indemnité forfaitaire</h5>
      <p>Conformément à l'<em>article L. 441-10 du Code de commerce</em>, tout retard de paiement entraîne de plein droit, sans mise en demeure préalable, l'application de pénalités au taux directeur semestriel de la Banque centrale européenne majoré de dix (<strong>10</strong>) points de pourcentage. En application de l'<em>article D. 441-5 du Code de commerce</em>, une <strong>indemnité forfaitaire de quarante euros (40 €)</strong> pour frais de recouvrement est également due, sans préjudice d'une indemnisation complémentaire sur justificatif si les frais réels exposés sont supérieurs.</p>
    </div>

    <div class="cgv-art">
      <h5>Art. 5 - Délais d'exécution</h5>
      <p>Les délais d'exécution sont donnés à titre indicatif. Le Prestataire met tout en œuvre pour les respecter ; aucun retard ne saurait toutefois ouvrir droit à dommages et intérêts, sauf faute lourde ou dolosive. Les délais sont prorogés de plein droit en cas de retard imputable au Client (défaut de validation, de contenus, d'accès) ou de force majeure.</p>
    </div>

    <div class="cgv-art">
      <h5>Art. 6 - Obligations du Client</h5>
      <p>Le Client s'engage à fournir, dans les délais convenus, l'ensemble des éléments nécessaires à l'exécution de la prestation (contenus, visuels, accès techniques, informations légales). Il <strong>garantit le Prestataire</strong> contre toute action fondée sur la méconnaissance de droits de tiers (propriété intellectuelle, droit à l'image, droits voisins, marques) au titre des éléments qu'il transmet, et garantit disposer des autorisations nécessaires au regard du RGPD pour les éventuelles données personnelles communiquées. Il désigne un interlocuteur unique disposant du pouvoir de validation au nom du Client.</p>
    </div>

    <div class="cgv-art">
      <h5>Art. 7 - Obligations du Prestataire</h5>
      <p>Le Prestataire s'engage à exécuter sa mission conformément aux règles de l'art et au périmètre contractuel. Il est tenu à une <strong>obligation de moyens</strong> et non de résultat. Il conserve le libre choix des moyens techniques et humains mis en œuvre.</p>
    </div>

    <div class="cgv-art">
      <h5>Art. 8 - Livraison, recette et garantie</h5>
      <p>Le Client dispose d'un délai de <strong>sept (7) jours calendaires</strong> à compter de la livraison pour émettre, par écrit, ses réserves motivées ; à défaut, la livraison est réputée <strong>acceptée sans réserve</strong>. Le Prestataire garantit la conformité des livrables au périmètre contractuel pendant <strong>trente (30) jours calendaires</strong> à compter de la livraison, à l'exclusion des anomalies résultant d'une utilisation non conforme aux préconisations du Prestataire, d'une intervention de tiers ou du Client sur le livrable, d'un défaut des éléments fournis par le Client ou d'évolutions technologiques postérieures à la livraison.</p>
    </div>`

  const articlesPartTwo = `
    <div class="cgv-art">
      <h5>Art. 9 - Suivi, maintenance, hébergement et évolutions</h5>
      <p><strong>9.1 Prestation de suivi.</strong> La garantie de conformité prévue à l'article 8 ne constitue pas une prestation de maintenance. Au-delà de ce délai, toute intervention (correction, ajout, modification, évolution) fait l'objet d'une <strong>prestation distincte</strong>, sur devis ou dans le cadre d'un contrat de suivi dédié.</p>
      <p><strong>9.2 Contrat de suivi.</strong> Le Client peut souscrire, à tout moment, un contrat de <strong>suivi et maintenance</strong> couvrant notamment : mises à jour techniques, supervision de la disponibilité, sauvegardes régulières, corrections d'anomalies, ajustements mineurs de contenu et accompagnement fonctionnel. Les modalités (périmètre, heures incluses, délais de réponse, tarif, durée) sont précisées dans un contrat distinct ou un bon de commande spécifique.</p>
      <p><strong>9.3 Durée et reconduction.</strong> Sauf stipulation contraire, le contrat de suivi est conclu pour une durée initiale de <strong>douze (12) mois</strong>, reconductible par tacite reconduction pour des périodes successives de même durée. Chaque partie peut y mettre fin par lettre recommandée avec accusé de réception adressée au moins <strong>trente (30) jours</strong> avant le terme en cours.</p>
      <p><strong>9.4 Hébergement et nom de domaine.</strong> L'hébergement du site et la gestion du nom de domaine constituent des prestations <strong>optionnelles</strong>, facturées séparément et reconductibles annuellement. À défaut de souscription, le Client conserve la charge exclusive de son hébergement et du renouvellement de son nom de domaine. Le Prestataire transfère, sur demande écrite et sous réserve du paiement intégral des sommes dues, l'ensemble des accès et codes sources nécessaires à une migration.</p>
      <p><strong>9.5 Évolutions et demandes complémentaires.</strong> Toute demande excédant le périmètre initial (nouvelles fonctionnalités, refonte de sections, intégrations tierces) fait l'objet d'un <strong>devis complémentaire</strong> facturé au <strong>taux journalier</strong> en vigueur communiqué sur demande.</p>
      <p><strong>9.6 Exclusions.</strong> Ne sont pas couverts par le contrat de suivi, sauf mention expresse : refontes graphiques, migrations technologiques, nouvelles fonctionnalités, interventions consécutives à une modification du livrable par le Client ou un tiers, et incidents imputables à l'hébergeur, aux services tiers, aux opérateurs de télécommunications ou au Client lui-même.</p>
    </div>

    <div class="cgv-art">
      <h5>Art. 10 - Propriété intellectuelle</h5>
      <p><strong>10.1 Éléments préexistants du Prestataire.</strong> Le Prestataire conserve la propriété pleine et entière de tous les éléments préexistants à la prestation : briques techniques, frameworks, librairies, modules, scripts, méthodologies, savoir-faire, outils, gabarits et composants génériques développés en amont ou en parallèle d'autres missions. Ces éléments demeurent la propriété exclusive du Prestataire et ne sont pas transférés au Client.</p>
      <p><strong>10.2 Éléments spécifiques développés pour le Client.</strong> Sous réserve du paiement intégral du prix convenu, le Prestataire cède au Client, à titre exclusif et pour la durée légale de protection des droits d'auteur, les droits patrimoniaux (reproduction, représentation, adaptation, modification, diffusion) sur les éléments développés spécifiquement pour le Client (chartes graphiques sur mesure, contenus rédactionnels originaux livrés, code spécifique à la solution livrée). La cession est consentie pour le monde entier et pour tout support, dans la limite des finalités du projet décrit au devis.</p>
      <p><strong>10.3 Outils et briques préexistantes intégrées.</strong> Lorsque la prestation intègre des éléments préexistants du Prestataire (10.1), le Prestataire concède au Client une <strong>licence d'utilisation non exclusive, non transférable, perpétuelle et mondiale</strong> sur ces éléments, dans la stricte mesure nécessaire à l'exploitation normale du livrable.</p>
      <p><strong>10.4 Licences tierces.</strong> Les composants logiciels tiers intégrés au livrable (open source, librairies, plugins, polices, etc.) demeurent soumis à leurs licences propres, dont le Client s'engage à respecter les termes.</p>
      <p><strong>10.5 Subordination au paiement.</strong> Tant que le prix n'est pas intégralement réglé, aucune cession ni licence n'est consentie. Le Prestataire conserve l'intégralité des droits sur les livrables et peut, le cas échéant, en exiger la restitution ou la suspension d'exploitation.</p>
      <p><strong>10.6 Droit moral.</strong> Conformément à l'<em>article L. 121-1 du Code de la propriété intellectuelle</em>, le droit moral de l'auteur (dont le respect du nom et de l'œuvre) demeure inaliénable.</p>
    </div>

  `

  const articlesPartThree = `
    <div class="cgv-art">
      <h5>Art. 11 - Réversibilité et portabilité</h5>
      <p><strong>11.1 Remise des livrables.</strong> À l'issue de la prestation et sous réserve du paiement intégral, le Prestataire remet au Client, sur demande écrite : le code source, les fichiers de production, les accès aux services associés (hébergement, nom de domaine, comptes tiers configurés au nom du Client), les éventuels identifiants administrateurs et la documentation technique disponible.</p>
      <p><strong>11.2 Assistance à la migration.</strong> En cas de migration vers un nouveau prestataire, le Prestataire apporte une assistance technique raisonnable, dans la limite de <strong>deux (2) heures incluses</strong>. Au-delà, les heures sont facturées au taux journalier en vigueur communiqué sur demande.</p>
      <p><strong>11.3 Conservation post-contractuelle.</strong> Le Prestataire conserve une copie d'archive du livrable pour une durée de <strong>six (6) mois</strong> suivant la fin de la prestation, à des fins de continuité de service et de gestion d'éventuelles réclamations. Au-delà, les éléments sont supprimés sauf demande expresse du Client de prolonger la conservation.</p>
    </div>

    <div class="cgv-art">
      <h5>Art. 12 - Confidentialité</h5>
      <p>Chaque partie s'engage à préserver la confidentialité des informations non publiques échangées dans le cadre de la relation contractuelle, pour toute la durée du contrat et pour une durée de <strong>trois (3) ans</strong> suivant son terme, sauf divulgation imposée par la loi ou une décision de justice.</p>
    </div>

    <div class="cgv-art">
      <h5>Art. 13 - Données personnelles (RGPD)</h5>
      <p>Les traitements de données personnelles sont conduits dans le respect du <em>Règlement (UE) 2016/679</em> (« RGPD ») et de la <em>loi n° 78-17 du 6 janvier 1978 modifiée</em>. Lorsque le Prestataire est amené à traiter des données personnelles pour le compte du Client (hébergement avec formulaire, gestion de bases utilisateurs), il agit en qualité de <strong>sous-traitant</strong> au sens de l'<em>article 28 du RGPD</em>. Un accord de sous-traitance des données (DPA) conforme à l'article 28.3 du RGPD est alors annexé au contrat ou conclu séparément. Pour les données traitées par le Prestataire en tant que responsable du traitement (gestion de la relation client, facturation), il est renvoyé à la politique de confidentialité accessible sur https://www.mapa-developpement.fr.</p>
    </div>

    <div class="cgv-art">
      <h5>Art. 14 - Responsabilité</h5>
      <p>La responsabilité du Prestataire ne peut être engagée que pour les <strong>dommages directs, matériels et prouvés</strong> résultant d'une faute qui lui est personnellement imputable. Sont expressément exclus les dommages indirects (pertes d'exploitation, de clientèle, de données, manque à gagner, atteinte à l'image, préjudice commercial). Sauf dommages corporels ou faute lourde ou dolosive, la responsabilité globale du Prestataire est plafonnée au <strong>montant hors taxes effectivement perçu</strong> au titre de la prestation concernée, tous préjudices et toutes causes confondues.</p>
    </div>

    <div class="cgv-art">
      <h5>Art. 15 - Force majeure</h5>
      <p>Aucune partie ne saurait voir sa responsabilité engagée en cas de force majeure au sens de l'<em>article 1218 du Code civil</em>. Si un tel événement se prolonge au-delà de <strong>soixante (60) jours</strong>, chaque partie peut résilier le contrat sans indemnité par lettre recommandée avec accusé de réception.</p>
    </div>

    <div class="cgv-art">
      <h5>Art. 16 - Résiliation</h5>
      <p>En cas d'inexécution d'une obligation essentielle et à défaut de régularisation dans un délai de <strong>quinze (15) jours</strong> suivant mise en demeure restée infructueuse adressée par lettre recommandée avec accusé de réception, la partie non défaillante peut résilier le contrat de plein droit. La résiliation aux torts du Client emporte exigibilité immédiate de l'ensemble des sommes dues. L'<strong>acompte versé constitue un acompte ferme et définitif</strong> et reste acquis au Prestataire à titre de frais engagés, sans préjudice de toute somme complémentaire correspondant aux travaux exécutés à la date de résiliation.</p>
    </div>

    <div class="cgv-art">
      <h5>Art. 17 - Non-sollicitation</h5>
      <p>Chaque partie s'engage, pendant l'exécution du contrat et pendant douze (<strong>12</strong>) mois suivant son terme, à ne pas solliciter ni recruter, directement ou indirectement, tout collaborateur ou sous-traitant de l'autre partie ayant participé à la prestation. Tout manquement sera sanctionné par une indemnité équivalant à <strong>six (6) mois de la rémunération brute moyenne</strong> perçue par la personne concernée au cours des douze (12) mois précédant le manquement, sans préjudice du droit pour la partie lésée de solliciter la réparation d'un préjudice complémentaire.</p>
    </div>

    <div class="cgv-art">
      <h5>Art. 18 - Référencement commercial</h5>
      <p>Sauf opposition expresse et écrite du Client notifiée à la signature du devis, le Prestataire est autorisé à <strong>citer le nom et le logo du Client</strong> ainsi que la nature des prestations réalisées à titre de référence commerciale (portfolio en ligne, dossiers commerciaux, présentations).</p>
    </div>

    <div class="cgv-art">
      <h5>Art. 19 - Modifications - Nullité partielle</h5>
      <p>Les CGV applicables sont celles en vigueur à la date d'acceptation du devis. La nullité ou l'inapplicabilité de l'une quelconque des stipulations <strong>n'affecte pas la validité des autres</strong> ; les parties s'engagent alors à négocier de bonne foi, au sens de l'<em>article 1104 du Code civil</em>, une stipulation de substitution d'effet économique équivalent.</p>
    </div>

    <div class="cgv-art">
      <h5>Art. 20 - Droit applicable et juridiction</h5>
      <p>Les présentes CGV sont soumises au <strong>droit français</strong>. À défaut de résolution amiable préalable, tout litige sera porté devant les <strong>tribunaux compétents de Lille</strong>, y compris en cas de référé, d'appel en garantie ou de pluralité de défendeurs. Cette clause attributive de juridiction est applicable même en cas de demande incidente, de pluralité de défendeurs ou d'appel en garantie, conformément à l'<em>article 48 du Code de procédure civile</em>, étant rappelé qu'elle s'applique exclusivement entre commerçants ou parties habilitées à y consentir.</p>
    </div>`

  return `
<section class="page page-cgv">
  ${cgvHeader('Page 2/5')}

  <div class="cgv-preamble">
    <strong>Préambule.</strong> Les présentes conditions générales de vente (ci-après « CGV ») régissent l'ensemble des relations contractuelles entre <strong>MAPA Développement</strong>, exploitée par Matis GOUYET, entrepreneur individuel sous le régime de la micro-entreprise, immatriculée au Registre National des Entreprises sous le numéro SIREN <strong>919 461 301</strong>, dont le siège est sis 89 Rue Yves Decugis, 59650 Villeneuve-d'Ascq (ci-après « le Prestataire »), et toute personne morale ou personne physique agissant à des fins entrant dans le cadre de son activité commerciale, industrielle, artisanale, libérale ou agricole, passant commande (ci-après « le Client »). Les présentes CGV sont <strong>exclusivement applicables aux relations entre professionnels</strong> au sens du droit français ; elles ne sauraient s'appliquer à un Client consommateur ou non-professionnel au sens de l'article liminaire du Code de la consommation. Toute commande emporte adhésion sans réserve aux présentes CGV, qui prévalent sur tout autre document du Client (CGA, conditions internes), sauf dérogation écrite expresse du Prestataire.
  </div>

  <div class="cgv-body">
    ${articlesPartOne}
  </div>

  <div class="cgv-continued">Suite page suivante →</div>
</section>

<section class="page page-cgv">
  ${cgvHeader('Page 3/5')}

  <div class="cgv-body">
    ${articlesPartTwo}
  </div>

  <div class="cgv-continued">Suite page suivante →</div>
</section>

<section class="page page-cgv">
  ${cgvHeader('Page 4/5')}

  <div class="cgv-body">
    ${articlesPartThree}
  </div>

  <div class="cgv-continued">Signature du devis et des présentes CGV → page suivante</div>
</section>

<section class="page page-sign">
  <div class="sign-head">
    <div class="eyebrow">Annexe contractuelle · Page 5/5</div>
    <div class="ttl">Acceptation du devis et des Conditions Générales de Vente</div>
    <div class="sub">Devis <strong style="color:#E2C97E">${safe(quoteNumber)}</strong> · ${safe(clientName)}</div>
  </div>

  <div class="sign-recap">
    La signature de la présente page vaut, de la part du Client, <strong>acceptation sans réserve</strong> du devis <strong>${safe(quoteNumber)}</strong> émis le ${updatedAt} par <strong>MAPA Développement</strong>, ainsi que des <strong>Conditions Générales de Vente</strong> figurant en pages 2, 3 et 4 du présent document. Le Client reconnaît en avoir pris connaissance préalablement, les avoir comprises, et s'engage à les respecter dans leur intégralité. <em>Fait en deux exemplaires originaux.</em>
  </div>

  <div class="sign-grid">
    <div class="sign-card">
      <div class="lbl">Le Prestataire</div>
      <div class="entity">MAPA Développement</div>
      <div class="coords">
        Matis GOUYET, Exploitant<br>
        89 Rue Yves Decugis, 59650 Villeneuve-d'Ascq<br>
        SIREN 919 461 301 · SIRET 919 461 301 00021<br>
        contact@mapa-developpement.fr
      </div>
      <div class="fields">
        <div class="field"><span class="k">Fait à</span><span>Villeneuve-d'Ascq</span></div>
        <div class="field"><span class="k">Le</span><span>${updatedAt}</span></div>
      </div>
      <div class="hint">Signature précédée de la mention manuscrite<br>« Lu et approuvé, bon pour accord » :</div>
      <div class="handwritten-zone"></div>
    </div>

    <div class="sign-card">
      <div class="lbl">Le Client - Bon pour accord</div>
      <div class="entity">${safe(clientName)}</div>
      <div class="coords">
        ${client.legal_form ? `${safe(client.legal_form)}` : ''}${client.legal_form && client.siret ? ' · ' : ''}${client.siret ? `SIRET ${safe(client.siret)}` : ''}${(client.legal_form || client.siret) ? '<br>' : ''}
        ${client.vat_number ? `TVA ${safe(client.vat_number)}<br>` : ''}
        ${client.address ? `${safe(client.address)}${client.city ? ', ' : '<br>'}` : ''}${client.city ? `${safe(client.city)}<br>` : ''}
        <br>
        Représenté par : ${client.name && client.name !== clientName ? `<strong style="color:#C8BFB0">${safe(client.name)}</strong>` : '_____________________________'}${client.contact_role ? `, ${safe(client.contact_role)}` : ''}<br>
        ${!client.name || client.name === clientName ? '_________________________________________<br>' : ''}
        ${client.email ? `<span style="color:#9E9080">${safe(client.email)}</span>` : ''}${client.email && client.phone ? ' · ' : ''}${client.phone ? `<span style="color:#9E9080">${safe(client.phone)}</span>` : ''}
      </div>
      <div class="fields">
        <div class="field"><span class="k">Fait à</span><span>${client.city ? safe(client.city) : '_________________________'}</span></div>
        <div class="field"><span class="k">Le</span><span>_____ / _____ / __________</span></div>
      </div>
      <div class="hint">Signature précédée de la mention manuscrite<br>« Lu et approuvé, bon pour accord » + cachet de l'entreprise :</div>
      <div class="handwritten-zone"></div>
    </div>
  </div>

  <div class="sign-mention">
    La mention <strong>« Lu et approuvé, bon pour accord »</strong> doit être apposée de la main du signataire, suivie de sa signature et, le cas échéant, du cachet de l'entreprise. Les <em>paraphes sont recommandés en bas de chaque page</em>. Tout exemplaire non signé ou dont la mention manuscrite ferait défaut ne saurait engager les parties.
  </div>

  <div class="sign-footer">
    <div class="brand">MAPA Développement</div>
    <div class="legal">
      SIREN 919 461 301 · TVA non applicable, art. 293 B du CGI<br>
      89 Rue Yves Decugis, 59650 Villeneuve-d'Ascq · contact@mapa-developpement.fr · +33 6 79 62 39 42
    </div>
  </div>
</section>`
}
