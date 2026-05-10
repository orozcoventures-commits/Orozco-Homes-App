import { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import SupplierBadge from './SupplierBadge';
import { SUPPLIERS } from '../data/materials';

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
  const selection = state.selections[material.id];
  const currentStatus = selection?.status ?? null;
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  function setStatus(status) {
    dispatch({
      type: 'SET_MATERIAL_STATUS',
      materialId: material.id,
      status,
      price: material.price,
      name: material.name,
      category,
    });
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
        {/* Skeleton shimmer shown until image loads */}
        {!imgLoaded && !imgError && (
          <div
            className="absolute inset-0 animate-pulse"
            style={{ background: fallbackBg }}
          />
        )}

        {/* Actual product image */}
        {!imgError && material.imageUrl && (
          <img
            src={material.imageUrl}
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

        {/* Fallback icon shown if image fails */}
        {imgError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl opacity-20 select-none">🏠</span>
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
      <div className="p-5 flex-1 flex flex-col gap-4">

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
          <div className="flex items-baseline justify-between mb-4">
            <span className="text-xl font-bold" style={{ color: '#002147' }}>
              ${material.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs" style={{ color: '#9CA3AF' }}>/ {material.unit}</span>
          </div>

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
      </div>
    </div>
  );
}
