import {
  LayoutDashboard,
  Users,
  Contact2,
  FolderKanban,
  GitBranch,
  ScrollText,
  BellRing,
  CheckSquare,
  CalendarDays,
  CalendarHeart,
  BarChart3,
  FileText,
  BookOpen,
  Inbox,
  LineChart,
  KeyRound,
  PhoneCall,
  type LucideIcon,
} from 'lucide-react';
import { Page } from './types';

export interface NavItemConfig {
  id: Page;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

export const MAIN_NAV_ITEMS: NavItemConfig[] = [
  { id: 'dashboard', label: 'Accueil', shortLabel: 'Accueil', icon: LayoutDashboard },
  { id: 'clients', label: 'Clients', shortLabel: 'Clients', icon: Users },
  { id: 'calls', label: 'Appels', shortLabel: 'Appels', icon: PhoneCall },
  { id: 'contacts', label: 'Contacts', shortLabel: 'Contacts', icon: Contact2 },
  { id: 'projects', label: 'Projets', shortLabel: 'Projets', icon: FolderKanban },
  { id: 'pipeline', label: 'Pipeline', shortLabel: 'Pipeline', icon: GitBranch },
  { id: 'quotes', label: 'Devis', shortLabel: 'Devis', icon: ScrollText },
  { id: 'relances', label: 'Relances', shortLabel: 'Relances', icon: BellRing },
  { id: 'tasks', label: 'Tâches', shortLabel: 'Tâches', icon: CheckSquare },
  { id: 'calendar', label: 'Calendrier', shortLabel: 'Agenda', icon: CalendarDays },
  { id: 'calendar-matis', label: 'Calendrier Matis', shortLabel: 'Matis', icon: CalendarHeart },
  { id: 'analytics', label: 'Analytique', shortLabel: 'Stats', icon: BarChart3 },
  { id: 'invoices', label: 'Facturation', shortLabel: 'Factures', icon: FileText },
  { id: 'playbook', label: 'Guide MAPA', shortLabel: 'Guide', icon: BookOpen },
  { id: 'demandes', label: 'Demandes', shortLabel: 'Demandes', icon: Inbox },
  { id: 'analyse', label: 'Analyse site', shortLabel: 'Analyse', icon: LineChart },
  { id: 'identifiants', label: 'Identifiants', shortLabel: 'Identifiants', icon: KeyRound },
];
