import { useState, useEffect, useRef } from 'react';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { MATERIAL_CATEGORY_LABELS } from '../data/projectTypes';

function ShareAccessCard({ project }) {
  const clientName = project.managed_client?.full_name ?? 'Your Client';
  const clientEmail = project.managed_client?.email ?? '';
  const pin = project.project_pin;
  const portalUrl = window.location.origin;

  const [pinRevealed, setPinRevealed] = useState(false);
  const [toast, setToast]             = useState('');
  const toastTimer                    = useRef(null);

  function showToast(msg) {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(''), 2500);
  }
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  function buildMessage() {
    return `Hi ${clientName}, you can track your project progress at ${portalUrl}. Your access code is: ${pin}.`;
  }

  function handleCopy() {
    navigator.clipboard.writeText(buildMessage()).then(() => showToast('copied'));
  }

  function handleEmail() {
    const subject = encodeURIComponent('Access your Orozco Homes Project Portal');
    const body = encodeURIComponent(buildMessage());
    const to = clientEmail ? encodeURIComponent(clientEmail) : '';
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
    showToast('email');
  }

  if (!pin) return null;

  return (
    <div
      className="rounded-2xl mb-6 overflow-hidden"
      style={{ backgroundColor: '#fff', border: '1.5px solid rgba(212,175,55,0.45)', boxShadow: '0 2px 12px rgba(0,33,71,0.06)' }}
    >
      <div className="flex items-center gap-2.5 px-4 py-3" style={{ backgroundColor: 'rgba(212,175,55,0.08)', borderBottom: '1px solid rgba(212,175,55,0.25)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#92400E' }}>Share Access</span>
        <span className="text-xs ml-auto" style={{ color: '#9CA3AF' }}>{clientName}</span>
      </div>

      <div className="px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ backgroundColor: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.3)' }}
          >
            <span className="text-xs font-semibold" style={{ color: '#9CA3AF' }}>PIN</span>
            <span
              className="text-base font-bold tracking-[0.25em]"
              style={{ color: '#002147', fontFamily: 'monospace', minWidth: '3rem', letterSpacing: pinRevealed ? '0.25em' : '0.1em' }}
            >
              {pinRevealed ? pin : '••••'}
            </span>
          </div>
          <button
            onClick={() => setPinRevealed((v) => !v)}
            className="text-xs px-2.5 py-1.5 rounded-lg transition-colors focus:outline-none"
            style={{ backgroundColor: '#F5F4F0', color: '#6B7280', border: '1px solid #E8E6E1' }}
          >
            {pinRevealed ? 'Hide' : 'Reveal'}
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 focus:outline-none"
            style={{
              backgroundColor: toast === 'copied' ? '#ECFDF5' : '#F5F4F0',
              color:           toast === 'copied' ? '#059669' : '#374151',
              border:          `1px solid ${toast === 'copied' ? '#A7F3D0' : '#E8E6E1'}`,
            }}
          >
            {toast === 'copied' ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
            <span className="hidden sm:inline">{toast === 'copied' ? 'Copied!' : 'Copy Message'}</span>
          </button>

          <button
            onClick={handleEmail}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 focus:outline-none"
            style={{
              backgroundColor: toast === 'email' ? '#EFF6FF' : '#002147',
              color:           toast === 'email' ? '#1D4ED8' : '#D4AF37',
              border:          `1px solid ${toast === 'email' ? '#BFDBFE' : 'transparent'}`,
            }}
          >
            {toast === 'email' ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
            )}
            <span className="hidden sm:inline">{toast === 'email' ? 'Email Opened!' : 'Email Invite'}</span>
          </button>
        </div>
      </div>

      <div
        className="mx-4 mb-3 px-3 py-2 rounded-xl text-xs"
        style={{ backgroundColor: '#F9F8F6', border: '1px solid #F0EEE9', color: '#6B7280', fontStyle: 'italic' }}
      >
        "{`Hi ${clientName}, you can track your project progress at ${portalUrl}. Your access code is: ${pinRevealed ? pin : '••••'}.`}"
      </div>
    </div>
  );
}

export default function ProjectDetail() {
  const { state, dispatch } = useProject();
  const { isAdmin } = useAuth();
  const { activeProject, activeDbProject } = state;

  if (!activeProject) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

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

      {/* Active project context banner */}
      {isAdmin && activeDbProject && (
        <div
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl mb-4 text-xs font-semibold"
          style={{ backgroundColor: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.35)', color: '#92400E' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          Linked client project: <span className="font-bold ml-1" style={{ color: '#002147' }}>{activeDbProject.project_name}</span>
        </div>
      )}

      {/* Share Access card */}
      {isAdmin && activeDbProject && <ShareAccessCard project={activeDbProject} />}

      {/* Gold divider */}
      <div className="h-px mb-8" style={{ backgroundColor: 'rgba(212,175,55,0.3)' }} />

      {/* Quick-action cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          {
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            ),
            label: 'Client Portal',
            description: 'View project status, phases & design approvals',
            page: 'client-portal',
          },
          {
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            ),
            label: 'Messages',
            description: 'Send and receive project messages',
            page: 'messages',
          },
          {
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            ),
            label: 'Weekly Updates',
            description: 'Post or view weekly progress reports',
            page: 'weekly-updates',
          },
          {
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 13"/>
              </svg>
            ),
            label: 'Approvals',
            description: 'Review and action pending change orders',
            page: 'approvals',
          },
          {
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            ),
            label: 'Photo Log',
            description: 'Browse project progress photos',
            page: 'photo-log',
          },
          {
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/>
                <line x1="12" y1="18" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="7.05" y2="7.05"/>
                <line x1="16.95" y1="16.95" x2="19.78" y2="19.78"/>
                <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
                <line x1="4.22" y1="19.78" x2="7.05" y2="16.95"/><line x1="16.95" y1="7.05" x2="19.78" y2="4.22"/>
              </svg>
            ),
            label: 'Designer Workspace',
            description: 'Curate material selections for this project',
            page: 'designer-workspace',
            adminOnly: true,
          },
        ].map((card) => {
          if (card.adminOnly && !isAdmin) return null;
          return (
            <button
              key={card.page}
              onClick={() => dispatch({ type: 'SET_PAGE', page: card.page })}
              className="rounded-2xl p-5 text-left transition-all duration-150 focus:outline-none"
              style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 1px 6px rgba(0,33,71,0.04)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#D4AF37'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,33,71,0.10)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E8E6E1'; e.currentTarget.style.boxShadow = '0 1px 6px rgba(0,33,71,0.04)'; }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: 'rgba(0,33,71,0.06)', color: '#002147' }}>
                {card.icon}
              </div>
              <p className="font-bold text-sm mb-1" style={{ color: '#002147' }}>{card.label}</p>
              <p className="text-xs leading-relaxed" style={{ color: '#9CA3AF' }}>{card.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
