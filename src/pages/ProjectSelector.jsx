import { PROJECT_TYPES } from '../data/projectTypes';
import { useProject } from '../context/ProjectContext';

const CATEGORY_GROUPS = [
  { id: 'bathroom',          label: 'Bathrooms',               bg: '#EFF6FF', border: '#BFDBFE' },
  { id: 'kitchen',           label: 'Kitchens',                bg: '#FFFBEB', border: '#FDE68A' },
  { id: 'addition',          label: 'Home Addition',           bg: '#ECFDF5', border: '#A7F3D0' },
  { id: 'portico',           label: 'Portico / Entry',         bg: '#F5F5F4', border: '#D6D3D1' },
  { id: 'garage-conversion', label: 'Garage Conversion',       bg: '#F5F3FF', border: '#DDD6FE' },
  { id: 'full-renovation',   label: 'Full House Renovation',   bg: '#FFF1F2', border: '#FECDD3' },
];

export default function ProjectSelector() {
  const { dispatch } = useProject();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {/* Hero */}
      <div className="text-center mb-14">
        <p
          className="text-xs font-semibold tracking-[0.2em] uppercase mb-3"
          style={{ color: '#D4AF37' }}
        >
          Welcome to Your Remodel Planner
        </p>
        <h2
          className="text-2xl sm:text-3xl font-semibold mb-4 tracking-wide"
          style={{ color: '#002147', letterSpacing: '0.02em' }}
        >
          What are we building today?
        </h2>
        <p className="text-base max-w-2xl mx-auto leading-relaxed" style={{ color: '#4A4A4A' }}>
          Select your project type to browse curated materials from Ferguson, Home Depot,
          Floor &amp; Decor, Lowe's, Wayfair Pro, and MSI Surfaces — all in one place.
        </p>
        {/* Gold rule */}
        <div className="flex justify-center mt-6">
          <div className="h-px w-24 rounded-full" style={{ backgroundColor: '#D4AF37' }} />
        </div>
      </div>

      {/* Project groups */}
      <div className="space-y-12">
        {CATEGORY_GROUPS.map((group) => {
          const projects = PROJECT_TYPES.filter((p) => p.category === group.id);
          return (
            <div key={group.id}>
              {/* Section label */}
              <div className="flex items-center gap-3 mb-5">
                <div className="h-px flex-1" style={{ backgroundColor: '#E5E3DF' }} />
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: '#D4AF37' }}
                  />
                  <h3
                    className="text-xs font-bold tracking-[0.15em] uppercase"
                    style={{ color: '#002147' }}
                  >
                    {group.label}
                  </h3>
                </div>
                <div className="h-px flex-1" style={{ backgroundColor: '#E5E3DF' }} />
              </div>

              {/* Project cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => dispatch({ type: 'SET_PROJECT', project })}
                    className="group text-left rounded-2xl p-7 transition-all duration-200 hover:-translate-y-1"
                    style={{
                      backgroundColor: group.bg,
                      border: `1.5px solid ${group.border}`,
                      boxShadow: '0 2px 8px rgba(0,33,71,0.06)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,33,71,0.14)';
                      e.currentTarget.style.borderColor = '#D4AF37';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,33,71,0.06)';
                      e.currentTarget.style.borderColor = group.border;
                    }}
                  >
                    {/* Icon */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-5 shadow-sm"
                      style={{ backgroundColor: 'rgba(0,33,71,0.06)' }}
                    >
                      {project.icon}
                    </div>

                    {/* Title */}
                    <h4
                      className="font-semibold mb-1 tracking-wide"
                      style={{ color: '#002147', fontSize: '0.95rem', letterSpacing: '0.02em' }}
                    >
                      {project.label}
                    </h4>

                    {/* Subtitle */}
                    <p className="text-xs font-medium mb-3" style={{ color: '#D4AF37' }}>
                      {project.subtitle}
                    </p>

                    {/* Description */}
                    <p className="text-xs leading-relaxed mb-5" style={{ color: '#4A4A4A' }}>
                      {project.description}
                    </p>

                    {/* CTA */}
                    <div
                      className="flex items-center gap-1.5 text-xs font-semibold tracking-wide"
                      style={{ color: '#002147' }}
                    >
                      <span>Browse materials</span>
                      <span
                        className="group-hover:translate-x-1 transition-transform duration-150"
                        style={{ color: '#D4AF37' }}
                      >
                        →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Supplier strip */}
      <div className="mt-16 pt-10 border-t" style={{ borderColor: '#E5E3DF' }}>
        <p
          className="text-center text-xs font-semibold tracking-[0.2em] uppercase mb-6"
          style={{ color: '#002147', opacity: 0.5 }}
        >
          Materials sourced from
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          {[
            { label: 'Ferguson',      logo: 'FG',  bg: '#003087' },
            { label: 'Home Depot',    logo: 'HD',  bg: '#F96302' },
            { label: 'Floor & Decor', logo: 'F&D', bg: '#1B5E20' },
            { label: "Lowe's",        logo: 'LW',  bg: '#004990' },
            { label: 'Wayfair Pro',   logo: 'WF',  bg: '#7B2D8B' },
            { label: 'MSI Surfaces',  logo: 'MSI', bg: '#8B1A1A' },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span
                className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm"
                style={{ backgroundColor: s.bg }}
              >
                {s.logo}
              </span>
              <span className="text-sm font-medium" style={{ color: '#4A4A4A' }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
