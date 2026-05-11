import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { PROJECT_TYPES } from '../data/projectTypes';

const CATEGORY_CONFIG = [
  { id: 'bathroom',         label: 'Bathrooms',         icon: '🚿', color: '#3B82F6', bg: '#EFF6FF',  border: '#BFDBFE', items: PROJECT_TYPES.filter((p) => p.category === 'bathroom') },
  { id: 'kitchen',          label: 'Kitchens',           icon: '🍳', color: '#D97706', bg: '#FFFBEB',  border: '#FDE68A', items: PROJECT_TYPES.filter((p) => p.category === 'kitchen') },
  { id: 'addition',         label: 'Additions',          icon: '🏗️', color: '#10B981', bg: '#ECFDF5',  border: '#A7F3D0', items: PROJECT_TYPES.filter((p) => p.category === 'addition') },
  { id: 'portico',          label: 'Portico',            icon: '🏛️', color: '#6B7280', bg: '#F5F5F4',  border: '#D6D3D1', items: PROJECT_TYPES.filter((p) => p.category === 'portico') },
  { id: 'garage-conversion',label: 'Garage Conversion',  icon: '🏠', color: '#7C3AED', bg: '#F5F3FF',  border: '#DDD6FE', items: PROJECT_TYPES.filter((p) => p.category === 'garage-conversion') },
];

const SUPPLIERS = [
  { label: 'Ferguson',      logo: 'FG',  bg: '#003087' },
  { label: 'Home Depot',    logo: 'HD',  bg: '#F96302' },
  { label: 'Floor & Decor', logo: 'F&D', bg: '#1B5E20' },
  { label: "Lowe's",        logo: 'LW',  bg: '#004990' },
  { label: 'Wayfair Pro',   logo: 'WF',  bg: '#7B2D8B' },
  { label: 'MSI Surfaces',  logo: 'MSI', bg: '#8B1A1A' },
];

const STATUS_CFG = {
  'on-track':  { dot: '#10B981', text: 'On Track',       bg: '#ECFDF5', color: '#065F46' },
  'attention': { dot: '#F59E0B', text: 'Needs Attention', bg: '#FFFBEB', color: '#92400E' },
  'delayed':   { dot: '#EF4444', text: 'Delayed',         bg: '#FEF2F2', color: '#991B1B' },
};

const CATEGORY_LABELS = {
  bathroom:          'Bathroom',
  kitchen:           'Kitchen',
  addition:          'Addition',
  portico:           'Portico',
  'garage-conversion': 'Garage Conversion',
  'full-renovation': 'Full Renovation',
};

function DbProjectCard({ project, onClick }) {
  const update = project.weekly_updates?.[0];
  const sCfg   = STATUS_CFG[update?.status ?? 'on-track'];
  const clientName = project.managed_client?.full_name ?? project.client_profile?.full_name ?? 'Client';

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl p-5 flex flex-col gap-3 transition-all duration-150 focus:outline-none group"
      style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 2px 8px rgba(0,33,71,0.05)' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#D4AF37'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,33,71,0.10)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E8E6E1'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,33,71,0.05)'; }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate" style={{ color: '#002147' }}>{project.project_name}</p>
          <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
            {CATEGORY_LABELS[project.category] ?? project.label} · {clientName}
          </p>
        </div>
        <span
          className="text-xs px-2 py-1 rounded-full font-semibold shrink-0"
          style={{ backgroundColor: sCfg.bg, color: sCfg.color }}
        >
          {sCfg.text}
        </span>
      </div>

      {update && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#F3F2EE' }}>
            <div className="h-full rounded-full" style={{ width: `${update.progress_percent}%`, backgroundColor: '#D4AF37' }} />
          </div>
          <span className="text-xs font-semibold shrink-0" style={{ color: '#6B7280' }}>{update.progress_percent}%</span>
        </div>
      )}

      <div className="flex items-center justify-between text-xs" style={{ color: '#9CA3AF' }}>
        <span>{update?.current_phase ?? 'No updates yet'}</span>
        <span className="text-yellow-600 font-semibold group-hover:translate-x-0.5 transition-transform">View →</span>
      </div>
    </button>
  );
}

