import { useState } from 'react';
import { ProjectProvider, useProject } from './context/ProjectContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ProjectSelector from './pages/ProjectSelector';
import ProjectDetail from './pages/ProjectDetail';
import ClientPortal from './pages/ClientPortal';
import PhotoLog from './pages/PhotoLog';
import Approvals from './pages/Approvals';
import MessageCenter from './pages/MessageCenter';
import WeeklyUpdates from './pages/WeeklyUpdates';
import Login from './pages/Login';
import './index.css';

function AppContent() {
  const { state } = useProject();
  const { isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const page = state.activePage;
  const isMessages = page === 'messages';

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F4F0' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="md:ml-[260px] flex flex-col min-h-screen">
        {/* Header: hidden on desktop for messages (has its own chrome), visible on mobile always */}
        {!isMessages && <Header onMenuToggle={() => setSidebarOpen((o) => !o)} />}
        {isMessages  && <div className="md:hidden"><Header onMenuToggle={() => setSidebarOpen((o) => !o)} /></div>}

        <main className={`flex-1 ${isMessages ? 'flex flex-col' : ''}`}>
          {page === 'home'          && <ProjectSelector />}
          {page === 'project'       && <ProjectDetail />}
          {page === 'client-portal' && <ClientPortal />}
          {page === 'photo-log'     && <PhotoLog />}
          {page === 'approvals'     && <Approvals />}
          {page === 'messages'      && <MessageCenter />}

          {/* Protected: weekly updates requires authentication */}
          {page === 'weekly-updates' && ( isAuthenticated ? <WeeklyUpdates /> : <Login /> )}
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
