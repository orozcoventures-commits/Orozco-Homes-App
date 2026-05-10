export default function Header() {
  return (
    <header style={{ backgroundColor: '#002147' }} className="sticky top-0 z-50 shadow-lg">
      {/* Top gold accent line */}
      <div style={{ backgroundColor: '#D4AF37', height: '3px' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Centered branding */}
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="flex items-center gap-3">
            {/* Monogram badge */}
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md"
              style={{ backgroundColor: '#D4AF37' }}
            >
              <span style={{ color: '#002147' }} className="font-extrabold text-sm tracking-wide">
                OH
              </span>
            </div>
            <h1
              className="text-xl sm:text-2xl font-bold tracking-wide text-white leading-none"
              style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '0.04em' }}
            >
              Orozco Homes
              <span style={{ color: '#D4AF37' }} className="mx-2 font-light">|</span>
              <span className="font-light text-white/90">Material Selection Portal</span>
            </h1>
          </div>
          <p className="text-xs text-white/50 tracking-widest uppercase font-medium">
            Ferguson · Home Depot · Floor &amp; Decor · Lowe's · Wayfair · MSI
          </p>
        </div>
      </div>

      {/* Bottom subtle divider */}
      <div style={{ backgroundColor: 'rgba(212,175,55,0.25)', height: '1px' }} />
    </header>
  );
}
