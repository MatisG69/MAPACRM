import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CheckSquare,
  BarChart3,
  FileText,
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
  { id: 'tasks', label: 'Tâches', shortLabel: 'Tâches', icon: CheckSquare },
  { id: 'analytics', label: 'Analytique', shortLabel: 'Stats', icon: BarChart3 },
  { id: 'invoices', label: 'Facturation', shortLabel: 'Factures', icon: FileText },
];
