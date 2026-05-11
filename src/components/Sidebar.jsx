import { useState, useEffect } from 'react';
import { PROJECT_TYPES } from '../data/projectTypes';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { getInitials, getAvatarColour } from '../lib/utils';
import { supabase } from '../lib/supabase';

const SIDEBAR_COLOR = '#1B4F6B';

const SECTIONS = [
  {
    heading: 'PROJECT TYPES',
    items: [
      {
        label: 'Bathrooms',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6 Q9 3 12 3 Q15 3 15 6" /><rect x="3" y="6" width="18" height="4" rx="1" />
            <path d="M5 10 L5 19 Q5 21 7 21 L17 21 Q19 21 19 19 L19 10" />
            <line x1="8" y1="15" x2="8" y2="18" /><line x1="12" y1="14" x2="12" y2="18" /><line x1="16" y1="15" x2="16" y2="18" />
          </svg>
        ),
        key: 'bathrooms',
        children: PROJECT_TYPES.filter((p) => p.category === 'bathroom'),
      },
      {
        label: 'Kitchens',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3 L3 11 Q3 13 5 13 L5 21" /><path d="M5 7 L3 7" /><path d="M21 3 L21 21" />
            <path d="M14 3 Q14 8 17.5 8 Q21 8 21 3" />
          </svg>
        ),
        key: 'kitchens',
        children: PROJECT_TYPES.filter((p) => p.category === 'kitchen'),
      },
    ],
  },
  {
    heading: 'HOME SERVICES',
    items: [
      {
        label: 'Additions',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9.5 L12 3 L21 9.5 V20 Q21 21 20 21 H15 V15 H9 V21 H4 Q3 21 3 20 Z" />
            <line x1="12" y1="12" x2="12" y2="16" /><line x1="10" y1="14" x2="14" y2="14" />
          </svg>
        ),
        project: PROJECT_TYPES.find((p) => p.id === 'addition'),
      },
      {
        label: 'Portico',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="21" x2="21" y2="21" /><line x1="3" y1="10" x2="21" y2="10" />
            <polyline points="5 10 5 3 19 3 19 10" />
            <line x1="7" y1="21" x2="7" y2="10" /><line x1="11" y1="21" x2="11" y2="10" />
            <line x1="15" y1="21" x2="15" y2="10" /><line x1="19" y1="21" x2="19" y2="10" />
          </svg>
        ),
        project: PROJECT_TYPES.find((p) => p.id === 'portico'),
      },
      {
        label: 'Garage Conversion',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="1" /><path d="M2 7 L12 2 L22 7" />
            <line x1="7" y1="13" x2="17" y2="13" /><line x1="7" y1="17" x2="17" y2="17" />
          </svg>
        ),
        project: PROJECT_TYPES.find((p) => p.id === 'garage-conversion'),
      },
    ],
  },
];

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
];

