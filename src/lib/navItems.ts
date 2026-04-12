import {
  LayoutDashboard,
  Users,
  FolderKanban,
  GitBranch,
  ScrollText,
  BellRing,
  CheckSquare,
  CalendarDays,
  BarChart3,
  FileText,
  BookOpen,
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
  { id: 'projects', label: 'Projets', shortLabel: 'Projets', icon: FolderKanban },
  { id: 'pipeline', label: 'Pipeline', shortLabel: 'Pipeline', icon: GitBranch },
  { id: 'quotes', label: 'Devis', shortLabel: 'Devis', icon: ScrollText },
  { id: 'relances', label: 'Relances', shortLabel: 'Relances', icon: BellRing },
  { id: 'tasks', label: 'Tâches', shortLabel: 'Tâches', icon: CheckSquare },
  { id: 'calendar', label: 'Calendrier', shortLabel: 'Agenda', icon: CalendarDays },
  { id: 'analytics', label: 'Analytique', shortLabel: 'Stats', icon: BarChart3 },
  { id: 'invoices', label: 'Facturation', shortLabel: 'Factures', icon: FileText },
  { id: 'playbook', label: 'Guide MAPA', shortLabel: 'Guide', icon: BookOpen },
];
