import { useProject } from '../context/ProjectContext';
import { MATERIAL_CATEGORY_LABELS } from '../data/projectTypes';

const STATUS_CONFIG = {
  Considering: {
    bg: '#FFFBEB', text: '#92400E', border: '#FCD34D', dot: '#F59E0B',
  },
  Selected: {
    bg: '#ECFDF5', text: '#065F46', border: '#6EE7B7', dot: '#10B981',
  },
  Ordered: {
    bg: '#EFF6FF', text: '#1E40AF', border: '#93C5FD', dot: '#3B82F6',
  },
};

export default function SelectionSummary() {
  const { state, dispatch } = useProject();
  const entries = Object.entries(state.selections);

  if (entries.length === 0) {
    return (
      <div className="text-center py-24">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5 shadow-sm"
          style={{ backgroundColor: 'rgba(0,33,71,0.06)' }}
        >
          📋
        </div>
        <h3 className="font-semibold text-lg mb-2" style={{ color: '#002147' }}>
          No materials selected yet
        </h3>
        <p className="text-sm" style={{ color: '#4A4A4A' }}>
          Go to <strong>Materials</strong> and mark items as Considering, Selected, or Ordered.
        </p>
      </div>
    );
  }

  const byStatus = entries.reduce((acc, [id, item]) => {
    if (!acc[item.status]) acc[item.status] = [];
    acc[item.status].push({ id, ...item });
    return acc;
  }, {});

  const total = entries.reduce((sum, [, item]) => sum + item.price, 0);
  const committedTotal = entries
    .filter(([, item]) => item.status === 'Selected' || item.status === 'Ordered')
    .reduce((sum, [, item]) => sum + item.price, 0);

  return (
    <div className="pb-36">
      {['Ordered', 'Selected', 'Considering'].map((status) => {
        const items = byStatus[status];
        if (!items) return null;
        const cfg = STATUS_CONFIG[status];
        const subtotal = items.reduce((s, i) => s + i.price, 0);

        return (
          <div key={status} className="mb-8">
            {/* Status group header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
                <h3 className="font-bold tracking-wide text-sm" style={{ color: '#002147' }}>
                  {status}
                </h3>
                <span className="text-xs" style={{ color: '#9CA3AF' }}>
                  ({items.length} item{items.length !== 1 ? 's' : ''})
                </span>
              </div>
              <span
                className="text-xs font-bold px-3 py-1 rounded-full"
                style={{ backgroundColor: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
              >
                ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Item rows */}
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-5 py-3.5 rounded-xl"
                  style={{
                    backgroundColor: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: cfg.text }}>
                      {item.name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                      {MATERIAL_CATEGORY_LABELS[item.category] ?? item.category}
                    </p>
                  </div>
                  <div className="flex items-center gap-5 ml-4 shrink-0">
                    <span className="text-sm font-bold" style={{ color: cfg.text }}>
                      ${item.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <button
                      onClick={() =>
                        dispatch({ type: 'SET_MATERIAL_STATUS', materialId: item.id, status: item.status })
                      }
                      className="text-lg leading-none transition-colors duration-150"
                      style={{ color: 'rgba(0,0,0,0.2)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(0,0,0,0.2)'; }}
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Totals block */}
      <div
        className="mt-8 pt-6 space-y-4 rounded-2xl p-6"
        style={{ border: '1.5px solid #E8E6E1', backgroundColor: '#fff' }}
      >
        <div className="flex justify-between text-sm" style={{ color: '#4A4A4A' }}>
          <span>Total tracked ({entries.length} items)</span>
          <span className="font-bold" style={{ color: '#002147' }}>
            ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div
          className="flex justify-between text-base font-bold pt-3"
          style={{ borderTop: '1px solid #E8E6E1' }}
        >
          <span style={{ color: '#002147' }}>Committed budget</span>
          <span style={{ color: '#D4AF37', fontSize: '1.2rem' }}>
            ${committedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <p className="text-xs" style={{ color: '#9CA3AF' }}>
          * Per-unit estimates only. Final project cost depends on quantities and labor.
          A detailed estimate will be provided during your Orozco Homes consultation.
        </p>
      </div>
    </div>
  );
}
