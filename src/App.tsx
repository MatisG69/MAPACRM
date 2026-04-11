import { useState, useCallback, useMemo } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { MobileTabBar } from './components/layout/MobileTabBar';
import { Dashboard } from './pages/Dashboard';
import { ClientsPage } from './pages/ClientsPage';
import { ClientDetailPage } from './pages/ClientDetailPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { TasksPage } from './pages/TasksPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { CalendarPage } from './pages/CalendarPage';
import { useClients } from './hooks/useClients';
import { useProjects } from './hooks/useProjects';
import { useTasks } from './hooks/useTasks';
import { useInteractions } from './hooks/useInteractions';
import { useInvoices } from './hooks/useInvoices';
import { useCalendarEvents } from './hooks/useCalendarEvents';
import { Page } from './lib/types';
import { isSupabaseEnabled } from './lib/supabase';
import { Loader2 } from 'lucide-react';

function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [clientDetailId, setClientDetailId] = useState<string | null>(null);
  const [projectDetailId, setProjectDetailId] = useState<string | null>(null);

  const clientsHook = useClients();
  const projectsHook = useProjects();
  const tasksHook = useTasks();
  const interactionsHook = useInteractions();
  const invoicesHook = useInvoices();
  const calendarHook = useCalendarEvents();

  const navigate = useCallback((p: Page, id?: string) => {
    if (p === 'client-detail' && id) {
      setClientDetailId(id);
      setProjectDetailId(null);
      setPage('client-detail');
      return;
    }
    if (p === 'project-detail' && id) {
      setProjectDetailId(id);
      setClientDetailId(null);
      setPage('project-detail');
      return;
    }
    if (p !== 'client-detail') setClientDetailId(null);
    if (p !== 'project-detail') setProjectDetailId(null);
    setPage(p);
  }, []);

  const clientForDetail = useMemo(
    () => clientsHook.clients.find((c) => c.id === clientDetailId),
    [clientsHook.clients, clientDetailId]
  );

  const projectForDetail = useMemo(
    () => projectsHook.projects.find((p) => p.id === projectDetailId),
    [projectsHook.projects, projectDetailId]
  );

  const projectsForClient = useMemo(
    () => projectsHook.projects.filter((p) => p.client_id === clientDetailId),
    [projectsHook.projects, clientDetailId]
  );

  const interactionsForClient = useMemo(
    () => interactionsHook.interactions.filter((i) => i.client_id === clientDetailId),
    [interactionsHook.interactions, clientDetailId]
  );

  const invoicesForClient = useMemo(
    () => invoicesHook.invoices.filter((i) => i.client_id === clientDetailId),
    [invoicesHook.invoices, clientDetailId]
  );

  const loading =
    clientsHook.loading ||
    projectsHook.loading ||
    tasksHook.loading ||
    interactionsHook.loading ||
    invoicesHook.loading ||
    calendarHook.loading;

  const dataError =
    clientsHook.error ||
    projectsHook.error ||
    tasksHook.error ||
    interactionsHook.error ||
    invoicesHook.error ||
    calendarHook.error;

  const localMode = !isSupabaseEnabled();

  return (
    <div className="min-h-screen bg-ws-mystic font-sans text-ws-paper">
      <Sidebar currentPage={page} onNavigate={(p) => navigate(p)} />
      <MobileTabBar currentPage={page} onNavigate={(p) => navigate(p)} />

      {localMode && (
        <div className="fixed top-0 left-0 right-0 md:left-[calc(1rem+16rem+1rem)] z-40 bg-ws-accent-dim border-b border-ws-accent/25 text-ws-paper text-[10px] sm:text-[11px] font-mono px-3 py-2 sm:px-4 text-center tracking-wide leading-snug pt-[max(0.5rem,env(safe-area-inset-top))]">
          <span className="text-ws-accent-soft font-bold uppercase mr-2">Local</span>
          Données sur ce navigateur uniquement · Cloud :{' '}
          <code className="text-ws-accent-soft">VITE_SUPABASE_URL</code> +{' '}
          <code className="text-ws-accent-soft">VITE_SUPABASE_ANON_KEY</code>
        </div>
      )}

      <main
        className={`ml-0 md:ml-[calc(1rem+16rem+1rem)] min-h-[100dvh] min-h-screen bg-ws-mystic bg-ws-vignette bg-ws-noise pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0 ${
          localMode
            ? 'pt-[calc(2.75rem+env(safe-area-inset-top))] md:pt-9'
            : 'max-md:pt-[env(safe-area-inset-top)]'
        }`}
      >
        {dataError && isSupabaseEnabled() && (
          <div className="mx-8 mt-4 rounded-lg bg-ws-bear-dim text-ws-bear text-sm px-4 py-3 border border-ws-bear/30 font-mono">
            Erreur base de données : {dataError}. Vérifiez les tables Supabase ou le mode local sans variables
            d’environnement.
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-ws-ink">
            <Loader2 className="animate-spin text-ws-accent" size={28} />
            <p className="text-sm font-mono uppercase tracking-[0.2em]">Chargement du desk…</p>
          </div>
        ) : (
          <>
            {page === 'dashboard' && (
              <Dashboard
                clients={clientsHook.clients}
                projects={projectsHook.projects}
                tasks={tasksHook.tasks}
                interactions={interactionsHook.interactions}
                invoices={invoicesHook.invoices}
                onNavigate={navigate}
              />
            )}
            {page === 'clients' && (
              <ClientsPage
                clients={clientsHook.clients}
                onCreate={clientsHook.createClient}
                onUpdate={clientsHook.updateClient}
                onDelete={clientsHook.deleteClient}
                onSelect={(id) => navigate('client-detail', id)}
              />
            )}
            {page === 'client-detail' && (
              <ClientDetailPage
                client={clientForDetail}
                projects={projectsForClient}
                interactions={interactionsForClient}
                invoices={invoicesForClient}
                allClients={clientsHook.clients}
                onBack={() => navigate('clients')}
                onNavigate={navigate}
                onUpdateClient={clientsHook.updateClient}
                onDeleteClient={clientsHook.deleteClient}
                onCreateInteraction={interactionsHook.createInteraction}
                onDeleteInteraction={interactionsHook.deleteInteraction}
                onCreateProject={projectsHook.createProject}
              />
            )}
            {page === 'projects' && (
              <ProjectsPage
                projects={projectsHook.projects}
                clients={clientsHook.clients}
                onCreate={projectsHook.createProject}
                onUpdate={projectsHook.updateProject}
                onDelete={projectsHook.deleteProject}
                onSelect={(id) => navigate('project-detail', id)}
              />
            )}
            {page === 'project-detail' && (
              <ProjectDetailPage
                project={projectForDetail}
                clients={clientsHook.clients}
                tasks={tasksHook.tasks}
                onBack={() => navigate('projects')}
                onNavigate={navigate}
                onUpdateProject={projectsHook.updateProject}
                onDeleteProject={projectsHook.deleteProject}
                onCreateTask={tasksHook.createTask}
              />
            )}
            {page === 'tasks' && (
              <TasksPage
                tasks={tasksHook.tasks}
                projects={projectsHook.projects}
                onCreate={tasksHook.createTask}
                onUpdate={tasksHook.updateTask}
                onDelete={tasksHook.deleteTask}
                onNavigate={navigate}
              />
            )}
            {page === 'calendar' && (
              <CalendarPage
                events={calendarHook.events}
                clients={clientsHook.clients}
                projects={projectsHook.projects}
                onCreate={calendarHook.createEvent}
                onUpdate={calendarHook.updateEvent}
                onDelete={calendarHook.deleteEvent}
              />
            )}
            {page === 'analytics' && (
              <AnalyticsPage
                clients={clientsHook.clients}
                projects={projectsHook.projects}
                invoices={invoicesHook.invoices}
              />
            )}
            {page === 'invoices' && (
              <InvoicesPage
                invoices={invoicesHook.invoices}
                clients={clientsHook.clients}
                projects={projectsHook.projects}
                onCreate={invoicesHook.createInvoice}
                onUpdate={invoicesHook.updateInvoice}
                onDelete={invoicesHook.deleteInvoice}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
