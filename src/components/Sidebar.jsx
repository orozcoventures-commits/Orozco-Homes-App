import { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { getInitials, getAvatarColour } from '../lib/utils';
import { supabase } from '../lib/supabase';

const SIDEBAR_COLOR = '#1B4F6B';

const CONTRACTOR_TOOLS = [
  {
    label: 'Manage Clients',
    page: 'manage-clients',
    adminOnly: true,
    badge: null,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <line x1="23" y1="11" x2="17" y2="11" /><line x1="20" y1="8" x2="20" y2="14" />
      </svg>
    ),
  },
  {
    label: 'Create New Project',
    page: 'create-project',
    adminOnly: true,
    badge: null,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  {
    label: 'Weekly Updates',
    page: 'weekly-updates',
    badge: null,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="8" y1="14" x2="16" y2="14" /><line x1="8" y1="18" x2="13" y2="18" />
      </svg>
    ),
  },
  {
    label: 'Client Portal',
    page: 'client-portal',
    badge: null,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: 'Photo Log',
    page: 'photo-log',
    badge: null,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
  },
  {
    label: 'Approvals',
    page: 'approvals',
    badge: null,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" /><polyline points="9 15 11 17 15 13" />
      </svg>
    ),
  },
  {
    label: 'Messages',
    page: 'messages',
    badge: null,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    label: 'New Home Budget',
    page: 'new-home-budget',
    adminOnly: true,
    badge: null,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5 L12 3 L21 9.5 V20 Q21 21 20 21 H4 Q3 21 3 20 Z" />
        <line x1="9" y1="21" x2="9" y2="13" /><line x1="15" y1="21" x2="15" y2="13" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="12" y1="6" x2="12" y2="9" /><line x1="10.5" y1="7.5" x2="13.5" y2="7.5" />
      </svg>
    ),
  },
  {
    label: 'Remodel Budget',
    page: 'remodel-budget',
    adminOnly: true,
    badge: null,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21 L16 21" /><line x1="12" y1="17" x2="12" y2="21" />
        <line x1="7" y1="8" x2="17" y2="8" /><line x1="7" y1="12" x2="13" y2="12" />
        <line x1="15.5" y1="10.5" x2="17.5" y2="12.5" /><line x1="17.5" y1="10.5" x2="15.5" y2="12.5" />
      </svg>
    ),
  },
  {
    label: 'Job Schedule',
    page: 'schedule',
    adminOnly: true,
    badge: null,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="8" y1="14" x2="10" y2="14" /><line x1="12" y1="14" x2="16" y2="14" />
        <line x1="8" y1="18" x2="10" y2="18" /><line x1="12" y1="18" x2="14" y2="18" />
      </svg>
    ),
  },
  {
    label: 'Designer Workspace',
    page: 'designer-workspace',
    designerTool: true,
    badge: null,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
        <line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/>
        <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
        <line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/>
      </svg>
    ),
  },
];

