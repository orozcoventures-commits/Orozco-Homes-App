import { useProject } from '../context/ProjectContext';
import { PROJECT_TYPES } from '../data/projectTypes';

const CATEGORY_CONFIG = [
  {
    id: 'bathroom',
    label: 'Bathrooms',
    icon: '🚿',
    color: '#3B82F6',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    items: PROJECT_TYPES.filter((p) => p.category === 'bathroom'),
  },
  {
    id: 'kitchen',
    label: 'Kitchens',
    icon: '🍳',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
    items: PROJECT_TYPES.filter((p) => p.category === 'kitchen'),
  },
  {
    id: 'addition',
    label: 'Additions',
    icon: '🏗️',
    color: '#10B981',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    items: PROJECT_TYPES.filter((p) => p.category === 'addition'),
  },
  {
    id: 'portico',
    label: 'Portico',
    icon: '🏛️',
    color: '#6B7280',
    bg: '#F5F5F4',
    border: '#D6D3D1',
    items: PROJECT_TYPES.filter((p) => p.category === 'portico'),
  },
  {
    id: 'garage-conversion',
    label: 'Garage Conversion',
    icon: '🏠',
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    items: PROJECT_TYPES.filter((p) => p.category === 'garage-conversion'),
  },
];

const SUPPLIERS = [
  { label: 'Ferguson',      logo: 'FG',  bg: '#003087' },
  { label: 'Home Depot',    logo: 'HD',  bg: '#F96302' },
  { label: 'Floor & Decor', logo: 'F&D', bg: '#1B5E20' },
  { label: "Lowe's",        logo: 'LW',  bg: '#004990' },
  { label: 'Wayfair Pro',   logo: 'WF',  bg: '#7B2D8B' },
  { label: 'MSI Surfaces',  logo: 'MSI', bg: '#8B1A1A' },
];

export default function ProjectSelector() {
  const { dispatch } = useProject();

  function navigate(project) {
    dispatch({ type: 'SET_PROJECT', project });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="text-center mb-16">
        <p
          className="text-xs font-semibold tracking-[0.2em] uppercase mb-3"
          style={{ color: '#D4AF37' }}
        >
          Welcome to Your Remodel Planner
        </p>
        <h2
          className="text-3xl sm:text-4xl font-bold mb-4 tracking-wide"
          style={{ color: '#002147', letterSpacing: '0.02em' }}
        >
          What are we building today?
        </h2>
        <p className="text-base max-w-xl mx-auto leading-relaxed" style={{ color: '#4A4A4A' }}>
          Use the navigation menu above to choose your project type and start browsing
          curated materials from the best suppliers in the industry.
        </p>
        <div className="flex justify-center mt-6">
          <div className="h-px w-24 rounded-full" style={{ backgroundColor: '#D4AF37' }} />
        </div>
      </div>

      {/* ── Project category cards ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-20">
        {CATEGORY_CONFIG.map((cat) => (
          <div
            key={cat.id}
            className="rounded-2xl p-6 flex flex-col gap-4"
            style={{
              backgroundColor: cat.bg,
              border: `1.5px solid ${cat.border}`,
              boxShadow: '0 2px 8px rgba(0,33,71,0.05)',
            }}
          >
            {/* Category header */}
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shadow-sm"
                style={{ backgroundColor: 'rgba(0,33,71,0.06)' }}
              >
                {cat.icon}
              </div>
              <h3 className="font-bold text-base" style={{ color: '#002147', letterSpacing: '0.02em' }}>
                {cat.label}
              </h3>
            </div>

            {/* Sub-options */}
            <div className="flex flex-col gap-1.5">
              {cat.items.map((project) => (
                <button
                  key={project.id}
                  onClick={() => navigate(project)}
                  className="flex items-center justify-between px-4 py-2.5 rounded-xl text-left group transition-all duration-150 focus:outline-none"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.7)',
                    border: '1px solid rgba(0,33,71,0.08)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff';
                    e.currentTarget.style.borderColor = '#D4AF37';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,33,71,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.7)';
                    e.currentTarget.style.borderColor = 'rgba(0,33,71,0.08)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#002147' }}>{project.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{project.subtitle}</p>
                  </div>
                  <span
                    className="text-base transition-transform duration-150 group-hover:translate-x-1"
                    style={{ color: '#D4AF37' }}
                  >
                    →
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Supplier strip ────────────────────────────────────────────── */}
      <div className="pt-10" style={{ borderTop: '1px solid #E5E3DF' }}>
        <p
          className="text-center text-xs font-semibold tracking-[0.2em] uppercase mb-6"
          style={{ color: '#002147', opacity: 0.5 }}
        >
          Materials sourced from
        </p>
        <div className="flex flex-wrap justify-center gap-5">
          {SUPPLIERS.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span
                className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm"
                style={{ backgroundColor: s.bg }}
              >
                {s.logo}
              </span>
              <span className="text-sm font-medium" style={{ color: '#4A4A4A' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
