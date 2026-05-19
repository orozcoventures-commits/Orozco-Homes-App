import { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { SUPPLIERS } from '../data/materials';
import { supabase } from '../lib/supabase';
import { getBreakdown, hasDimensions, fmtMoney, LABOR_RATES } from '../utils/estimate';

const STATUS_CONFIG = {
  Considering: { activeBg: '#FFFBEB', activeText: '#92400E', activeBorder: '#FCD34D' },
  Selected:    { activeBg: '#ECFDF5', activeText: '#065F46', activeBorder: '#6EE7B7' },
  Ordered:     { activeBg: '#EFF6FF', activeText: '#1E40AF', activeBorder: '#93C5FD' },
};
const STATUSES = ['Considering', 'Selected', 'Ordered'];

const CATEGORY_FALLBACK_BG = {
  tile:              'linear-gradient(145deg, #F5F0EB 0%, #E0D5C8 100%)',
  'tile-backsplash': 'linear-gradient(145deg, #F5F0EB 0%, #E0D5C8 100%)',
  flooring:          'linear-gradient(145deg, #EDE8DC 0%, #D0C8B4 100%)',
  vanity:            'linear-gradient(145deg, #EFF4FA 0%, #C8DBED 100%)',
  fixtures:          'linear-gradient(145deg, #F0F4F0 0%, #C5D8C5 100%)',
  shower:            'linear-gradient(145deg, #EEF4F7 0%, #BACED9 100%)',
  tub:               'linear-gradient(145deg, #F4EEF8 0%, #D5BEE8 100%)',
  lighting:          'linear-gradient(145deg, #FDFBEE 0%, #EDE7A8 100%)',
  cabinets:          'linear-gradient(145deg, #F5EFE8 0%, #D8C5AA 100%)',
  countertops:       'linear-gradient(145deg, #F2F2F0 0%, #CCCCBF 100%)',
  appliances:        'linear-gradient(145deg, #EFF2F5 0%, #C2CDD8 100%)',
  exterior:          'linear-gradient(145deg, #EEF0EC 0%, #C5CCBE 100%)',
  roofing:           'linear-gradient(145deg, #EEECEA 0%, #C4BDAF 100%)',
  columns:           'linear-gradient(145deg, #F2F0ED 0%, #CBC3B5 100%)',
  insulation:        'linear-gradient(145deg, #F5F5F3 0%, #CECDCA 100%)',
  island:            'linear-gradient(145deg, #F5EFEA 0%, #D4C2AE 100%)',
  'custom-millwork': 'linear-gradient(145deg, #F3EDE6 0%, #CCBAA8 100%)',
  'windows-doors':   'linear-gradient(145deg, #EDF2F4 0%, #BCCDD6 100%)',
  accessories:       'linear-gradient(145deg, #F4EFF5 0%, #CFC0D8 100%)',
};

export default function MaterialCard({ material, category }) {
  const { state, dispatch } = useProject();
  const { dimensions, activeDbProject, wasteFactor, overheadPct, profitPct, contractorView, isLocked } = state;
  const selection    = state.selections[material.id];
  const currentStatus = selection?.status ?? null;
  const [imgError, setImgError]       = useState(false);
  const [imgLoaded, setImgLoaded]     = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const breakdown    = getBreakdown(material, category, dimensions, wasteFactor, overheadPct, profitPct);
  const showInstalled = hasDimensions(dimensions) && breakdown.quantity > 0;

  async function setStatus(status) {
    if (isLocked) return;
    dispatch({ type: 'SET_MATERIAL_STATUS', materialId: material.id, status, price: material.price, name: material.name, category });

    if (activeDbProject?.id) {
      const isToggleOff = currentStatus === status;
      if (isToggleOff) {
        supabase.from('material_selections').delete()
          .eq('project_id', activeDbProject.id).eq('material_id', material.id)
          .then(({ error }) => { if (error) console.warn('[MaterialCard] delete:', error.message); });
      } else {
        supabase.from('material_selections').upsert(
          {
            project_id:     activeDbProject.id,
            material_id:    material.id,
            category,
            product_name:   material.name,
            unit_price:     material.price,
            unit_type:      material.unit ?? 'sq ft',
            labor_rate:     LABOR_RATES[category] ?? 0,
            installed_cost: breakdown.clientPrice,
            status,
          },
          { onConflict: 'project_id,material_id' }
        ).then(({ error }) => { if (error) console.warn('[MaterialCard] upsert:', error.message); });
      }
    }
  }

  const supplier   = SUPPLIERS[material.supplier];
  const cfg        = currentStatus ? STATUS_CONFIG[currentStatus] : null;
  const isActive   = !!currentStatus;
  const fallbackBg = CATEGORY_FALLBACK_BG[category] ?? 'linear-gradient(145deg, #F0EEE9 0%, #DDD9D0 100%)';

  const details = [
    material.finish, material.size, material.material,
    material.style, material.brand, material.type,
    material.width, material.thickness, material.pattern,
  ].filter(Boolean);

  return (
    <div
      className="bg-white flex flex-col overflow-hidden transition-all duration-200 rounded-2xl"
      style={{
        border: isActive ? `2px solid ${cfg.activeBorder}` : '1.5px solid #E8E6E1',
        boxShadow: isActive ? '0 8px 24px rgba(0,33,71,0.12)' : '0 2px 10px rgba(0,33,71,0.07)',
        opacity: isLocked && !isActive ? 0.72 : 1,
        position: 'relative',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
      onMouseEnter={(e) => { if (!isActive && !isLocked) e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,33,71,0.13)'; }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.boxShadow = isActive ? '0 8px 24px rgba(0,33,71,0.12)' : '0 2px 10px rgba(0,33,71,0.07)'; }}
    >
      {/* ── Image ── */}
      <div className="relative overflow-hidden flex-shrink-0" style={{ height: '180px', background: fallbackBg }}>
        {material.imageURL && !imgLoaded && !imgError && (
          <div className="absolute inset-0 animate-pulse" style={{ background: fallbackBg }} />
        )}
        {!imgError && material.imageURL && (
          <img src={material.imageURL} alt={material.name} loading="lazy"
            onLoad={() => setImgLoaded(true)} onError={() => setImgError(true)}
            className="w-full h-full transition-opacity duration-300"
            style={{ objectFit: 'cover', objectPosition: 'center', opacity: imgLoaded ? 1 : 0 }}
          />
        )}
        <div className="absolute top-2.5 right-2.5 z-10"><SupplierChip supplierId={material.supplier} /></div>
        {currentStatus && (
          <div className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-full text-xs font-bold"
            style={{ backgroundColor: cfg.activeBg, color: cfg.activeText, border: `1px solid ${cfg.activeBorder}`, fontSize: '0.65rem' }}>
            {currentStatus}
          </div>
        )}
        {isLocked && (
          <div className="absolute bottom-2.5 left-2.5 z-10 px-2 py-0.5 rounded-md"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: 'rgba(212,175,55,0.9)', fontSize: '0.6rem', letterSpacing: '0.06em', backdropFilter: 'blur(4px)', fontWeight: 600 }}>
            LOCKED
          </div>
        )}
        {isActive && <div className="absolute bottom-0 left-0 right-0 z-10" style={{ height: '3px', backgroundColor: '#D4AF37' }} />}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{ height: '50px', background: 'linear-gradient(to top, rgba(0,0,0,0.14) 0%, transparent 100%)' }} />
      </div>

      {/* ── Body ── */}
      <div className="p-4 flex-1 flex flex-col gap-3" style={{ position: 'relative' }}>
        <div>
          <p className="text-xs font-semibold mb-0.5" style={{ color: '#D4AF37', fontSize: '0.65rem', letterSpacing: '0.04em' }}>
            {supplier?.name}
          </p>
          <h3 className="font-semibold leading-snug" style={{ color: '#002147', fontSize: '0.875rem' }}>
            {material.name}
          </h3>
          {material.sku && <p className="text-xs mt-0.5" style={{ color: '#C4B89A', fontSize: '0.65rem' }}>{material.sku}</p>}
        </div>

        {details.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {details.slice(0, 3).map((d) => (
              <span key={d} className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#F5F4F1', color: '#6B7280', fontSize: '0.65rem', fontWeight: 500 }}>
                {d}
              </span>
            ))}
          </div>
        )}

        {/* ── Price section ── */}
        <div className="mt-auto pt-3" style={{ borderTop: '1px solid #F0EEE9' }}>
          {showInstalled ? (
            <div className="mb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p style={{ color: '#9CA3AF', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2px' }}>
                    Total Installed Price
                  </p>
                  <p className="font-bold leading-tight" style={{ color: '#D4AF37', fontSize: '1.25rem' }}>
                    {fmtMoney(breakdown.clientPrice)}
                  </p>
                  <p style={{ color: '#B0A898', fontSize: '0.7rem', marginTop: '2px' }}>
                    {fmtMoney(material.price)} / {material.unit}
                  </p>
                </div>
                <button
                  onClick={() => setShowBreakdown((v) => !v)}
                  title="View price breakdown"
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-150"
                  style={{
                    backgroundColor: showBreakdown ? '#002147' : 'rgba(0,33,71,0.06)',
                    color: showBreakdown ? '#D4AF37' : '#6B7280',
                    border: '1px solid rgba(0,33,71,0.1)',
                    fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
                  }}
                >ⓘ</button>
              </div>
            </div>
          ) : (
            <div className="flex items-baseline justify-between mb-3">
              <span className="font-bold" style={{ color: '#002147', fontSize: '1.15rem' }}>{fmtMoney(material.price)}</span>
              <span style={{ color: '#9CA3AF', fontSize: '0.7rem' }}>/ {material.unit}</span>
            </div>
          )}

          {!showInstalled && (
            <p className="mb-2" style={{ color: '#C4B89A', fontSize: '0.65rem', fontStyle: 'italic' }}>
              Enter dimensions above for installed price
            </p>
          )}

          <div className="flex gap-1.5">
            {STATUSES.map((s) => {
              const active = currentStatus === s;
              const c = STATUS_CONFIG[s];
              return (
                <button key={s} onClick={() => setStatus(s)} disabled={isLocked}
                  className="flex-1 font-semibold py-1.5 rounded-lg transition-all duration-150"
                  style={{
                    fontSize: '0.65rem', letterSpacing: '0.03em',
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    ...(active
                      ? { backgroundColor: c.activeBg, color: c.activeText, border: `1.5px solid ${c.activeBorder}` }
                      : { backgroundColor: '#F9F8F6', color: isLocked ? '#C4B89A' : '#6B7280', border: '1.5px solid #E8E6E1' }),
                  }}
                  onMouseEnter={(e) => { if (!active && !isLocked) { e.currentTarget.style.backgroundColor = c.activeBg; e.currentTarget.style.color = c.activeText; e.currentTarget.style.borderColor = c.activeBorder; } }}
                  onMouseLeave={(e) => { if (!active) { e.currentTarget.style.backgroundColor = '#F9F8F6'; e.currentTarget.style.color = isLocked ? '#C4B89A' : '#6B7280'; e.currentTarget.style.borderColor = '#E8E6E1'; } }}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Breakdown overlay ── */}
        <div
          className="absolute left-0 right-0 bottom-0 rounded-b-2xl overflow-hidden"
          style={{
            top: showBreakdown ? '0' : '100%',
            opacity: showBreakdown ? 1 : 0,
            transform: showBreakdown ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.2s ease, transform 0.2s ease, top 0s linear ' + (showBreakdown ? '0s' : '0.2s'),
            backgroundColor: 'rgba(0,26,57,0.97)',
            zIndex: 20,
            pointerEvents: showBreakdown ? 'auto' : 'none',
            padding: '1.1rem',
          }}
        >
          <button onClick={() => setShowBreakdown(false)}
            className="absolute top-2.5 right-2.5 w-6 h-6 flex items-center justify-center rounded-full text-xs transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.07)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
          >✕</button>

          <p style={{ color: 'rgba(212,175,55,0.7)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            {contractorView ? 'Full Cost Breakdown' : 'Price Breakdown'}
          </p>

          <div className="flex flex-col gap-2">
            <BdRow label="Material" sub={`${breakdown.quantity} ${material.unit}`} value={fmtMoney(breakdown.materialCost)} />
            <BdRow label="Labor"    sub={`$${breakdown.laborRate}/${material.unit}`} value={fmtMoney(breakdown.laborCost)} />
            <BdRow label={`Waste (${breakdown.wastePct}%)`} value={fmtMoney(breakdown.wasteCost)} />

            {/* Hard costs subtotal */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: '2px', paddingTop: '6px' }}>
              <BdRow label="Hard Costs" value={fmtMoney(breakdown.hardCosts)} bold dimLabel />
            </div>

            {/* Contractor-only rows */}
            {contractorView && (
              <>
                <BdRow label={`Overhead (${breakdown.overheadPct}%)`} value={fmtMoney(breakdown.ohAmount)} gold />
                <BdRow label={`Net Profit (${breakdown.profitPct}%)`}  value={fmtMoney(breakdown.profitAmount)} gold />
              </>
            )}

            {/* Total */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '2px', paddingTop: '8px' }}>
              <div className="flex justify-between items-baseline">
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Total Installed Price
                </span>
                <span style={{ color: '#D4AF37', fontSize: '1rem', fontWeight: 700 }}>
                  {fmtMoney(breakdown.clientPrice)}
                </span>
              </div>
            </div>

            {contractorView && (
              <p style={{ color: 'rgba(212,175,55,0.35)', fontSize: '0.58rem', marginTop: '4px' }}>
                Hard Costs ÷ {(1 - breakdown.overheadPct / 100 - breakdown.profitPct / 100).toFixed(2)} (gross margin formula)
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BdRow({ label, sub, value, bold, dimLabel, gold }) {
  return (
    <div className="flex justify-between items-baseline">
      <span style={{ color: dimLabel ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.45)', fontSize: '0.7rem', fontWeight: bold ? 600 : 400 }}>
        {label}
        {sub && <span style={{ marginLeft: '4px', color: 'rgba(255,255,255,0.25)', fontSize: '0.62rem' }}>({sub})</span>}
      </span>
      <span style={{ color: gold ? '#D4AF37' : '#fff', fontSize: bold ? '0.85rem' : '0.8rem', fontWeight: bold ? 700 : 600 }}>
        {value}
      </span>
    </div>
  );
}

function SupplierChip({ supplierId }) {
  const colors = {
    ferguson:    { bg: '#003087', label: 'FG' },
    homedepot:   { bg: '#F96302', label: 'HD' },
    floordecor:  { bg: '#1B5E20', label: 'F&D' },
    lowes:       { bg: '#004990', label: 'LW' },
    wayfair:     { bg: '#7B2D8B', label: 'WF' },
    msisurfaces: { bg: '#8B1A1A', label: 'MSI' },
  };
  const c = colors[supplierId] ?? { bg: '#374151', label: (supplierId ?? '').slice(0, 3).toUpperCase() };
  return (
    <span style={{
      backgroundColor: c.bg, color: '#fff',
      fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.06em',
      padding: '2px 6px', borderRadius: '4px', lineHeight: 1.4, display: 'inline-block',
    }}>{c.label}</span>
  );
}
