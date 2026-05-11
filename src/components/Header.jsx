import { useState } from 'react';
import { useProject } from '../context/ProjectContext';

const NAV_LINKS = [
  { label: 'Home',     href: null,        isHome: true },
  { label: 'Features', href: '#features', isHome: false },
  { label: 'Contact',  href: '#contact',  isHome: false },
];

export default function Header() {
  const { dispatch } = useProject();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleHome() {
    dispatch({ type: 'SET_PROJECT', projectId: null });
    setMenuOpen(false);
  }

  function handleNavClick(link) {
    if (link.isHome) {
      handleHome();
    } else {
      setMenuOpen(false);
      const el = document.querySelector(link.href);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  return (
    <header style={{ backgroundColor: '#002147' }} className="sticky top-0 z-50 shadow-lg">
      {/* Top gold accent line */}
      <div style={{ backgroundColor: '#D4AF37', height: '3px' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Brand ──────────────────────────────────────────────── */}
          <button
            onClick={handleHome}
            className="flex items-center gap-3 group focus:outline-none"
            aria-label="Go to home"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md transition-transform duration-150 group-hover:scale-105"
              style={{ backgroundColor: '#D4AF37' }}
            >
              <span style={{ color: '#002147' }} className="font-extrabold text-sm tracking-wide">
                OH
              </span>
            </div>
            <div className="hidden sm:block text-left leading-none">
              <span
                className="block font-bold text-white tracking-wide"
                style={{ fontSize: '1rem', letterSpacing: '0.04em' }}
              >
                Orozco Homes
              </span>
              <span className="block text-white/50 font-light tracking-widest uppercase text-xs mt-0.5">
                Material Selection Portal
              </span>
            </div>
            <span
              className="sm:hidden block font-bold text-white tracking-wide"
              style={{ fontSize: '1rem', letterSpacing: '0.04em' }}
            >
              Orozco Homes
            </span>
          </button>

          {/* ── Desktop nav ────────────────────────────────────────── */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link)}
                className="px-4 py-2 rounded-lg text-sm font-semibold tracking-wide transition-all duration-150 focus:outline-none"
                style={{ color: 'rgba(255,255,255,0.75)', letterSpacing: '0.03em' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#D4AF37';
                  e.currentTarget.style.backgroundColor = 'rgba(212,175,55,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.75)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {link.label}
              </button>
            ))}

            {/* CTA button */}
            <a
              href="#contact"
              onClick={(e) => {
                e.preventDefault();
                const el = document.querySelector('#contact');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="ml-3 px-4 py-2 rounded-lg text-sm font-bold tracking-wide transition-all duration-150 focus:outline-none"
              style={{
                backgroundColor: '#D4AF37',
                color: '#002147',
                letterSpacing: '0.03em',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#C9A227'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#D4AF37'; }}
            >
              Get a Quote
            </a>
          </nav>

          {/* ── Mobile hamburger ───────────────────────────────────── */}
          <button
            className="md:hidden flex flex-col justify-center items-center w-10 h-10 rounded-lg gap-1.5 focus:outline-none transition-colors duration-150"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            style={{ backgroundColor: menuOpen ? 'rgba(212,175,55,0.15)' : 'transparent' }}
          >
            <span
              className="block w-5 h-0.5 rounded-full transition-all duration-200 origin-center"
              style={{
                backgroundColor: '#D4AF37',
                transform: menuOpen ? 'translateY(4px) rotate(45deg)' : 'none',
              }}
            />
            <span
              className="block w-5 h-0.5 rounded-full transition-all duration-200"
              style={{
                backgroundColor: '#D4AF37',
                opacity: menuOpen ? 0 : 1,
              }}
            />
            <span
              className="block w-5 h-0.5 rounded-full transition-all duration-200 origin-center"
              style={{
                backgroundColor: '#D4AF37',
                transform: menuOpen ? 'translateY(-4px) rotate(-45deg)' : 'none',
              }}
            />
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ──────────────────────────────────────────── */}
      <div
        className="md:hidden overflow-hidden transition-all duration-300"
        style={{ maxHeight: menuOpen ? '280px' : '0px' }}
      >
        <div
          className="px-4 pb-4 pt-2 flex flex-col gap-1"
          style={{ borderTop: '1px solid rgba(212,175,55,0.2)' }}
        >
          {NAV_LINKS.map((link) => (
            <button
              key={link.label}
              onClick={() => handleNavClick(link)}
              className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all duration-150 focus:outline-none"
              style={{ color: 'rgba(255,255,255,0.8)', letterSpacing: '0.03em' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(212,175,55,0.12)';
                e.currentTarget.style.color = '#D4AF37';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
              }}
            >
              {link.label}
            </button>
          ))}
          <a
            href="#contact"
            onClick={(e) => {
              e.preventDefault();
              setMenuOpen(false);
              const el = document.querySelector('#contact');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="mt-2 w-full text-center px-4 py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-150"
            style={{ backgroundColor: '#D4AF37', color: '#002147', letterSpacing: '0.03em' }}
          >
            Get a Quote
          </a>
        </div>
      </div>

      {/* Bottom subtle divider */}
      <div style={{ backgroundColor: 'rgba(212,175,55,0.25)', height: '1px' }} />
    </header>
  );
}