export default function Sidebar({ isOpen, onClose }) {
  const { state, dispatch } = useProject();
  const { user, profile, isAdmin, isAuthenticated, logout } = useAuth();
  const active = state.activeProject;
  const activePage = state.activePage;

  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [unreadMessages, setUnreadMessages]     = useState(0);

  // Fetch live badge counts whenever auth state is ready
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Pending approvals: change_works with status = 'pending'
    supabase
      .from('change_works')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .then(({ count }) => setPendingApprovals(count ?? 0));

    // Unread messages: messages from others newer than last time the user visited Messages
    const lastViewed = localStorage.getItem('messages_last_viewed') ?? '1970-01-01T00:00:00Z';
    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .neq('sender_id', user.id)
      .gt('created_at', lastViewed)
      .then(({ count }) => setUnreadMessages(count ?? 0));
  }, [isAuthenticated, user?.id]);

  function toolVisible(tool) {
    if (tool.adminOnly) return isAdmin;
    if (tool.page === 'weekly-updates') return true;
    if (!isAuthenticated) return true;
    if (isAdmin) return true;
    return tool.page === 'messages';
  }

  // Track which expandable items are open
  const [expanded, setExpanded] = useState({ bathrooms: true, kitchens: false });

  // Auto-expand parent when a project becomes active
  useEffect(() => {
    if (active?.category === 'bathroom') setExpanded((e) => ({ ...e, bathrooms: true }));
    if (active?.category === 'kitchen')  setExpanded((e) => ({ ...e, kitchens: true }));
  }, [active]);

  function navigate(project) {
    dispatch({ type: 'SET_PROJECT', project });
    onClose();
  }

  function navigatePage(page) {
    if (page === 'messages') {
      localStorage.setItem('messages_last_viewed', new Date().toISOString());
      setUnreadMessages(0);
    }
    // Tool pages are not project-scoped — clear any active project filter so
    // the page shows data across all projects (matching the sidebar badge count).
    dispatch({ type: 'CLEAR_DB_PROJECT' });
    dispatch({ type: 'SET_PAGE', page });
    onClose();
  }

  function goHome() {
    dispatch({ type: 'SET_PROJECT', project: null });
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

      {/* ── Nav sections ───────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-6">
        {/* ── Contractor tools ───────────────────────────── */}
        <div>
          <p
            className="px-3 mb-2 text-xs font-bold tracking-[0.14em] uppercase"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            Contractor Tools
          </p>
          <div className="space-y-0.5">
            {CONTRACTOR_TOOLS.filter((t) => toolVisible(t)).map((tool) => {
              const isActive = activePage === tool.page;
              return (
                <button
                  key={tool.page}
                  onClick={() => navigatePage(tool.page)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 focus:outline-none"
                  style={{
                    color: isActive ? '#D4AF37' : 'rgba(255,255,255,0.72)',
                    backgroundColor: isActive ? 'rgba(212,175,55,0.18)' : 'transparent',
                    borderLeft: isActive ? '2px solid #D4AF37' : '2px solid transparent',
                  }}
                  onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; } }}
                  onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.72)'; } }}
                >
                  <span style={{ color: isActive ? '#D4AF37' : 'rgba(255,255,255,0.55)' }}>{tool.icon}</span>
                  <span className="flex-1 text-left">{tool.label}</span>
                  {(() => {
                    const count = tool.page === 'approvals' ? pendingApprovals
                                : tool.page === 'messages'  ? unreadMessages
                                : 0;
                    return count > 0 ? (
                      <span
                        className="text-xs font-bold px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ backgroundColor: '#EF4444', color: '#fff', fontSize: '0.6rem', minWidth: '18px', textAlign: 'center' }}
                      >
                        {count}
                      </span>
                    ) : null;
                  })()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />

        {SECTIONS.map((section) => (
          <div key={section.heading}>
            {/* Section heading */}
            <p
              className="px-3 mb-2 text-xs font-bold tracking-[0.14em] uppercase"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              {section.heading}
            </p>

            <div className="space-y-0.5">
              {section.items.map((item) => {
                const hasChildren = !!item.children;
                const isExpanded = expanded[item.key];
                const isActiveParent = hasChildren && item.children.some((c) => c.id === active?.id);

                if (hasChildren) {
                  return (
                    <div key={item.label}>
                      {/* Expandable parent */}
                      <button
                        onClick={() => setExpanded((e) => ({ ...e, [item.key]: !e[item.key] }))}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 focus:outline-none"
                        style={{
                          color: isActiveParent || isExpanded ? '#fff' : 'rgba(255,255,255,0.72)',
                          backgroundColor: isActiveParent ? 'rgba(212,175,55,0.15)' : isExpanded ? 'rgba(255,255,255,0.08)' : 'transparent',
                        }}
                        onMouseEnter={(e) => { if (!isActiveParent) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
                        onMouseLeave={(e) => { if (!isActiveParent) e.currentTarget.style.backgroundColor = isExpanded ? 'rgba(255,255,255,0.08)' : 'transparent'; }}
                      >
                        <span style={{ color: isActiveParent ? '#D4AF37' : 'rgba(255,255,255,0.6)' }}>{item.icon}</span>
                        <span className="flex-1 text-left">{item.label}</span>
                        <svg
                          width="10" height="10" viewBox="0 0 10 10" fill="none"
                          stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                          style={{ transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
                        >
                          <polyline points="1 3 5 7 9 3" />
                        </svg>
                      </button>

                      {/* Sub-items */}
                      <div
                        className="overflow-hidden transition-all duration-250"
                        style={{ maxHeight: isExpanded ? '200px' : '0px' }}
                      >
                        <div className="mt-0.5 ml-4 space-y-0.5">
                          {item.children.map((child) => {
                            const isActive = active?.id === child.id;
                            return (
                              <button
                                key={child.id}
                                onClick={() => navigate(child)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-120 focus:outline-none"
                                style={{
                                  color: isActive ? '#D4AF37' : 'rgba(255,255,255,0.65)',
                                  backgroundColor: isActive ? 'rgba(212,175,55,0.18)' : 'transparent',
                                  borderLeft: isActive ? '2px solid #D4AF37' : '2px solid transparent',
                                }}
                                onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#fff'; } }}
                                onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; } }}
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: isActive ? '#D4AF37' : 'rgba(255,255,255,0.3)' }}
                                />
                                <span className="flex-1 text-left">{child.label}</span>
                                <span className="shrink-0 text-xs" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem' }}>
                                  {child.subtitle}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                }

                // Direct nav item (no children)
                const isActive = active?.id === item.project?.id;
                return (
                  <button
                    key={item.label}
                    onClick={() => navigate(item.project)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 focus:outline-none"
                    style={{
                      color: isActive ? '#D4AF37' : 'rgba(255,255,255,0.72)',
                      backgroundColor: isActive ? 'rgba(212,175,55,0.18)' : 'transparent',
                      borderLeft: isActive ? '2px solid #D4AF37' : '2px solid transparent',
                    }}
                    onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; } }}
                    onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.72)'; } }}
                  >
                    <span style={{ color: isActive ? '#D4AF37' : 'rgba(255,255,255,0.55)' }}>{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
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
                    : { backgroundColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }
                }
              >
                {isAdmin ? 'Admin' : 'Client'}
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
      {/* Backdrop */}
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
      {/* Drawer */}
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
