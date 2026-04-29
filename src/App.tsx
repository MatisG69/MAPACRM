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
import { CalendarMatisPage } from './pages/CalendarMatisPage';
import { CalendarMatisLockGate } from './components/calendar-matis/CalendarMatisLockGate';
import { CommercialPlaybookPage } from './pages/CommercialPlaybookPage';
import { AnalyseSitePage } from './pages/AnalyseSitePage';
import { PipelinePage } from './pages/PipelinePage';
import { QuotesPage } from './pages/QuotesPage';
import { RelancesPage } from './pages/RelancesPage';
import { ContactsPage } from './pages/ContactsPage';
import { DemandesPage } from './pages/DemandesPage';
import { IdentifiantsPage } from './pages/IdentifiantsPage';
import { CallsPage } from './pages/CallsPage';
import { EmailsPage } from './pages/EmailsPage';
import { useClients } from './hooks/useClients';
import { useServiceRequests } from './hooks/useServiceRequests';
import { useProjects } from './hooks/useProjects';
import { useTasks } from './hooks/useTasks';
import { useInteractions } from './hooks/useInteractions';
import { useInvoices } from './hooks/useInvoices';
import { useCalendarEvents } from './hooks/useCalendarEvents';
import { useOpportunities } from './hooks/useOpportunities';
import { useQuotes } from './hooks/useQuotes';
import { useChecklistItems } from './hooks/useChecklistItems';
import { Page } from './lib/types';
import { isSupabaseEnabled } from './lib/supabase';
import { seedChecklistForProject } from './lib/checklistSeed';
import {
  pipelineAmountAsBudget,
  resolveProjectIdForPipelineBudget,
} from './lib/opportunityBudgetSync';
import { Loader2 } from 'lucide-react';

