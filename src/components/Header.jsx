import { useState, useRef, useEffect } from 'react';
import { PROJECT_TYPES } from '../data/projectTypes';
import { useProject } from '../context/ProjectContext';

// Navigation structure — dropdowns for Bathrooms & Kitchens, direct links for the rest
const NAV = [
  {
    label: 'Bathrooms',
    items: PROJECT_TYPES.filter((p) => p.category === 'bathroom'),
  },
  {
    label: 'Kitchens',
    items: PROJECT_TYPES.filter((p) => p.category === 'kitchen'),
  },
  { label: 'Additions',         project: PROJECT_TYPES.find((p) => p.id === 'addition') },
  { label: 'Portico',           project: PROJECT_TYPES.find((p) => p.id === 'portico') },
  { label: 'Garage Conversion', project: PROJECT_TYPES.find((p) => p.id === 'garage-conversion') },
];

export default function Header() {
  const { dispatch } = useProject();
  const [hovered, setHovered]         = useState(null);  // desktop: which dropdown label is open
  const [mobileOpen, setMobileOpen]   = useState(false); // hamburger state
  const [accordion, setAccordion]     = useState(null);  // mobile accordion: open label
  const mobileRef = useRef(null);

  // Close mobile menu on outside click
  useEffect(() => {
    function handleClick(e) {
      if (mobileRef.current && !mobileRef.current.contains(e.target)) {
        setMobileOpen(false);
      }
    }
    if (mobileOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [mobileOpen]);

  function navigate(project) {
    dispatch({ type: 'SET_PROJECT', project });
    setHovered(null);
    setMobileOpen(false);
    setAccordion(null);
  }

  function goHome() {
    dispatch({ type: 'SET_PROJECT', project: null });
    setHovered(null);
    setMobileOpen(false);
    setAccordion(null);
  }

  return (
    <header style={{ backgroundColor: '#002147' }} className="sticky top-0 z-50 shadow-lg" ref={mobileRef}>
      {/* Top gold accent line */}
      <div style={{ backgroundColor: '#D4AF37', height: '3px' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Brand ──────────────────────────────────────────────────── */}
          <button onClick={goHome} className="flex items-center gap-3 group focus:outline-none shrink-0">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shadow-md transition-transform duration-150 group-hover:scale-105"
              style={{ backgroundColor: '#D4AF37' }}
            >
              <span style={{ color: '#002147' }} className="font-extrabold text-sm tracking-wide">OH</span>
            </div>
            <div className="hidden sm:block leading-none text-left">
              <span className="block font-bold text-white" style={{ fontSize: '0.95rem', letterSpacing: '0.04em' }}>
                Orozco Homes
              </span>
              <span className="block text-white/40 font-light tracking-widest uppercase" style={{ fontSize: '0.65rem' }}>
                Material Selection Portal
              </span>
            </div>
            <span className="sm:hidden font-bold text-white" style={{ fontSize: '0.95rem', letterSpacing: '0.04em' }}>
              Orozco Homes
            </span>
          </button>

          {/* ── Desktop nav ────────────────────────────────────────────── */}
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV.map((item) => {
              const hasDropdown = !!item.items;
              const isOpen = hovered === item.label;

              return (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => hasDropdown && setHovered(item.label)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {/* Top-level button */}
                  <button
                    onClick={() => !hasDropdown && navigate(item.project)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-150 focus:outline-none"
                    style={{
                      color: isOpen ? '#D4AF37' : 'rgba(255,255,255,0.78)',
                      backgroundColor: isOpen ? 'rgba(212,175,55,0.1)' : 'transparent',
                      letterSpacing: '0.02em',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#D4AF37';
                      e.currentTarget.style.backgroundColor = 'rgba(212,175,55,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isOpen) {
                        e.currentTarget.style.color = 'rgba(255,255,255,0.78)';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    {item.label}
                    {hasDropdown && (
                      <svg
                        width="10" height="10" viewBox="0 0 10 10" fill="none"
                        style={{
                          stroke: isOpen ? '#D4AF37' : 'rgba(255,255,255,0.6)',
                          transition: 'transform 0.2s, stroke 0.15s',
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        }}
                      >
                        <polyline points="1 3 5 7 9 3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>

                  {/* Dropdown panel */}
                  {hasDropdown && isOpen && (
                    <div
                      className="absolute top-full left-0 mt-1 rounded-xl overflow-hidden"
                      style={{
                        backgroundColor: '#fff',
                        border: '1.5px solid #E8E6E1',
                        boxShadow: '0 16px 48px rgba(0,33,71,0.18)',
                        minWidth: '240px',
                        borderTop: '3px solid #D4AF37',
                      }}
                    >
                      {item.items.map((sub, idx) => (
                        <button
                          key={sub.id}
                          onClick={() => navigate(sub)}
                          className="w-full text-left px-5 py-3.5 flex items-center justify-between group/sub transition-colors duration-120 focus:outline-none"
                          style={{
                            borderBottom: idx < item.items.length - 1 ? '1px solid #F0EEE9' : 'none',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FFFBF0'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <div>
                            <p className="text-sm font-semibold" style={{ color: '#002147' }}>{sub.label}</p>
                            <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{sub.subtitle}</p>
                          </div>
                          <svg
                            width="14" height="14" viewBox="0 0 14 14" fill="none"
                            className="opacity-0 group-hover/sub:opacity-100 transition-opacity duration-120 -translate-x-1 group-hover/sub:translate-x-0 transition-transform"
                            stroke="#D4AF37" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                          >
                            <polyline points="3 7 11 7" />
                            <polyline points="7 3 11 7 7 11" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Get a Quote CTA */}
            <button
              onClick={() => {
                const el = document.querySelector('#contact');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="ml-3 px-4 py-2 rounded-lg text-sm font-bold tracking-wide transition-all duration-150 focus:outline-none"
              style={{ backgroundColor: '#D4AF37', color: '#002147', letterSpacing: '0.03em' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#C9A227'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#D4AF37'; }}
            >
              Get a Quote
            </button>
          </nav>

          {/* ── Mobile hamburger ───────────────────────────────────────── */}
          <button
            className="md:hidden flex flex-col justify-center items-center w-10 h-10 rounded-lg gap-1.5 focus:outline-none transition-colors duration-150"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            style={{ backgroundColor: mobileOpen ? 'rgba(212,175,55,0.15)' : 'transparent' }}
          >
            <span
              className="block w-5 h-0.5 rounded-full transition-all duration-200 origin-center"
              style={{
                backgroundColor: '#D4AF37',
                transform: mobileOpen ? 'translateY(4px) rotate(45deg)' : 'none',
              }}
            />
            <span
              className="block w-5 h-0.5 rounded-full transition-all duration-200"
              style={{ backgroundColor: '#D4AF37', opacity: mobileOpen ? 0 : 1 }}
            />
            <span
              className="block w-5 h-0.5 rounded-full transition-all duration-200 origin-center"
              style={{
                backgroundColor: '#D4AF37',
                transform: mobileOpen ? 'translateY(-4px) rotate(-45deg)' : 'none',
              }}
            />
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ──────────────────────────────────────────────── */}
      <div
        className="md:hidden overflow-hidden transition-all duration-300"
        style={{ maxHeight: mobileOpen ? '600px' : '0px' }}
      >
        <div className="px-4 pb-5 pt-2 space-y-1" style={{ borderTop: '1px solid rgba(212,175,55,0.2)' }}>
          {NAV.map((item) => {
            const hasDropdown = !!item.items;
            const isExpanded = accordion === item.label;

            if (hasDropdown) {
              return (
                <div key={item.label}>
                  {/* Accordion header */}
                  <button
                    onClick={() => setAccordion(isExpanded ? null : item.label)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold focus:outline-none transition-colors duration-150"
                    style={{
                      color: isExpanded ? '#D4AF37' : 'rgba(255,255,255,0.85)',
                      backgroundColor: isExpanded ? 'rgba(212,175,55,0.1)' : 'transparent',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {item.label}
                    <svg
                      width="10" height="10" viewBox="0 0 10 10" fill="none"
                      style={{
                        stroke: isExpanded ? '#D4AF37' : 'rgba(255,255,255,0.5)',
                        transition: 'transform 0.2s',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    >
                      <polyline points="1 3 5 7 9 3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {/* Accordion sub-items */}
                  <div
                    className="overflow-hidden transition-all duration-250"
                    style={{ maxHeight: isExpanded ? '300px' : '0px' }}
                  >
                    <div className="ml-4 mt-1 mb-1 space-y-0.5 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(212,175,55,0.2)' }}>
                      {item.items.map((sub, idx) => (
                        <button
                          key={sub.id}
                          onClick={() => navigate(sub)}
                          className="w-full text-left px-4 py-3 flex items-center justify-between focus:outline-none transition-colors duration-120"
                          style={{
                            backgroundColor: 'rgba(255,255,255,0.04)',
                            borderBottom: idx < item.items.length - 1 ? '1px solid rgba(212,175,55,0.12)' : 'none',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(212,175,55,0.1)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; }}
                        >
                          <div>
                            <p className="text-sm font-semibold text-white">{sub.label}</p>
                            <p className="text-xs mt-0.5" style={{ color: '#D4AF37', opacity: 0.75 }}>{sub.subtitle}</p>
                          </div>
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="#D4AF37" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                            <polyline points="3 7 11 7" /><polyline points="7 3 11 7 7 11" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            // Direct link (no dropdown)
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.project)}
                className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold focus:outline-none transition-colors duration-150"
                style={{ color: 'rgba(255,255,255,0.85)', letterSpacing: '0.02em' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(212,175,55,0.1)';
                  e.currentTarget.style.color = '#D4AF37';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                }}
              >
                {item.label}
              </button>
            );
          })}

          {/* Mobile CTA */}
          <div className="pt-2">
            <button
              onClick={() => {
                setMobileOpen(false);
                const el = document.querySelector('#contact');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full py-3 rounded-xl text-sm font-bold text-center transition-all duration-150"
              style={{ backgroundColor: '#D4AF37', color: '#002147', letterSpacing: '0.03em' }}
            >
              Get a Quote
            </button>
          </div>
        </div>
      </div>

      {/* Bottom gold divider */}
      <div style={{ backgroundColor: 'rgba(212,175,55,0.25)', height: '1px' }} />
    </header>
  );
}
