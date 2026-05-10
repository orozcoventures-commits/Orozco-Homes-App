import { PROJECT_TYPES } from '../data/projectTypes';
import { useProject } from '../context/ProjectContext';

const CATEGORY_GROUPS = [
  { id: 'bathroom', label: 'Bathrooms', color: 'from-sky-50 to-blue-50', border: 'border-sky-200', accent: 'bg-sky-700' },
  { id: 'kitchen', label: 'Kitchens', color: 'from-amber-50 to-orange-50', border: 'border-amber-200', accent: 'bg-amber-700' },
  { id: 'addition', label: 'Home Addition', color: 'from-emerald-50 to-green-50', border: 'border-emerald-200', accent: 'bg-emerald-700' },
  { id: 'portico', label: 'Portico / Entry', color: 'from-stone-50 to-gray-50', border: 'border-stone-200', accent: 'bg-stone-700' },
  { id: 'garage-conversion', label: 'Garage Conversion', color: 'from-violet-50 to-purple-50', border: 'border-violet-200', accent: 'bg-violet-700' },
  { id: 'full-renovation', label: 'Full House Renovation', color: 'from-rose-50 to-pink-50', border: 'border-rose-200', accent: 'bg-rose-700' },
];

export default function ProjectSelector() {
  const { dispatch } = useProject();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Hero */}
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
          What are we building today?
        </h2>
        <p className="text-gray-500 text-lg max-w-2xl mx-auto">
          Select your project type to browse materials from Ferguson, Home Depot, Floor &amp; Decor,
          Lowe's, Wayfair Pro, and MSI Surfaces — all in one place.
        </p>
      </div>

      {/* Project groups */}
      <div className="space-y-10">
        {CATEGORY_GROUPS.map((group) => {
          const projects = PROJECT_TYPES.filter((p) => p.category === group.id);
          return (
            <div key={group.id}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-3 h-3 rounded-full ${group.accent}`} />
                <h3 className="text-lg font-semibold text-gray-800">{group.label}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => dispatch({ type: 'SET_PROJECT', project })}
                    className={`
                      group relative bg-gradient-to-br ${group.color} border ${group.border}
                      rounded-2xl p-6 text-left hover:shadow-lg transition-all duration-200
                      hover:-translate-y-0.5 active:translate-y-0
                    `}
                  >
                    <div className="text-3xl mb-3">{project.icon}</div>
                    <h4 className="text-base font-bold text-gray-900 mb-1">{project.label}</h4>
                    <p className="text-sm text-gray-500 mb-3">{project.subtitle}</p>
                    <p className="text-xs text-gray-400 leading-relaxed">{project.description}</p>
                    <div className="mt-4 flex items-center gap-1 text-xs font-medium text-amber-700">
                      <span>Browse materials</span>
                      <span className="group-hover:translate-x-1 transition-transform duration-150">→</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Supplier logos */}
      <div className="mt-14 pt-8 border-t border-gray-200">
        <p className="text-center text-xs text-gray-400 uppercase tracking-widest mb-5 font-semibold">
          Materials sourced from
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {[
            { label: 'Ferguson', logo: 'FG', color: 'bg-blue-900 text-white' },
            { label: 'Home Depot', logo: 'HD', color: 'bg-orange-500 text-white' },
            { label: 'Floor & Decor', logo: 'F&D', color: 'bg-green-800 text-white' },
            { label: "Lowe's", logo: 'LW', color: 'bg-blue-700 text-white' },
            { label: 'Wayfair Pro', logo: 'WF', color: 'bg-purple-700 text-white' },
            { label: 'MSI Surfaces', logo: 'MSI', color: 'bg-red-800 text-white' },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${s.color}`}>
                {s.logo}
              </span>
              <span className="text-sm text-gray-600 font-medium">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
