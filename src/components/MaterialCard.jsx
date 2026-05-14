import { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import SupplierBadge from './SupplierBadge';
import { SUPPLIERS } from '../data/materials';
import { supabase } from '../lib/supabase';
import { getBreakdown, hasDimensions, fmtMoney, LABOR_RATES } from '../utils/estimate';

const STATUS_CONFIG = {
  Considering: {
    activeBg: '#FFFBEB', activeText: '#92400E', activeBorder: '#FCD34D',
  },
  Selected: {
    activeBg: '#ECFDF5', activeText: '#065F46', activeBorder: '#6EE7B7',
  },
  Ordered: {
    activeBg: '#EFF6FF', activeText: '#1E40AF', activeBorder: '#93C5FD',
  },
};

const STATUSES = ['Considering', 'Selected', 'Ordered'];

// Fallback gradient shown while image loads or if it fails to load
const CATEGORY_FALLBACK_BG = {
  tile:              'linear-gradient(135deg, #F5F0EB 0%, #E8E0D5 100%)',
  'tile-backsplash': 'linear-gradient(135deg, #F5F0EB 0%, #E8E0D5 100%)',
  flooring:          'linear-gradient(135deg, #EDE8DC 0%, #D9D0C0 100%)',
  vanity:            'linear-gradient(135deg, #EFF4FA 0%, #D9E6F5 100%)',
  fixtures:          'linear-gradient(135deg, #F0F4F0 0%, #D5E3D5 100%)',
  shower:            'linear-gradient(135deg, #EEF4F7 0%, #CCE0EB 100%)',
  tub:               'linear-gradient(135deg, #F4EEF8 0%, #E2D0EE 100%)',
  lighting:          'linear-gradient(135deg, #FDFBEE 0%, #F5EFC5 100%)',
  cabinets:          'linear-gradient(135deg, #F5EFE8 0%, #E5D9C8 100%)',
  countertops:       'linear-gradient(135deg, #F2F2F0 0%, #DCDCD5 100%)',
  'appliances':      'linear-gradient(135deg, #EFF2F5 0%, #D5DDE8 100%)',
  exterior:          'linear-gradient(135deg, #EEF0EC 0%, #D5DAD0 100%)',
  roofing:           'linear-gradient(135deg, #EEECEA 0%, #D8D3CC 100%)',
  columns:           'linear-gradient(135deg, #F2F0ED 0%, #DDD8D0 100%)',
  insulation:        'linear-gradient(135deg, #F5F5F3 0%, #E0DFDB 100%)',
  island:            'linear-gradient(135deg, #F5EFEA 0%, #E2D5C8 100%)',
  'custom-millwork': 'linear-gradient(135deg, #F3EDE6 0%, #DDD0C0 100%)',
  'windows-doors':   'linear-gradient(135deg, #EDF2F4 0%, #D0DCE3 100%)',
  accessories:       'linear-gradient(135deg, #F4EFF5 0%, #E0D3E8 100%)',
};

export default function MaterialCard({ material, category }) {
  const { state, dispatch } = useProject();
  const { dimensions, activeDbProject } = state;
  const selection = state.selections[material.id];
  const currentStatus = selection?.status ?? null;
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Calculate installed cost breakdown
  const breakdown = getBreakdown(material, category, dimensions);
  const dims = dimensions;
  const showInstalled = hasDimensions(dims) && breakdown.quantity > 0;

  async function setStatus(status) {
    // Optimistic dispatch first
    dispatch({
      type: 'SET_MATERIAL_STATUS',
      materialId: material.id,
      status,
      price: material.price,
      name: material.name,
      category,
    });

    // DB persistence (fire-and-forget)
    if (activeDbProject?.id) {
      const isToggleOff = currentStatus === status;
      if (isToggleOff) {
        // Delete from material_selections
        supabase
          .from('material_selections')
          .delete()
          .eq('project_id', activeDbProject.id)
          .eq('material_id', material.id)
          .then(({ error }) => {
            if (error) console.warn('[MaterialCard] delete selection error:', error.message);
          });
      } else {
        // Upsert
        supabase
          .from('material_selections')
          .upsert(
            {
              project_id:    activeDbProject.id,
              material_id:   material.id,
              category,
              product_name:  material.name,
              unit_price:    material.price,
              unit_type:     material.unit ?? 'sq ft',
              labor_rate:    LABOR_RATES[category] ?? 0,
              installed_cost: breakdown.total,
              status,
            },
            { onConflict: 'project_id,material_id' }
          )
          .then(({ error }) => {
            if (error) console.warn('[MaterialCard] upsert selection error:', error.message);
          });
      }
    }
  }

  const supplier = SUPPLIERS[material.supplier];
  const cfg = currentStatus ? STATUS_CONFIG[currentStatus] : null;
  const isActive = !!currentStatus;
  const fallbackBg = CATEGORY_FALLBACK_BG[category] ?? 'linear-gradient(135deg, #F0EEE9 0%, #E8E5DF 100%)';

  const details = [
    material.finish    && `${material.finish}`,
    material.size      && `${material.size}`,
    material.material  && `${material.material}`,
    material.style     && `${material.style}`,
    material.brand     && `${material.brand}`,
    material.type      && `${material.type}`,
    material.width     && `${material.width}`,
    material.thickness && `${material.thickness}`,
    material.pattern   && `${material.pattern}`,
  ].filter(Boolean);

  return (
    <div
      className="bg-white flex flex-col overflow-hidden transition-all duration-200 rounded-2xl"
      style={{
        border: isActive ? `2px solid ${cfg.activeBorder}` : '1.5px solid #E8E6E1',
        boxShadow: isActive
          ? '0 8px 24px rgba(0,33,71,0.12)'
          : '0 2px 10px rgba(0,33,71,0.07)',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,33,71,0.13)';
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,33,71,0.07)';
      }}
    >
      {/* ── Product image ──────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden flex-shrink-0"
        style={{
          height: '200px',
          background: fallbackBg,
        }}
      >
        {/* Skeleton shimmer shown while a real image is loading */}
        {material.imageURL && !imgLoaded && !imgError && (
          <div
            className="absolute inset-0 animate-pulse"
            style={{ background: fallbackBg }}
          />
        )}

        {/* Actual product image */}
        {!imgError && material.imageURL && (
          <img
            src={material.imageURL}
            alt={material.name}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            className="w-full h-full transition-opacity duration-300"
            style={{
              objectFit: 'cover',
              objectPosition: 'center',
              opacity: imgLoaded ? 1 : 0,
            }}
          />
        )}

        {/* Professional "No Image Available" box shown when imageURL is empty or fails */}
        {(imgError || !material.imageURL) && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2"
            style={{ background: fallbackBg }}
          >
            <svg
              width="36" height="36" viewBox="0 0 24 24" fill="none"
              stroke="#002147" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"
              style={{ opacity: 0.25 }}
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span
              className="text-xs font-semibold tracking-wide uppercase"
              style={{ color: '#002147', opacity: 0.3, letterSpacing: '0.08em' }}
            >
              No Image Available
            </span>
          </div>
        )}

        {/* Supplier badge — top right */}
        <div className="absolute top-3 right-3 z-10">
          <SupplierBadge supplierId={material.supplier} />
        </div>

        {/* Status pill — top left */}
        {currentStatus && (
          <div
            className="absolute top-3 left-3 z-10 px-2.5 py-0.5 rounded-full text-xs font-bold"
            style={{
              backgroundColor: cfg.activeBg,
              color: cfg.activeText,
              border: `1px solid ${cfg.activeBorder}`,
              backdropFilter: 'blur(4px)',
            }}
          >
            {currentStatus}
          </div>
        )}

        {/* Gold active bottom line */}
        {isActive && (
          <div
            className="absolute bottom-0 left-0 right-0 z-10"
            style={{ height: '3px', backgroundColor: '#D4AF37' }}
          />
        )}

        {/* Subtle dark gradient at the bottom for text legibility */}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{
            height: '60px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.18) 0%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* ── Card body ─────────────────────────────────────────────────────── */}
      <div className="p-5 flex-1 flex flex-col gap-4" style={{ position: 'relative' }}>

        {/* Supplier name + product name + SKU */}
        <div>
          <p className="text-xs font-semibold mb-1 tracking-wide" style={{ color: '#D4AF37' }}>
            {supplier?.name}
          </p>
          <h3
            className="font-semibold leading-snug"
            style={{ color: '#002147', fontSize: '0.9rem', letterSpacing: '0.01em' }}
          >
            {material.name}
          </h3>
          {material.sku && (
            <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>SKU: {material.sku}</p>
          )}
        </div>

        {/* Detail chips */}
        {details.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {details.slice(0, 4).map((d) => (
              <span
                key={d}
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#F0EEE9', color: '#4A4A4A' }}
              >
                {d}
              </span>
            ))}
          </div>
        )}

        {/* Price + status buttons */}
        <div className="mt-auto pt-4" style={{ borderTop: '1px solid #F0EEE9' }}>
          {showInstalled ? (
            /* ── Installed cost mode ── */
            <div className="mb-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold tracking-wide mb-0.5" style={{ color: '#9CA3AF' }}>
                    Fully Installed
                  </p>
                  <p className="text-xl font-bold leading-tight" style={{ color: '#D4AF37' }}>
                    {fmtMoney(breakdown.total)}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                    {fmtMoney(material.price)} / {material.unit}
                  </p>
                </div>
                {/* Info button to toggle breakdown */}
                <button
                  onClick={() => setShowBreakdown((v) => !v)}
                  title="View price breakdown"
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors duration-150"
                  style={{
                    backgroundColor: showBreakdown ? '#002147' : 'rgba(0,33,71,0.07)',
                    color: showBreakdown ? '#D4AF37' : '#002147',
                    border: '1.5px solid rgba(0,33,71,0.12)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ⓘ
                </button>
              </div>
            </div>
          ) : (
            /* ── Per-unit price mode ── */
            <div className="flex items-baseline justify-between mb-4">
              <span className="text-xl font-bold" style={{ color: '#002147' }}>
                ${material.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs" style={{ color: '#9CA3AF' }}>/ {material.unit}</span>
            </div>
          )}

          {/* Hint when no dimensions */}
          {!showInstalled && (
            <p className="text-xs mb-3" style={{ color: '#C4B89A', fontStyle: 'italic' }}>
              Add dimensions above for installed cost
            </p>
          )}

          <div className="flex gap-1.5">
            {STATUSES.map((s) => {
              const active = currentStatus === s;
              const c = STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className="flex-1 text-xs font-semibold py-2 rounded-lg transition-all duration-150"
                  style={
                    active
                      ? { backgroundColor: c.activeBg, color: c.activeText, border: `1.5px solid ${c.activeBorder}` }
                      : { backgroundColor: '#F9F8F6', color: '#6B7280', border: '1.5px solid #E8E6E1' }
                  }
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = c.activeBg;
                      e.currentTarget.style.color = c.activeText;
                      e.currentTarget.style.borderColor = c.activeBorder;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = '#F9F8F6';
                      e.currentTarget.style.color = '#6B7280';
                      e.currentTarget.style.borderColor = '#E8E6E1';
                    }
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Breakdown Overlay ─────────────────────────────────────────── */}
        <div
          className="absolute left-0 right-0 bottom-0 rounded-b-2xl overflow-hidden"
          style={{
            top: showBreakdown ? '0' : '100%',
            opacity: showBreakdown ? 1 : 0,
            transform: showBreakdown ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.22s ease, transform 0.22s ease, top 0s linear ' + (showBreakdown ? '0s' : '0.22s'),
            backgroundColor: 'rgba(0,33,71,0.97)',
            zIndex: 20,
            pointerEvents: showBreakdown ? 'auto' : 'none',
            backdropFilter: 'blur(4px)',
            padding: '1.25rem',
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setShowBreakdown(false)}
            className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold transition-colors"
            style={{ color: 'rgba(255,255,255,0.5)', backgroundColor: 'rgba(255,255,255,0.08)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
          >
            ✕
          </button>

          <p
            className="text-xs font-bold tracking-widest uppercase mb-4"
            style={{ color: 'rgba(212,175,55,0.8)' }}
          >
            Price Breakdown
          </p>

          <div className="flex flex-col gap-2">
            {/* Material row */}
            <div className="flex justify-between items-baseline">
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Material
                <span className="ml-1 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  ({breakdown.quantity} {material.unit})
                </span>
              </span>
              <span className="text-sm font-semibold" style={{ color: '#fff' }}>
                {fmtMoney(breakdown.materialCost)}
              </span>
            </div>

            {/* Labor row */}
            <div className="flex justify-between items-baseline">
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Labor
                <span className="ml-1 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  (${breakdown.laborRate}/{material.unit})
                </span>
              </span>
              <span className="text-sm font-semibold" style={{ color: '#fff' }}>
                {fmtMoney(breakdown.laborCost)}
              </span>
            </div>

            {/* Waste row */}
            <div className="flex justify-between items-baseline">
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
                15% Waste Factor
              </span>
              <span className="text-sm font-semibold" style={{ color: '#fff' }}>
                {fmtMoney(breakdown.wasteCost)}
              </span>
            </div>

            {/* Divider */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '4px', paddingTop: '4px' }} />

            {/* Total */}
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-bold tracking-wide uppercase" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Total Installed
              </span>
              <span className="text-base font-bold" style={{ color: '#D4AF37' }}>
                {fmtMoney(breakdown.total)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
