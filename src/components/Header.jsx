export default function Header({ onMenuToggle }) {
  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-3 px-4 sm:px-6 h-14 shrink-0"
      style={{
        backgroundColor: '#fff',
        borderBottom: '1px solid #E8E6E1',
        boxShadow: '0 1px 8px rgba(0,33,71,0.06)',
      }}
    >
      {/* Mobile hamburger */}
      <button
        onClick={onMenuToggle}
        className="md:hidden flex flex-col justify-center items-center w-9 h-9 rounded-lg gap-1.5 focus:outline-none transition-colors duration-150 shrink-0"
        style={{ backgroundColor: 'rgba(0,33,71,0.05)' }}
        aria-label="Open navigation"
      >
        <span className="block w-4.5 h-0.5 rounded-full" style={{ backgroundColor: '#002147' }} />
        <span className="block w-4.5 h-0.5 rounded-full" style={{ backgroundColor: '#002147' }} />
        <span className="block w-4.5 h-0.5 rounded-full" style={{ backgroundColor: '#002147' }} />
      </button>

      {/* Brand title */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="md:hidden w-7 h-7 rounded-md flex items-center justify-center shrink-0"
          style={{ backgroundColor: '#D4AF37' }}
        >
          <span style={{ color: '#002147', fontSize: '0.65rem' }} className="font-extrabold tracking-wide">OH</span>
        </div>
        <div className="min-w-0">
          <h1
            className="font-bold leading-none truncate"
            style={{ color: '#002147', fontSize: '0.95rem', letterSpacing: '0.03em' }}
          >
            Orozco Homes
            <span style={{ color: '#D4AF37' }} className="mx-1.5 font-light">|</span>
            <span className="font-light" style={{ color: '#4A4A4A' }}>Material Selection Portal</span>
          </h1>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Get a Quote CTA */}
      <a
        href="#contact"
        onClick={(e) => {
          e.preventDefault();
          const el = document.querySelector('#contact');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        className="hidden sm:flex items-center px-4 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all duration-150 shrink-0"
        style={{ backgroundColor: '#D4AF37', color: '#002147', letterSpacing: '0.04em' }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#C9A227'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#D4AF37'; }}
      >
        Get a Quote
      </a>
    </header>
  );
}
