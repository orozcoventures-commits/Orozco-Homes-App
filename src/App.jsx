import { useState } from 'react';
import { ProjectProvider, useProject } from './context/ProjectContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ProjectSelector from './pages/ProjectSelector';
import ProjectDetail from './pages/ProjectDetail';
import ClientPortal from './pages/ClientPortal';
import PhotoLog from './pages/PhotoLog';
import Approvals from './pages/Approvals';
import MessageCenter from './pages/MessageCenter';
import './index.css';

function AppContent() {
  const { state } = useProject();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const page = state.activePage;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F4F0' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="md:ml-[260px] flex flex-col min-h-screen">
        {/* Hide header on messages page — it has its own chrome */}
        {page !== 'messages' && (
          <Header onMenuToggle={() => setSidebarOpen((o) => !o)} />
        )}
        {page === 'messages' && (
          <div className="md:hidden">
            <Header onMenuToggle={() => setSidebarOpen((o) => !o)} />
          </div>
        )}

        <main className={`flex-1 ${page === 'messages' ? 'flex flex-col' : ''}`}>
          {page === 'home'          && <ProjectSelector />}
          {page === 'project'       && <ProjectDetail />}
          {page === 'client-portal' && <ClientPortal />}
          {page === 'photo-log'     && <PhotoLog />}
          {page === 'approvals'     && <Approvals />}
          {page === 'messages'      && <MessageCenter />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ProjectProvider>
      <AppContent />
    </ProjectProvider>
  );
}
