import { useProject } from '../context/ProjectContext';
import SupplierBadge from './SupplierBadge';
import { SUPPLIERS } from '../data/materials';

const STATUS_CONFIG = {
  Considering: {
    bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300',
    ring: 'ring-amber-400', activeBg: '#FFFBEB', activeText: '#92400E', activeBorder: '#FCD34D',
  },
  Selected: {
    bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-300',
    ring: 'ring-green-500', activeBg: '#ECFDF5', activeText: '#065F46', activeBorder: '#6EE7B7',
  },
  Ordered: {
    bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300',
    ring: 'ring-blue-500', activeBg: '#EFF6FF', activeText: '#1E40AF', activeBorder: '#93C5FD',
  },
};

const STATUSES = ['Considering', 'Selected', 'Ordered'];

const CATEGORY_ICONS = {
  tile: '▦', 'tile-backsplash': '▦', flooring: '▬',
  vanity: '🪞', fixtures: '🚿', shower: '🚿', tub: '🛁',
  lighting: '💡', cabinets: '🗄', countertops: '◼',
  appliances: '🍳', exterior: '🧱', roofing: '⌂',
  columns: '🏛', insulation: '◫', island: '🪵',
  'custom-millwork': '🪵', 'windows-doors': '🪟', accessories: '🪬',
};

export default function MaterialCard({ material, category }) {
  const { state, dispatch } = useProject();
  const selection = state.selections[material.id];
  const currentStatus = selection?.status ?? null;

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

  const isActive = !!currentStatus;

  return (
    <div
      className="bg-white flex flex-col overflow-hidden transition-all duration-200 rounded-2xl"
      style={{
        border: isActive ? `2px solid ${STATUS_CONFIG[currentStatus].activeBorder}` : '1.5px solid #E8E6E1',
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
      {/* Card top — icon area */}
      <div
        className="h-32 flex items-center justify-center relative"
        style={{ background: 'linear-gradient(135deg, #F0EEE9 0%, #E8E5DF 100%)' }}
      >
        <span className="text-5xl opacity-20 select-none leading-none">
          {CATEGORY_ICONS[category] ?? '📦'}
        </span>

        {/* Supplier badge */}
        <div className="absolute top-3 right-3">
          <SupplierBadge supplierId={material.supplier} />
        </div>

        {/* Status pill */}
        {currentStatus && (
          <div
            className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-xs font-bold"
            style={{
              backgroundColor: STATUS_CONFIG[currentStatus].activeBg,
              color: STATUS_CONFIG[currentStatus].activeText,
              border: `1px solid ${STATUS_CONFIG[currentStatus].activeBorder}`,
            }}
          >
            {currentStatus}
          </div>
        )}

        {/* Gold bottom border accent when active */}
        {isActive && (
          <div
            className="absolute bottom-0 left-0 right-0 h-0.5"
            style={{ backgroundColor: '#D4AF37' }}
          />
        )}
      </div>

      {/* Card body */}
      <div className="p-5 flex-1 flex flex-col gap-4">
        {/* Supplier + name */}
        <div>
          <p className="text-xs font-medium mb-1 tracking-wide" style={{ color: '#D4AF37' }}>
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
            <span
              className="text-xl font-bold"
              style={{ color: '#002147' }}
            >
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