export default function ProjectSelector() {
  const { dispatch } = useProject();
  const { isAdmin, isAuthenticated } = useAuth();

  const [dbProjects, setDbProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;
    async function fetchProjects() {
      const { data } = await supabase
        .from('projects')
        .select(`
          id, project_name, label, category, created_at,
          managed_client:clients(full_name, email),
          client_profile:profiles(full_name),
          weekly_updates(status, progress_percent, current_phase, updated_at)
        `)
        .order('created_at', { ascending: false });

      // Keep only the latest weekly_update per project
      const enriched = (data ?? []).map((p) => ({
        ...p,
        weekly_updates: p.weekly_updates
          ? [...p.weekly_updates].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 1)
          : [],
      }));
      setDbProjects(enriched);
      setLoadingProjects(false);
    }
    fetchProjects();
  }, [isAuthenticated]);

  function openDbProject(project) {
    dispatch({ type: 'SET_DB_PROJECT', project });
  }

  function navigateMaterial(project) {
    dispatch({ type: 'SET_PROJECT', project });
  }

  // ── Client view: only show their projects ─────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-8">
          <p className="text-xs font-bold tracking-[0.18em] uppercase mb-1" style={{ color: '#D4AF37' }}>Your Projects</p>
          <h2 className="text-2xl font-bold" style={{ color: '#002147' }}>Welcome back</h2>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>Select a project to view progress, photos, and change orders.</p>
        </div>

        {loadingProjects ? (
          <div className="flex items-center gap-3 py-16 justify-center">
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.2" /><path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
            <span className="text-sm" style={{ color: '#9CA3AF' }}>Loading your projects…</span>
          </div>
        ) : dbProjects.length === 0 ? (
          <div className="text-center py-16 rounded-2xl" style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: '#374151' }}>No projects yet</p>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>Your contractor will assign a project to your account.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {dbProjects.map((p) => <DbProjectCard key={p.id} project={p} onClick={() => openDbProject(p)} />)}
          </div>
        )}
      </div>
    );
  }

  // ── Admin view: active projects + material catalog ─────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {/* Active client projects */}
      <div className="mb-14">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] uppercase mb-1" style={{ color: '#D4AF37' }}>Active Client Projects</p>
            <h2 className="text-2xl font-bold" style={{ color: '#002147' }}>Project Dashboard</h2>
          </div>
          <button
            onClick={() => dispatch({ type: 'SET_PAGE', page: 'create-project' })}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-150"
            style={{ backgroundColor: '#002147', color: '#D4AF37' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#003166'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#002147'; }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            New Project
          </button>
        </div>

        {loadingProjects ? (
          <div className="flex items-center gap-3 py-10 justify-center">
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.2" /><path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
            <span className="text-sm" style={{ color: '#9CA3AF' }}>Loading projects…</span>
          </div>
        ) : dbProjects.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ backgroundColor: '#fff', border: '1.5px dashed #E8E6E1' }}
          >
            <p className="text-sm font-semibold mb-1" style={{ color: '#374151' }}>No client projects yet</p>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>Go to <strong>Manage Clients</strong> to add a client, then <strong>Create New Project</strong> to assign one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {dbProjects.map((p) => <DbProjectCard key={p.id} project={p} onClick={() => openDbProject(p)} />)}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px mb-12" style={{ backgroundColor: '#E8E6E1' }} />

      {/* Material catalog */}
      <div>
        <div className="text-center mb-10">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-2" style={{ color: '#D4AF37' }}>Material Catalog</p>
          <h3 className="text-2xl font-bold" style={{ color: '#002147' }}>Browse Materials by Project Type</h3>
          <p className="text-sm mt-2 max-w-lg mx-auto" style={{ color: '#4A4A4A' }}>
            Browse curated materials from top suppliers and build selection lists for your clients.
          </p>
          <div className="flex justify-center mt-4">
            <div className="h-px w-16 rounded-full" style={{ backgroundColor: '#D4AF37' }} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
          {CATEGORY_CONFIG.map((cat) => (
            <div key={cat.id} className="rounded-2xl p-6 flex flex-col gap-4"
              style={{ backgroundColor: cat.bg, border: `1.5px solid ${cat.border}`, boxShadow: '0 2px 8px rgba(0,33,71,0.05)' }}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shadow-sm" style={{ backgroundColor: 'rgba(0,33,71,0.06)' }}>
                  {cat.icon}
                </div>
                <h3 className="font-bold text-base" style={{ color: '#002147' }}>{cat.label}</h3>
              </div>
              <div className="flex flex-col gap-1.5">
                {cat.items.map((project) => (
                  <button key={project.id} onClick={() => navigateMaterial(project)}
                    className="flex items-center justify-between px-4 py-2.5 rounded-xl text-left group transition-all duration-150 focus:outline-none"
                    style={{ backgroundColor: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,33,71,0.08)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#D4AF37'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,33,71,0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = 'rgba(0,33,71,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#002147' }}>{project.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{project.subtitle}</p>
                    </div>
                    <span className="text-base transition-transform duration-150 group-hover:translate-x-1" style={{ color: '#D4AF37' }}>→</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Supplier strip */}
        <div className="pt-8" style={{ borderTop: '1px solid #E5E3DF' }}>
          <p className="text-center text-xs font-semibold tracking-[0.2em] uppercase mb-6" style={{ color: '#002147', opacity: 0.5 }}>
            Materials sourced from
          </p>
          <div className="flex flex-wrap justify-center gap-5">
            {SUPPLIERS.map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <span className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm" style={{ backgroundColor: s.bg }}>{s.logo}</span>
                <span className="text-sm font-medium" style={{ color: '#4A4A4A' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
