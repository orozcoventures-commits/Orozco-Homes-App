import { useState } from 'react';
import { ProjectProvider, useProject } from './context/ProjectContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabaseConfigError } from './lib/supabase';
import ErrorBoundary from './components/ErrorBoundary';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import ProjectSelector from './pages/ProjectSelector';
import ProjectDetail from './pages/ProjectDetail';
import ClientPortal from './pages/ClientPortal';
import PhotoLog from './pages/PhotoLog';
import Approvals from './pages/Approvals';
import MessageCenter from './pages/MessageCenter';
import WeeklyUpdates from './pages/WeeklyUpdates';
import AdminCreateProject from './pages/AdminCreateProject';
import ManageClients from './pages/ManageClients';
import PinClientPortal from './pages/PinClientPortal';
import NewHomeBudget from './pages/NewHomeBudget';
import RemodelBudget from './pages/RemodelBudget';
import ScheduleCalendar from './pages/ScheduleCalendar';
import './index.css';

// Shown when VITE_SUPABASE_* env vars are missing in Netlify
function EnvErrorScreen() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: '#F5F4F0' }}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-8"
        style={{ backgroundColor: '#fff', border: '1.5px solid #FECACA', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: '#FEF2F2' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#DC2626' }}>Configuration Error</p>
            <p className="text-base font-bold" style={{ color: '#002147' }}>Missing environment variables</p>
          </div>
        </div>

        <p className="text-sm mb-5" style={{ color: '#374151' }}>{supabaseConfigError}</p>

        <div
          className="rounded-xl px-4 py-3 mb-6 text-xs font-mono space-y-1"
          style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', color: '#374151' }}
        >
          <p>VITE_SUPABASE_URL={import.meta.env.VITE_SUPABASE_URL || '(not set)'}</p>
          <p>VITE_SUPABASE_ANON_KEY={import.meta.env.VITE_SUPABASE_ANON_KEY ? '(set)' : '(not set)'}</p>
        </div>

        <ol className="text-sm space-y-2 mb-6" style={{ color: '#374151' }}>
          {[
            'Go to Netlify → your site → Site configuration → Environment variables',
            'Add VITE_SUPABASE_URL with your Supabase project URL',
            'Add VITE_SUPABASE_ANON_KEY with your Supabase anon/public key',
            'Trigger a new deploy (Deploys → Trigger deploy → Deploy site)',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                style={{ backgroundColor: '#002147', color: '#D4AF37' }}
              >
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        <button
          onClick={() => window.location.reload()}
          className="w-full py-3 rounded-xl text-sm font-bold"
          style={{ backgroundColor: '#002147', color: '#D4AF37' }}
        >
          Reload after fixing
        </button>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F4F0' }}>
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
          style={{ backgroundColor: '#D4AF37' }}
        >
          <span className="font-extrabold text-base" style={{ color: '#002147' }}>OH</span>
        </div>
        <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
          <path d="M12 2a10 10 0 0 1 10 10" />
        </svg>
      </div>
    </div>
  );
}

function AppContent() {
  const { state } = useProject();
  const { isAuthenticated, loading, isPinMode } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const page = state.activePage;

  if (loading) return <LoadingScreen />;
  if (isPinMode) return <PinClientPortal />;
  if (!isAuthenticated) return <Login />;

  const isMessages = page === 'messages';

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F4F0' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="md:ml-[260px] flex flex-col min-h-screen">
        {!isMessages && <Header onMenuToggle={() => setSidebarOpen((o) => !o)} />}
        {isMessages && (
          <div className="md:hidden">
            <Header onMenuToggle={() => setSidebarOpen((o) => !o)} />
          </div>
        )}

        <main className={`flex-1 ${isMessages ? 'flex flex-col' : ''}`}>
          {page === 'home'             && <ProjectSelector />}
          {page === 'project'          && <ProjectDetail />}
          {page === 'client-portal'    && <ClientPortal />}
          {page === 'photo-log'        && <PhotoLog />}
          {page === 'approvals'        && <Approvals />}
          {page === 'messages'         && <MessageCenter />}
          {page === 'weekly-updates'   && <WeeklyUpdates />}
          {page === 'create-project'   && <AdminCreateProject />}
          {page === 'manage-clients'   && <ManageClients />}
          {page === 'new-home-budget'  && <NewHomeBudget />}
          {page === 'remodel-budget'   && <RemodelBudget />}
          {page === 'schedule'         && <ScheduleCalendar />}
          {!['home','project','client-portal','photo-log','approvals','messages',
              'weekly-updates','create-project','manage-clients','new-home-budget',
              'remodel-budget','schedule'].includes(page) && (
            <div className="flex flex-col items-center justify-center py-32 px-6 text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                style={{ backgroundColor: '#FEF2F2' }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#DC2626' }}>Access Denied</p>
              <p className="text-xl font-bold mb-2" style={{ color: '#002147' }}>Page not found</p>
              <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
                This page does not exist or you do not have permission to view it.
              </p>
              <button
                onClick={() => window.location.replace('/')}
                className="px-6 py-2.5 rounded-xl text-sm font-bold"
                style={{ backgroundColor: '#002147', color: '#D4AF37' }}
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  // Surface missing env vars immediately instead of a blank screen
  if (supabaseConfigError) return <EnvErrorScreen />;

  return (
    <ErrorBoundary>
      <AuthProvider>
        <ProjectProvider>
          <AppContent />
        </ProjectProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
