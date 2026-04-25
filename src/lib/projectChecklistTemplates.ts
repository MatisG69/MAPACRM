import type { ProjectType } from './types';

/** Checklists standard MAPA par type de prestation (créées à la création du projet). */
export function getChecklistTemplate(type: ProjectType | null | undefined): string[] {
  switch (type) {
    case 'website':
      return [
        'Récupération logo & charte',
        'Récupération textes',
        'Récupération photos',
        'Choix nom de domaine',
        'Maquette validée',
        'Intégration',
        'Contrôle responsive',
        'SEO de base',
        'Mise en ligne',
        'Formation client',
        'Demande d’avis',
      ];
    case 'ecommerce':
      return [
        'Logo & identité',
        'Fiche produits / photos',
        'Moyens de paiement',
        'Livraison / retrait',
        'CGV & mentions légales',
        'Maquette boutique validée',
        'Intégration catalogue',
        'Tests commande',
        'SEO catégories',
        'Mise en ligne',
        'Formation back-office',
      ];
    case 'webapp':
      return [
        'Spécifications fonctionnelles validées',
        'Maquettes / UX validées',
        'Environnements (dev / prod)',
        'Authentification & rôles',
        'API / données',
        'Tests utilisateur',
        'Documentation',
        'Mise en production',
        'Formation équipe',
      ];
    case 'redesign':
      return [
        'Audit site actuel',
        'Arborescence & contenus',
        'Maquettes refonte',
        'Validation client',
        'Intégration',
        '301 / redirections',
        'Recette',
        'Bascule DNS',
        'Suivi post-lancement',
      ];
    case 'maintenance':
      return [
        'Accès hébergement / FTP',
        'Sauvegardes configurées',
        'Mises à jour CMS / deps',
        'Monitoring uptime',
        'Point mensuel client',
      ];
    case 'seo':
      return [
        'Audit technique',
        'Mots-clés & pages cibles',
        'Optimisation on-page',
        'Fichiers sitemap / robots',
        'Suivi positions (baseline)',
        'Rapport mensuel',
      ];
    case 'automation':
      return [
        'Audit des processus existants',
        'Cartographie des tâches à automatiser',
        'Conception du scénario / workflow',
        'Accès aux outils tiers (API, comptes)',
        'Développement & tests en environnement de recette',
        'Mise en production & monitoring',
        'Documentation & passation au client',
      ];
    default:
      return [
        'Brief client validé',
        'Livrables réceptionnés',
        'Livraison & recette',
        'Clôture projet',
      ];
  }
}
