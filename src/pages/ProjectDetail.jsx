import { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import MaterialSection from '../components/MaterialSection';
import BudgetTracker from '../components/BudgetTracker';
import SelectionSummary from '../components/SelectionSummary';
import { MATERIAL_CATEGORY_LABELS } from '../data/projectTypes';

export default function ProjectDetail() {
  const { state, dispatch } = useProject();
  const { activeProject, selections } = state;
  const [view, setView] = useState('materials');

  if (!activeProject) return null;

  const selectionCount = Object.keys(selections).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb & header */}
      <div className="mb-6">
        <button
          onClick={() => dispatch({ type: 'SET_PROJECT', project: null })}
          className="text-sm text-gray-400 hover:text-amber-700 flex items-center gap-1 mb-4"
        >
          ← All Projects
        </button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-4xl">{activeProject.icon}</span>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{activeProject.label}</h2>
                <p className="text-gray-500 text-sm">{activeProject.description}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView('materials')}
              className={`px-5 py-2 rounded-lg text-sm font-medium border transition-all
                ${view === 'materials' ? 'bg-amber-700 text-white border-amber-700' : 'bg-white text-gray-600 border-gray-200 hover:border-amber-400'}`}
            >
              Materials
            </button>
            <button
              onClick={() => setView('summary')}
              className={`px-5 py-2 rounded-lg text-sm font-medium border transition-all relative
                ${view === 'summary' ? 'bg-amber-700 text-white border-amber-700' : 'bg-white text-gray-600 border-gray-200 hover:border-amber-400'}`}
            >
              My List
              {selectionCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {selectionCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Info strip */}
      <div className="flex flex-wrap gap-3 mb-8">
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
          <span className="text-amber-700 font-semibold text-sm">Typical size:</span>
          <span className="text-sm text-gray-700">{activeProject.sqftRange[0]}–{activeProject.sqftRange[1]} sq ft</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeProject.materialCategories.map((cat) => (
            <span key={cat} className="bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-full border border-gray-200">
              {MATERIAL_CATEGORY_LABELS[cat] ?? cat}
            </span>
          ))}
        </div>
      </div>

      {view === 'materials' ? (
        <MaterialSection categories={activeProject.materialCategories} />
      ) : (
        <SelectionSummary />
      )}

      <BudgetTracker />
    </div>
  );
}
