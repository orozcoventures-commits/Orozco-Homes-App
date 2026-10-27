// src/pages/PublicWelcomePackage.jsx — the Welcome & Capabilities Package as
// clients see it from the link /welcome (no login; migration 062): the last
// saved version, or the original one if it was never saved.
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { welcomePackageHtml } from '../utils/welcomePackage';

const NAVY = '#002147';
const GOLD = '#D4AF37';

export default function PublicWelcomePackage() {
  const [html, setHtml] = useState(null);
  const frame = useRef(null);

  useEffect(() => {
    document.title = 'Welcome Package · Orozco Homes';
    supabase.rpc('get_public_welcome_package').then(({ data }) => {
      // On any error the original version is shown, so the link always works.
      setHtml(welcomePackageHtml(data ?? null, { logoUrl: `${window.location.origin}/orozco-homes-logo.png` }));
    });
  }, []);

  if (!html) return <p className="text-center text-sm py-20" style={{ color: '#9CA3AF' }}>Loading…</p>;
  return (
    <div className="flex flex-col" style={{ height: '100dvh' }}>
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 shrink-0" style={{ backgroundColor: NAVY, borderBottom: `3px solid ${GOLD}` }}>
        <span className="text-sm font-bold text-white">Orozco Homes · Welcome Package</span>
        <button type="button" onClick={() => frame.current?.contentWindow?.print()}
          className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ backgroundColor: GOLD, color: NAVY }}>
          Print / Save PDF
        </button>
      </div>
      <iframe ref={frame} title="Orozco Homes Welcome Package" srcDoc={html} className="flex-1 w-full border-0" />
    </div>
  );
}
