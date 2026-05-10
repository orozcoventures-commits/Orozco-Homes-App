import { ProjectProvider, useProject } from './context/ProjectContext';
import Header from './components/Header';
import ProjectSelector from './pages/ProjectSelector';
import ProjectDetail from './pages/ProjectDetail';
import './index.css';

function AppContent() {
  const { state } = useProject();
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      {state.activeProject ? <ProjectDetail /> : <ProjectSelector />}
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
