import { useState } from 'react';
import { ProjectProvider, useProject } from './context/ProjectContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ProjectSelector from './pages/ProjectSelector';
import ProjectDetail from './pages/ProjectDetail';
import './index.css';

function AppContent() {
  const { state } = useProject();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F4F0' }}>
      {/* Fixed left sidebar (desktop permanent, mobile overlay) */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content — offset by sidebar width on md+ */}
      <div className="md:ml-[260px] flex flex-col min-h-screen">
        <Header onMenuToggle={() => setSidebarOpen((o) => !o)} />
        <main className="flex-1">
          {state.activeProject ? <ProjectDetail /> : <ProjectSelector />}
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