export default function Sidebar({ isOpen, onClose }) {
  const { state, dispatch } = useProject();
  const { user, profile, isAdmin, isDesigner, isClient, isAuthenticated, logout } = useAuth();
  const activePage = state.activePage;

  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [unreadMessages,   setUnreadMessages]   = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    supabase
      .from('change_works')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .then(({ count }) => setPendingApprovals(count ?? 0));

    const lastViewed = localStorage.getItem('messages_last_viewed') ?? '1970-01-01T00:00:00Z';
    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .neq('sender_id', user.id)
      .gt('created_at', lastViewed)
      .then(({ count }) => setUnreadMessages(count ?? 0));
  }, [isAuthenticated, user?.id]);

  // Designer: only Designer Workspace
  // Client:   Designer Workspace + Messages + Photo Log
  // Admin:    everything
  const DESIGNER_PAGES = new Set(['designer-workspace']);
  const CLIENT_PAGES   = new Set(['designer-workspace', 'messages', 'photo-log']);

  function toolVisible(tool) {
    if (!isAuthenticated) return tool.page === 'weekly-updates'; // unauthenticated can see nothing useful
    if (isAdmin)    return true;
    if (isDesigner) return DESIGNER_PAGES.has(tool.page);
    if (isClient)   return CLIENT_PAGES.has(tool.page);
    return false;
  }

  function navigatePage(page) {
    if (page === 'messages') {
      localStorage.setItem('messages_last_viewed', new Date().toISOString());
      setUnreadMessages(0);
    }
    // Only admins need to clear the active project when switching pages
    if (isAdmin) dispatch({ type: 'CLEAR_DB_PROJECT' });
    dispatch({ type: 'SET_PAGE', page });
    onClose();
  }

  function goHome() {
    dispatch({ type: 'SET_PAGE', page: 'home' });
    onClose();
  }

  const sidebar = (
    <aside
      className="flex flex-col h-full overflow-y-auto"
      style={{ backgroundColor: SIDEBAR_COLOR, width: '260px' }}
    >
      {/* ── Brand ──────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-5 py-5 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
      >
        <button
          onClick={goHome}
          className="flex items-center gap-3 group focus:outline-none w-full"
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-md transition-transform duration-150 group-hover:scale-105"
            style={{ backgroundColor: '#D4AF37' }}
          >
            <span style={{ color: '#002147' }} className="font-extrabold text-xs tracking-wide">OH</span>
          </div>
          <div className="leading-none text-left">
            <span className="block font-bold text-white" style={{ fontSize: '0.88rem', letterSpacing: '0.03em' }}>
              Orozco Homes
            </span>
            <span className="block text-white/40 font-light tracking-widest uppercase mt-0.5" style={{ fontSize: '0.6rem' }}>
              Remodel Planner
            </span>
          </div>
        </button>

        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="md:hidden ml-auto shrink-0 w-7 h-7 rounded-md flex items-center justify-center focus:outline-none"
          style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
          aria-label="Close menu"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="1" x2="11" y2="11" /><line x1="11" y1="1" x2="1" y2="11" />
          </svg>
        </button>
      </div>

      {/* ── Nav ────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4">
        <p
          className="px-3 mb-2 text-xs font-bold tracking-[0.14em] uppercase"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          {isDesigner ? 'Design Studio' : isClient ? 'My Project' : 'Contractor Tools'}
        </p>
        <div className="space-y-0.5">
          {CONTRACTOR_TOOLS.filter((t) => toolVisible(t)).map((tool) => {
            const isActive = activePage === tool.page;
            const count    = tool.page === 'approvals' ? pendingApprovals
                           : tool.page === 'messages'  ? unreadMessages
                           : 0;
            return (
              <button
                key={tool.page}
                onClick={() => navigatePage(tool.page)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 focus:outline-none"
                style={{
                  color:           isActive ? '#D4AF37' : 'rgba(255,255,255,0.72)',
                  backgroundColor: isActive ? 'rgba(212,175,55,0.18)' : 'transparent',
                  borderLeft:      isActive ? '2px solid #D4AF37' : '2px solid transparent',
                }}
                onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; } }}
                onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.72)'; } }}
              >
                <span style={{ color: isActive ? '#D4AF37' : 'rgba(255,255,255,0.55)' }}>{tool.icon}</span>
                <span className="flex-1 text-left">{tool.label}</span>
                {count > 0 && (
                  <span
                    className="text-xs font-bold px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: '#EF4444', color: '#fff', fontSize: '0.6rem', minWidth: '18px', textAlign: 'center' }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── User info + logout ─────────────────────────── */}
      {isAuthenticated && user && profile && (
        <div
          className="px-4 py-3 shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shrink-0"
              style={{ backgroundColor: getAvatarColour(user.id), fontSize: '0.72rem' }}
            >
              {getInitials(profile.full_name || user.email)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{profile.full_name || user.email}</p>
              <span
                className="text-xs px-1.5 py-0.5 rounded font-semibold"
                style={
                  isAdmin
                    ? { backgroundColor: '#D4AF37', color: '#002147' }
                    : isDesigner
                    ? { backgroundColor: '#7C3AED', color: '#fff' }
                    : { backgroundColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }
                }
              >
                {isAdmin ? 'Admin' : isDesigner ? 'Designer' : isClient ? 'Client' : 'Guest'}
              </span>
            </div>
            <button
              onClick={() => { logout(); dispatch({ type: 'SET_PAGE', page: 'home' }); onClose(); }}
              title="Sign out"
              className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center focus:outline-none transition-colors duration-150"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.2)'; e.currentTarget.style.color = '#FCA5A5'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Footer ─────────────────────────────────────── */}
      <div
        className="px-5 py-3 shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
      >
        <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>
          © 2025 Orozco Homes
        </p>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop: permanent fixed sidebar */}
      <div className="hidden md:flex fixed left-0 top-0 h-full z-40" style={{ width: '260px' }}>
        {sidebar}
      </div>

      {/* Mobile: slide-in overlay */}
      <div
        className="md:hidden fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          backgroundColor: 'rgba(0,0,0,0.5)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="md:hidden fixed left-0 top-0 h-full z-50 transition-transform duration-300 flex"
        style={{
          width: '260px',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        {sidebar}
      </div>
    </>
  );
}
