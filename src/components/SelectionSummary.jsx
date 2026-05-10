import { useProject } from '../context/ProjectContext';
import { MATERIAL_CATEGORY_LABELS } from '../data/projectTypes';
import { SUPPLIERS } from '../data/materials';
import SupplierBadge from './SupplierBadge';

const STATUS_CONFIG = {
  Considering: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200', dot: 'bg-yellow-400' },
  Selected: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200', dot: 'bg-green-500' },
  Ordered: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', dot: 'bg-blue-500' },
};

export default function SelectionSummary() {
  const { state, dispatch } = useProject();
  const entries = Object.entries(state.selections);

  if (entries.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-5xl mb-4">📋</p>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No materials selected yet</h3>
        <p className="text-gray-400 text-sm">
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
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                <h3 className="font-semibold text-gray-800">{status}</h3>
                <span className="text-sm text-gray-400">({items.length} item{items.length !== 1 ? 's' : ''})</span>
              </div>
              <span className={`text-sm font-bold px-3 py-1 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                Subtotal: ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border ${cfg.border} ${cfg.bg}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${cfg.text} truncate`}>{item.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {MATERIAL_CATEGORY_LABELS[item.category] ?? item.category}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 ml-4 shrink-0">
                    <span className={`text-sm font-bold ${cfg.text}`}>
                      ${item.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <button
                      onClick={() => dispatch({ type: 'SET_MATERIAL_STATUS', materialId: item.id, status: item.status })}
                      className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
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

      {/* Totals */}
      <div className="mt-8 border-t border-gray-200 pt-6 space-y-3">
        <div className="flex justify-between text-sm text-gray-500">
          <span>Total tracked ({entries.length} items)</span>
          <span className="font-semibold text-gray-900">
            ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between text-base font-bold">
          <span className="text-gray-700">Committed budget (Selected + Ordered)</span>
          <span className="text-green-700">
            ${committedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <p className="text-xs text-gray-400">
          * Prices are per-unit estimates (per sq ft, each, per linear ft). Final totals depend on quantity.
          A full estimate will be provided by Orozco Homes during consultation.
        </p>
      </div>
    </div>
  );
}
