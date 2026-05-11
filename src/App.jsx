import { useState } from 'react';
import { ProjectProvider, useProject } from './context/ProjectContext';
import { AuthProvider, useAuth } from './context/AuthContext';
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
import './index.css';

// Full-screen spinner shown while the Supabase session is rehydrating
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
  const { isAuthenticated, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Wait for Supabase to restore the session before rendering
  if (loading) return <LoadingScreen />;

  // Gate: every page requires a valid session
  if (!isAuthenticated) return <Login />;

  const page       = state.activePage;
  const isMessages = page === 'messages';

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F4F0' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="md:ml-[260px] flex flex-col min-h-screen">
        {/* Messages page has its own header chrome on desktop */}
        {!isMessages && <Header onMenuToggle={() => setSidebarOpen((o) => !o)} />}
        {isMessages  && (
          <div className="md:hidden">
            <Header onMenuToggle={() => setSidebarOpen((o) => !o)} />
          </div>
        )}

        <main className={`flex-1 ${isMessages ? 'flex flex-col' : ''}`}>
          {page === 'home'           && <ProjectSelector />}
          {page === 'project'        && <ProjectDetail />}
          {page === 'client-portal'  && <ClientPortal />}
          {page === 'photo-log'      && <PhotoLog />}
          {page === 'approvals'      && <Approvals />}
          {page === 'messages'       && <MessageCenter />}
          {page === 'weekly-updates' && <WeeklyUpdates />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ProjectProvider>
        <AppContent />
      </ProjectProvider>
    </AuthProvider>
  );
}
