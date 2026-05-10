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

      {/* Breadcrumb */}
      <button
        onClick={() => dispatch({ type: 'SET_PROJECT', project: null })}
        className="flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase mb-6 transition-colors duration-150"
        style={{ color: '#9CA3AF' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#D4AF37'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = '#9CA3AF'; }}
      >
        ← All Projects
      </button>

      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-md flex-shrink-0"
            style={{ backgroundColor: 'rgba(0,33,71,0.07)' }}
          >
            {activeProject.icon}
          </div>
          <div>
            <h2
              className="font-bold mb-0.5 tracking-wide"
              style={{ color: '#002147', fontSize: '1.4rem', letterSpacing: '0.02em' }}
            >
              {activeProject.label}
            </h2>
            <p className="text-sm" style={{ color: '#4A4A4A' }}>{activeProject.description}</p>
          </div>
        </div>

        {/* Materials / My List toggle */}
        <div
          className="flex rounded-xl overflow-hidden"
          style={{ border: '1.5px solid #E8E6E1', backgroundColor: '#F9F8F6' }}
        >
          {['materials', 'summary'].map((v) => {
            const active = view === v;
            const label = v === 'materials' ? 'Materials' : 'My List';
            return (
              <button
                key={v}
                onClick={() => setView(v)}
                className="relative px-5 py-2 text-sm font-semibold transition-all duration-150"
                style={
                  active
                    ? { backgroundColor: '#002147', color: '#fff' }
                    : { backgroundColor: 'transparent', color: '#4A4A4A' }
                }
              >
                {label}
                {v === 'summary' && selectionCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: '#D4AF37', color: '#002147' }}
                  >
                    {selectionCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Info strip */}
      <div className="flex flex-wrap gap-2 mb-8">
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{
            backgroundColor: 'rgba(0,33,71,0.05)',
            border: '1.5px solid rgba(0,33,71,0.12)',
            color: '#002147',
          }}
        >
          <span style={{ color: '#D4AF37' }}>◈</span>
          <span className="font-semibold">Typical size:</span>
          <span style={{ color: '#4A4A4A' }}>
            {activeProject.sqftRange[0]}–{activeProject.sqftRange[1]} sq ft
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeProject.materialCategories.map((cat) => (
            <span
              key={cat}
              className="text-xs px-3 py-1.5 rounded-full font-medium"
              style={{
                backgroundColor: '#F0EEE9',
                color: '#4A4A4A',
                border: '1px solid #E8E6E1',
              }}
            >
              {MATERIAL_CATEGORY_LABELS[cat] ?? cat}
            </span>
          ))}
        </div>
      </div>

      {/* Gold divider */}
      <div className="h-px mb-8" style={{ backgroundColor: 'rgba(212,175,55,0.3)' }} />

      {view === 'materials' ? (
        <MaterialSection categories={activeProject.materialCategories} />
      ) : (
        <SelectionSummary />
      )}

      <BudgetTracker />
    </div>
  );
}
