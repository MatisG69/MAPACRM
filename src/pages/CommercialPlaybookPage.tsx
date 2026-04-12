import type { ComponentType, ReactNode } from 'react';
import { Header } from '../components/layout/Header';
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Handshake,
  Layers,
  Lightbulb,
  Percent,
  Target,
  Users,
} from 'lucide-react';

const TOC: { id: string; label: string }[] = [
  { id: 'intro', label: 'Introduction' },
  { id: 'presentation', label: 'Présentation MAPA' },
  { id: 'positionnement', label: 'Positionnement' },
  { id: 'offres', label: 'Offres (3 niveaux)' },
  { id: 'funnel', label: 'Logique commerciale' },
  { id: 'cibles', label: 'Cibles & secteurs' },
  { id: 'qualification', label: 'Qualification' },
  { id: 'roles', label: 'Rôles commercial / technique' },
  { id: 'collaboration', label: 'Matis & Jibril' },
  { id: 'tarifs', label: 'Tarifs & suivi' },
  { id: 'seo', label: 'SEO' },
  { id: 'remuneration', label: 'Rémunération 50/50' },
  { id: 'argument-suivi', label: 'Argument suivi client' },
];

function Section({
  id,
  title,
  icon: Icon,
  children,
}: {
  id: string;
  title: string;
  icon: ComponentType<{ className?: string; size?: number }>;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 md:scroll-mt-24">
      <h2 className="font-display text-lg md:text-xl font-bold text-ws-cream tracking-tight mb-4 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ws-accent-dim text-ws-accent-soft border border-ws-accent/25">
          <Icon size={18} strokeWidth={2} />
        </span>
        {title}
      </h2>
      <div className="text-sm text-ws-ink leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 pl-0 list-none">
      {items.map((t) => (
        <li key={t} className="flex gap-2.5">
          <CheckCircle2 className="text-ws-accent-soft flex-shrink-0 mt-0.5" size={16} strokeWidth={2} />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function OfferBlock({
  badge,
  title,
  price,
  subtitle,
  items,
  targets,
  accent,
}: {
  badge: string;
  title: string;
  price?: string;
  subtitle: string;
  items: string[];
  targets: string;
  accent: 'entry' | 'mid' | 'premium';
}) {
  const ring =
    accent === 'entry'
      ? 'border-ws-mist/30'
      : accent === 'mid'
        ? 'border-ws-accent/35'
        : 'border-ws-highlight/40';
  return (
    <div className={`rounded-2xl border ${ring} bg-ws-raised/50 p-5 md:p-6`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ws-accent-soft">{badge}</span>
        {price && (
          <span className="font-display text-xl font-bold text-ws-cream tabular-nums">{price}</span>
        )}
      </div>
      <h3 className="font-display font-semibold text-ws-paper text-base mb-1">{title}</h3>
      <p className="text-xs text-ws-mist mb-4">{subtitle}</p>
      <BulletList items={items} />
      <p className="mt-4 pt-4 border-t border-ws-line/60 text-[11px] font-mono text-ws-ink">
        <span className="text-ws-mist uppercase tracking-wider">Cibles · </span>
        {targets}
      </p>
    </div>
  );
}

export function CommercialPlaybookPage() {
  return (
    <div className="pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-12">
      <Header
        title="Guide commercial MAPA"
        subtitle="Cadre opérationnel · offres · cibles · collaboration Matis & Jibril · édition 2026 v1.0"
      />

      <div className="px-4 sm:px-5 md:px-8 py-5 md:py-6 max-w-6xl mx-auto w-full min-w-0">
        <div
          className="flex gap-3 rounded-2xl border border-amber-500/25 bg-amber-950/20 px-4 py-3 mb-8 text-xs text-ws-paper/90"
          role="note"
        >
          <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-semibold text-amber-200/95 font-mono text-[10px] uppercase tracking-wider mb-1">
              Document interne — confidentiel
            </p>
            <p className="leading-relaxed text-ws-ink">
              Réservé à l’usage du partenaire commercial et de l’équipe MAPA Développement. Ne pas diffuser hors
              périmètre convenu.
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-10 lg:gap-12">
          <nav
            className="lg:w-52 flex-shrink-0 lg:sticky lg:top-28 self-start"
            aria-label="Sommaire"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ws-mist mb-3">Sommaire</p>
            <ul className="space-y-1">
              {TOC.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="block py-1.5 px-2 -mx-2 rounded-lg text-xs text-ws-ink hover:text-ws-cream hover:bg-white/[0.04] transition-colors font-mono leading-snug"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex-1 min-w-0 space-y-14 md:space-y-16">
            <section id="intro" className="scroll-mt-28 md:scroll-mt-24">
              <h2 className="font-display text-xl font-bold text-ws-cream mb-3">À propos de ce guide</h2>
              <p className="text-sm text-ws-ink leading-relaxed">
                Ce guide regroupe le <strong className="text-ws-paper">cadre commercial</strong>, le{' '}
                <strong className="text-ws-paper">cadre de collaboration</strong>, les{' '}
                <strong className="text-ws-paper">offres & suivi client</strong> et les principes de{' '}
                <strong className="text-ws-paper">rémunération</strong> partagés avec le commercial partenaire. Il
                sert de référence unique dans le CRM pour aligner prospection, qualification et relation avec la
                production technique.
              </p>
            </section>

            <Section id="presentation" title="Présentation — MAPA Développement" icon={Briefcase}>
              <p>
                Structure spécialisée dans la <strong className="text-ws-paper">conception de solutions digitales</strong>{' '}
                pour les professionnels : accompagnement des entreprises dans leur développement en ligne.
              </p>
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <div className="rounded-xl border border-ws-line/60 bg-black/20 p-4">
                  <p className="font-mono text-[10px] uppercase text-ws-mist mb-2">Nous accompagnons via</p>
                  <BulletList
                    items={[
                      'Création de sites web',
                      'Développement de solutions sur mesure',
                      'Optimisation de l’acquisition client',
                    ]}
                  />
                </div>
                <div className="rounded-xl border border-ws-line/60 bg-black/20 p-4">
                  <p className="font-mono text-[10px] uppercase text-ws-mist mb-2">Notre approche</p>
                  <BulletList
                    items={[
                      'Rapidité d’exécution',
                      'Efficacité des solutions',
                      'Orientation résultat mesurable',
                    ]}
                  />
                </div>
              </div>
            </Section>

            <Section id="positionnement" title="Positionnement & règle d’or" icon={Lightbulb}>
              <p className="text-ws-paper font-medium">
                Nous ne vendons pas « un site web » : nous vendons des{' '}
                <strong>outils qui génèrent des clients</strong>, améliorent la visibilité et automatisent l’activité.
              </p>
              <div className="rounded-2xl border border-ws-accent/30 bg-ws-accent-dim/25 px-5 py-4 mt-4">
                <p className="font-display text-base text-ws-cream font-semibold mb-1">La règle fondamentale</p>
                <p className="text-ws-paper text-sm">
                  On ne vend pas un site web. On vend un <strong>outil qui fait gagner de l’argent</strong>.
                </p>
                <p className="text-xs text-ws-mist mt-2 font-mono">
                  Objectif : créer un flux constant de nouveaux clients.
                </p>
              </div>
            </Section>

            <Section id="offres" title="Offres proposées (3 niveaux)" icon={Layers}>
              <p className="mb-6">
                Progression naturelle : présence en ligne → interaction client → performance durable → revenu récurrent
                (suivi).
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <OfferBlock
                  accent="entry"
                  badge="Entrée"
                  title="Site vitrine"
                  price="600 € TTC"
                  subtitle="Présence professionnelle en ligne — produit d’entrée, facile à vendre."
                  items={[
                    'Présentation de l’activité',
                    'Services & produits',
                    'Design moderne & responsive',
                    'Version mobile',
                    'SEO de base',
                    'Formulaire contact',
                  ]}
                  targets="Artisans, commerces locaux, petites entreprises sans présence en ligne."
                />
                <OfferBlock
                  accent="mid"
                  badge="Valeur / Avancé"
                  title="Site fonctionnel"
                  price="1 000 € TTC"
                  subtitle="Aller plus loin : interaction directe avec les clients finaux."
                  items={[
                    'Réservation en ligne & disponibilités',
                    'Formulaires avancés, paiement en ligne si besoin',
                    'Interface administrateur',
                    'Notifications e-mail',
                  ]}
                  targets="Restaurants, salons, activités sur rendez-vous, services."
                />
                <OfferBlock
                  accent="premium"
                  badge="Sur mesure / Premium"
                  title="Solution complète"
                  subtitle="Tarif au cas par cas — typiquement &gt; 1 500 € TTC."
                  items={[
                    'Site + fonctionnalités avancées',
                    'Dashboard administrateur',
                    'CRM simple, statistiques & suivi',
                    'Automatisation de processus',
                    'Développement sur mesure',
                  ]}
                  targets="Entreprises structurées, fort volume client, besoin d’automatisation."
                />
              </div>
            </Section>

            <Section id="funnel" title="Logique commerciale" icon={ArrowRight}>
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { step: '01', title: 'Entrée', body: 'Site vitrine — prise de contact facile.' },
                  { step: '02', title: 'Qualification', body: 'Détection du besoin réel.' },
                  { step: '03', title: 'Upsell', body: 'Vers solution complète & suivi.' },
                ].map((b) => (
                  <div key={b.step} className="rounded-xl border border-ws-line/70 bg-ws-surface/40 p-4">
                    <span className="font-mono text-ws-accent-soft text-xs">{b.step}</span>
                    <p className="font-semibold text-ws-paper mt-1">{b.title}</p>
                    <p className="text-xs text-ws-mist mt-2">{b.body}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-ws-mist mt-4 font-mono">
                Fonctionnement global : contacts → prospection → sélection des prospects intéressés → collaboration sur
                projets qualifiés.
              </p>
            </Section>

            <Section id="cibles" title="Types d’entreprises & cibles prioritaires" icon={Target}>
              <p>
                <strong className="text-ws-paper">Cible globale :</strong> entreprises locales avec clients physiques ou
                trafic local.
              </p>
              <div className="grid sm:grid-cols-2 gap-3 mt-4">
                <div className="rounded-xl border border-ws-line/60 p-4">
                  <p className="text-xs font-mono text-ws-accent-soft uppercase mb-2">Priorité haute</p>
                  <ul className="text-xs space-y-2 text-ws-ink">
                    <li>Commerces alimentaires (boucherie, boulangerie, épicerie…)</li>
                    <li>Restauration, snacks, food trucks, traiteurs</li>
                    <li>Beauté / bien-être (coiffure, barbier, institut, spa…)</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-ws-line/60 p-4">
                  <p className="text-xs font-mono text-ws-mist uppercase mb-2">Priorité moyenne à forte</p>
                  <ul className="text-xs space-y-2 text-ws-ink">
                    <li>Santé & services (dentiste, kiné, ostéo…)</li>
                    <li>Artisans (plombier, électricien, menuisier…) — très rentables, vivent du lead</li>
                    <li>Auto, sport, loisirs (garage, salle de sport, coaching…)</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 rounded-xl bg-black/25 border border-ws-accent/15 px-4 py-3 text-xs">
                <strong className="text-ws-cream">Signaux d’opportunité :</strong> sans site, site obsolète / peu
                professionnel, pas de réservation en ligne — argumentaires refonte & upsell naturels.
              </div>
            </Section>

            <Section id="qualification" title="Qualification — questions clés" icon={CheckCircle2}>
              <ol className="space-y-3 list-decimal list-inside text-sm marker:text-ws-accent-soft marker:font-mono">
                <li>
                  <span className="text-ws-paper font-medium">Avez-vous un site aujourd’hui ?</span>{' '}
                  <span className="text-ws-mist">— Si non → opportunité directe.</span>
                </li>
                <li>
                  <span className="text-ws-paper font-medium">Vos clients peuvent-ils réserver en ligne ?</span>{' '}
                  <span className="text-ws-mist">— Si non → opportunité directe.</span>
                </li>
                <li>
                  <span className="text-ws-paper font-medium">Recevez-vous des demandes via Internet ?</span>{' '}
                  <span className="text-ws-mist">— Si non → levier d’amélioration fort.</span>
                </li>
              </ol>
            </Section>

            <Section id="roles" title="Rôle du commercial vs technique" icon={Users}>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-ws-accent/25 bg-ws-accent-dim/15 p-4">
                  <p className="font-mono text-[10px] uppercase text-ws-accent-soft mb-2">Commercial</p>
                  <BulletList
                    items={[
                      'Contacter les entreprises ciblées',
                      'Qualifier le besoin & les opportunités',
                      'Générer des leads qualifiés',
                      'Transmettre les prospects pour la phase technique',
                    ]}
                  />
                  <p className="text-[11px] text-ws-mist mt-3">
                    Rôle exclusivement commercial : pas de développement ni pilotage technique.
                  </p>
                </div>
                <div className="rounded-xl border border-ws-line/60 bg-ws-raised/40 p-4">
                  <p className="font-mono text-[10px] uppercase text-ws-mist mb-2">Technique (Matis / production)</p>
                  <BulletList
                    items={[
                      'Conception & développement',
                      'Livraison du produit',
                      'Maintenance & accompagnement',
                      'Conseil produit',
                    ]}
                  />
                </div>
              </div>
            </Section>

            <Section id="collaboration" title="Cadre Matis & Jibril" icon={Handshake}>
              <p>
                Organisation simple et professionnelle : les opportunités se construisent ensemble ; la prospection et
                la relation client sont portées par le commercial ; la production par Matis.
              </p>
              <div className="rounded-xl border border-ws-line/60 overflow-hidden mt-4 text-xs">
                <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-ws-line/60">
                  <div className="p-4 bg-black/20">
                    <p className="font-mono text-ws-cream uppercase text-[10px] mb-2">Matis</p>
                    <BulletList
                      items={[
                        'Production & pilotage technique',
                        'Conception, développement, fonctionnalités',
                        'Suivi technique & maintenance',
                      ]}
                    />
                  </div>
                  <div className="p-4">
                    <p className="font-mono text-ws-cream uppercase text-[10px] mb-2">Jibril</p>
                    <BulletList
                      items={[
                        'Développement commercial',
                        'Identification, contact, présentation des offres',
                        'Qualification, relances & transformation',
                      ]}
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-ws-mist mt-4 font-mono">
                Identification des entreprises : participation commune à l’alimentation du CRM ; le commercial se concentre
                ensuite sur contact, qualification et concrétisation.
              </p>
              <div className="mt-4 rounded-xl border border-ws-line/50 p-4">
                <p className="font-mono text-[10px] uppercase text-ws-mist mb-2">Créneaux prospection recommandés</p>
                <p className="text-sm text-ws-ink">
                  <strong className="text-ws-paper">Mardi</strong> 10h–12h · <strong className="text-ws-paper">Mercredi</strong>{' '}
                  14h–17h · <strong className="text-ws-paper">Jeudi</strong> (fenêtres où les pros sont souvent plus
                  disponibles).
                </p>
              </div>
            </Section>

            <Section id="tarifs" title="Tarifs création & suivi mensuel" icon={Briefcase}>
              <p className="mb-4">
                Tarifs de création alignés sur le cadre « Offres & suivi client » : vitrine{' '}
                <strong className="text-ws-paper">600 €</strong>, fonctionnel{' '}
                <strong className="text-ws-paper">1 000 €</strong>, sur mesure sur devis (&gt; 1 500 € typiquement).
              </p>
              <div className="rounded-2xl border border-ws-highlight/25 bg-gradient-to-br from-ws-accent-dim/20 to-transparent p-5 mb-6">
                <p className="font-display text-ws-cream font-semibold mb-2">Suivi mensuel — l’offre clé</p>
                <p className="text-xs text-ws-ink mb-4">
                  Transforme un client ponctuel en client long terme et génère du <strong className="text-ws-paper">revenu
                  récurrent</strong>.
                </p>
                <div className="grid sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="font-mono text-ws-mist uppercase text-[10px] mb-1">Inclus</p>
                    <BulletList
                      items={[
                        'Assistance & corrections techniques',
                        'Petites modifications (textes, images)',
                        'Conseils & optimisation continue',
                        '1 bilan mensuel (analyse, reco.)',
                      ]}
                    />
                  </div>
                  <div>
                    <p className="font-mono text-ws-mist uppercase text-[10px] mb-1">Hors suivi (facturation à part)</p>
                    <BulletList items={['Refonte lourde', 'Fonctionnalités majeures — opportunité projet additionnel']} />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-ws-line/60">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-ws-line/60 bg-black/30 font-mono text-ws-mist uppercase text-[10px]">
                      <th className="p-3">Offre</th>
                      <th className="p-3">Tarif / mois</th>
                      <th className="p-3 hidden sm:table-cell">Positionnement</th>
                    </tr>
                  </thead>
                  <tbody className="text-ws-ink">
                    <tr className="border-b border-ws-line/40">
                      <td className="p-3 text-ws-paper">Site vitrine</td>
                      <td className="p-3 font-mono tabular-nums">100 € TTC</td>
                      <td className="p-3 hidden sm:table-cell">Accessible — rentable dès 6 clients</td>
                    </tr>
                    <tr className="border-b border-ws-line/40">
                      <td className="p-3 text-ws-paper">Site fonctionnel</td>
                      <td className="p-3 font-mono tabular-nums">200 € TTC</td>
                      <td className="p-3 hidden sm:table-cell">Standard marché, forte valeur</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-ws-paper">Sur mesure</td>
                      <td className="p-3 font-mono tabular-nums">200 – 400 € TTC</td>
                      <td className="p-3 hidden sm:table-cell">Selon complexité, négocié au cas par cas</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-ws-mist mt-4 font-mono">
                Rappel cadre collaboration : suivi vitrine 100 € / fonctionnel 200 € (mention document Matis encaisse) ;
                aligner avec la grille ci-dessus pour la vente.
              </p>
            </Section>

            <Section id="seo" title="Notion de référencement (SEO)" icon={Lightbulb}>
              <p>
                Le référencement = visibilité sur Google et moteurs. Une recherche locale type « activité + ville » fait
                remonter en priorité les entreprises <strong className="text-ws-paper">les mieux référencées</strong>.
              </p>
              <p className="text-ws-mist text-xs mt-2">
                Un site peu visible limite l’impact commercial — argument de vente direct pour amélioration continue &
                suivi.
              </p>
            </Section>

            <Section id="remuneration" title="Rémunération — équité 50/50 net" icon={Percent}>
              <p className="mb-4">
                Principe : <strong className="text-ws-paper">égalité sur le revenu net réel</strong> après charges, pas
                seulement sur le brut. La rémunération du commercial est déclenchée à la <strong>signature</strong>, pas
                sur la prospection seule.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-ws-line/60 p-4 space-y-3">
                  <p className="font-mono text-[10px] uppercase text-ws-accent-soft">Scénario A — Matis encaisse</p>
                  <p className="text-xs text-ws-ink">
                    Charges micro (~22 %) appliquées sur <strong>tout</strong> le CA encaissé par Matis → pour un net
                    équitable, répartition indicative du CA : <strong className="text-ws-paper">43,8 %</strong> Jibril /{' '}
                    <strong className="text-ws-paper">56,2 %</strong> Matis ≈ <strong>50/50 net</strong> après charges.
                  </p>
                  <p className="text-[11px] font-mono text-ws-mist bg-black/25 rounded-lg p-3">
                    Ex. 2 000 € : après charges Matis sur 2 000 €, répartition puis charges côté Jibril sur sa part → nets
                    alignés (~ordre de grandeur identique).
                  </p>
                </div>
                <div className="rounded-xl border border-ws-line/60 p-4 space-y-3">
                  <p className="font-mono text-[10px] uppercase text-ws-accent-soft">Scénario B — Jibril encaisse</p>
                  <p className="text-xs text-ws-ink">
                    Jibril encaisse le CA puis <strong className="text-ws-paper">reverse 50 % du CA à Matis</strong>. Avec
                    ACRE (~11 %) côté Jibril sur la totalité et charges classiques sur la part de Matis, on vise le même
                    ordre de grandeur de <strong>net chacun</strong> (50/50 réel).
                  </p>
                  <p className="text-[11px] font-mono text-ws-mist bg-black/25 rounded-lg p-3">
                    Ex. 2 000 € encaissés Jibril : charges ACRE, reversement 50 % à Matis, charges Matis sur reversement →
                    nets proches.
                  </p>
                </div>
              </div>
              <p className="text-xs text-ws-mist mt-4">
                Les pourcentages exacts peuvent être ajustés avec votre comptable ; l’objectif documentaire reste la{' '}
                <strong className="text-ws-paper">transparence et l’équité sur le net</strong>.
              </p>
            </Section>

            <Section id="argument-suivi" title="Argument commercial — suivi mensuel" icon={Handshake}>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-red-500/20 bg-red-950/10 p-4">
                  <p className="font-mono text-[10px] uppercase text-ws-bear mb-2">Ne pas dire</p>
                  <p className="text-sm text-ws-ink">« Une option supplémentaire »</p>
                </div>
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/10 p-4">
                  <p className="font-mono text-[10px] uppercase text-emerald-300/90 mb-2">Dire plutôt</p>
                  <p className="text-sm text-ws-paper">
                    « Une sécurité et un accompagnement — on ne vous laisse pas seul avec votre site : on travaille dans
                    le temps pour qu’il continue à performer. »
                  </p>
                </div>
              </div>
              <div className="mt-6 rounded-xl border border-ws-line/50 p-4 text-xs text-ws-mist font-mono">
                <strong className="text-ws-cream">Objectifs long terme :</strong> signer sur les 3 niveaux d’offre ·
                systématiser le suivi mensuel · fidéliser · sécuriser un flux de revenus récurrents prévisibles.
              </div>
            </Section>

            <footer className="pt-8 border-t border-ws-line/50 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ws-mist">
                MAPA Développement · Guide intégré CRM · 2026 v1.0
              </p>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