function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [clientDetailId, setClientDetailId] = useState<string | null>(null);
  const [projectDetailId, setProjectDetailId] = useState<string | null>(null);

  const clientsHook = useClients();
  const checklistHook = useChecklistItems();
  const projectsHook = useProjects(undefined, {
    afterCreate: async (p) => {
      await seedChecklistForProject(p.id, p.type ?? null);
      await checklistHook.refetch();
    },
  });
  const tasksHook = useTasks(undefined, {
    onProjectProgressSync: () => projectsHook.refreshProjectsQuietly(),
  });
  const interactionsHook = useInteractions();
  const invoicesHook = useInvoices();
  const calendarHook = useCalendarEvents();
  const opportunitiesHook = useOpportunities();
  const quotesHook = useQuotes();
  const demandesHook = useServiceRequests();

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

  const clientInteractionsForProject = useMemo(() => {
    const cid = projectForDetail?.client_id;
    if (!cid) return [];
    return interactionsHook.interactions.filter((i) => i.client_id === cid);
  }, [projectForDetail?.client_id, interactionsHook.interactions]);

  const projectInvoicesDetail = useMemo(
    () =>
      projectForDetail
        ? invoicesHook.invoices.filter((i) => i.project_id === projectForDetail.id)
        : [],
    [projectForDetail, invoicesHook.invoices]
  );

  const projectQuotesDetail = useMemo(
    () =>
      projectForDetail ? quotesHook.quotes.filter((q) => q.project_id === projectForDetail.id) : [],
    [projectForDetail, quotesHook.quotes]
  );

  const projectCalendarDetail = useMemo(
    () =>
      projectForDetail
        ? calendarHook.events.filter((e) => e.project_id === projectForDetail.id)
        : [],
    [projectForDetail, calendarHook.events]
  );

  const checklistForProjectDetail = useMemo(
    () =>
      projectForDetail
        ? checklistHook.items.filter((c) => c.project_id === projectForDetail.id)
        : [],
    [projectForDetail, checklistHook.items]
  );

  const loading =
    clientsHook.loading ||
    projectsHook.loading ||
    tasksHook.loading ||
    interactionsHook.loading ||
    invoicesHook.loading ||
    calendarHook.loading ||
    opportunitiesHook.loading ||
    quotesHook.loading ||
    checklistHook.loading;

  const dataError =
    clientsHook.error ||
    projectsHook.error ||
    tasksHook.error ||
    interactionsHook.error ||
    invoicesHook.error ||
    calendarHook.error ||
    opportunitiesHook.error ||
    quotesHook.error ||
    checklistHook.error;

  const localMode = !isSupabaseEnabled();

  return (
    <div className="min-h-[100dvh] min-h-screen font-sans text-ws-paper">
      <Sidebar currentPage={page} onNavigate={(p) => navigate(p)} badges={{ demandes: demandesHook.newCount }} />
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
        className={`ml-0 md:ml-[calc(1rem+16rem+1rem)] md:mr-3 md:mt-3 md:mb-3 w-full min-w-0 max-md:max-w-[100vw] md:w-[calc(100%-18rem-0.75rem)] min-h-[100dvh] min-h-screen
          md:min-h-[calc(100dvh-1.5rem)]
          max-md:overflow-x-hidden
          bg-ws-mystic bg-ws-vignette bg-ws-noise
          md:rounded-2xl md:border md:border-white/[0.07] md:shadow-[0_25px_80px_-12px_rgba(0,0,0,0.85)]
          pb-[calc(6.25rem+env(safe-area-inset-bottom))] md:pb-0
          ${
            localMode
              ? 'pt-[calc(2.75rem+env(safe-area-inset-top))] md:pt-9'
              : 'pt-[max(0.25rem,env(safe-area-inset-top))] md:pt-0'
          }`}
      >
        {dataError && isSupabaseEnabled() && (
          <div className="mx-3 md:mx-8 mt-4 rounded-lg bg-ws-bear-dim text-ws-bear text-sm px-4 py-3 border border-ws-bear/30 font-mono">
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
                onImportSuccess={clientsHook.refetch}
              />
            )}
            {page === 'contacts' && (
              <ContactsPage
                clients={clientsHook.clients}
                interactions={interactionsHook.interactions}
                projects={projectsHook.projects}
                onUpdateClient={clientsHook.updateClient}
                onNavigate={navigate}
              />
            )}
            {page === 'client-detail' && (
              <ClientDetailPage
                client={clientForDetail}
                projects={projectsForClient}
                interactions={interactionsForClient}
                invoices={invoicesForClient}
                quotes={quotesHook.quotes}
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
                tasks={tasksHook.tasks}
                onCreate={projectsHook.createProject}
                onUpdate={projectsHook.updateProject}
                onUpdateClient={clientsHook.updateClient}
                onDelete={projectsHook.deleteProject}
                onSelect={(id) => navigate('project-detail', id)}
              />
            )}
            {page === 'project-detail' && (
              <ProjectDetailPage
                project={projectForDetail}
                clients={clientsHook.clients}
                tasks={tasksHook.tasks}
                clientInteractions={clientInteractionsForProject}
                projectInvoices={projectInvoicesDetail}
                projectQuotes={projectQuotesDetail}
                projectCalendarEvents={projectCalendarDetail}
                checklistItems={checklistForProjectDetail}
                onToggleChecklistItem={async (id, done) => {
                  await checklistHook.updateItem(id, { done });
                }}
                onBack={() => navigate('projects')}
                onNavigate={navigate}
                onUpdateProject={projectsHook.updateProject}
                onUpdateClient={clientsHook.updateClient}
                onDeleteProject={projectsHook.deleteProject}
                onCreateTask={tasksHook.createTask}
              />
            )}
            {page === 'pipeline' && (
              <PipelinePage
                opportunities={opportunitiesHook.opportunities}
                clients={clientsHook.clients}
                projects={projectsHook.projects}
                onCreate={async (data) => {
                  const o = await opportunitiesHook.createOpportunity(data);
                  const amt = pipelineAmountAsBudget(o.estimated_amount);
                  let targetId =
                    o.project_id || resolveProjectIdForPipelineBudget(o, projectsHook.projects);
                  if (amt != null && targetId) {
                    await projectsHook.updateProject(targetId, { budget: amt });
                  }
                  if (!o.project_id && targetId) {
                    await opportunitiesHook.updateOpportunity(o.id, { project_id: targetId });
                  }
                  return o;
                }}
                onUpdate={async (id, data) => {
                  const o = await opportunitiesHook.updateOpportunity(id, data);
                  const amt = pipelineAmountAsBudget(o.estimated_amount);
                  let targetId = o.project_id;
                  if (
                    !targetId &&
                    !('project_id' in data && data.project_id === null)
                  ) {
                    targetId = resolveProjectIdForPipelineBudget(o, projectsHook.projects);
                  }
                  if (amt != null && targetId) {
                    await projectsHook.updateProject(targetId, { budget: amt });
                  }
                  if (!o.project_id && targetId) {
                    await opportunitiesHook.updateOpportunity(o.id, { project_id: targetId });
                  }
                  return o;
                }}
                onDelete={opportunitiesHook.deleteOpportunity}
              />
            )}
            {page === 'quotes' && (
              <QuotesPage
                quotes={quotesHook.quotes}
                clients={clientsHook.clients}
                projects={projectsHook.projects}
                opportunities={opportunitiesHook.opportunities}
                onCreate={quotesHook.createQuote}
                onUpdate={quotesHook.updateQuote}
                onDelete={quotesHook.deleteQuote}
                onCreateInvoice={invoicesHook.createInvoice}
              />
            )}
            {page === 'relances' && (
              <RelancesPage
                clients={clientsHook.clients}
                interactions={interactionsHook.interactions}
                projects={projectsHook.projects}
                tasks={tasksHook.tasks}
                invoices={invoicesHook.invoices}
                quotes={quotesHook.quotes}
                onNavigate={navigate}
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
                tasks={tasksHook.tasks}
                interactions={interactionsHook.interactions}
                invoices={invoicesHook.invoices}
                onNavigate={navigate}
                onCreate={calendarHook.createEvent}
                onUpdate={calendarHook.updateEvent}
                onDelete={calendarHook.deleteEvent}
              />
            )}
            {page === 'calendar-matis' && (
              <CalendarMatisLockGate>
                <CalendarMatisPage />
              </CalendarMatisLockGate>
            )}
            {page === 'analytics' && (
              <AnalyticsPage
                clients={clientsHook.clients}
                projects={projectsHook.projects}
                invoices={invoicesHook.invoices}
                opportunities={opportunitiesHook.opportunities}
                quotes={quotesHook.quotes}
              />
            )}
            {page === 'invoices' && (
              <InvoicesPage
                invoices={invoicesHook.invoices}
                clients={clientsHook.clients}
                projects={projectsHook.projects}
                quotes={quotesHook.quotes}
                onCreate={invoicesHook.createInvoice}
                onUpdate={invoicesHook.updateInvoice}
                onDelete={invoicesHook.deleteInvoice}
              />
            )}
            {page === 'playbook' && <CommercialPlaybookPage />}
            {page === 'analyse' && <AnalyseSitePage />}
            {page === 'demandes' && (
              <DemandesPage
                requests={demandesHook.requests}
                onUpdateStatus={demandesHook.updateStatus}
                onDelete={demandesHook.deleteRequest}
                onConvertToClient={async (clientData, requestId) => {
                  await clientsHook.createClient(clientData);
                  await demandesHook.updateStatus(requestId, 'converted');
                }}
              />
            )}
            {page === 'identifiants' && <IdentifiantsPage />}
            {page === 'calls' && <CallsPage clients={clientsHook.clients} />}
            {page === 'emails' && <EmailsPage onNavigate={navigate} />}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
