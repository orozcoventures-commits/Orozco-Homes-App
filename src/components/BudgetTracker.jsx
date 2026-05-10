import { useProject } from '../context/ProjectContext';

const STATUS_COLORS = {
  Considering: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  Selected: 'text-green-700 bg-green-50 border-green-200',
  Ordered: 'text-blue-700 bg-blue-50 border-blue-200',
};

export default function BudgetTracker() {
  const { state, dispatch } = useProject();
  const entries = Object.values(state.selections);

  if (entries.length === 0) return null;

  const byStatus = entries.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + item.price;
    return acc;
  }, {});

  const total = entries.reduce((sum, item) => sum + item.price, 0);
  const selectedTotal = byStatus['Selected'] ?? 0;
  const orderedTotal = byStatus['Ordered'] ?? 0;
  const committedTotal = selectedTotal + orderedTotal;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm font-semibold text-gray-700">
              {entries.length} item{entries.length !== 1 ? 's' : ''} tracked
            </span>
            {['Considering', 'Selected', 'Ordered'].map((status) => {
              const count = entries.filter((e) => e.status === status).length;
              const amount = byStatus[status] ?? 0;
              if (!count) return null;
              return (
                <div
                  key={status}
                  className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium ${STATUS_COLORS[status]}`}
                >
                  <span>{count}× {status}</span>
                  <span className="font-bold">${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs text-gray-400">Committed (Selected + Ordered)</p>
              <p className="text-xl font-bold text-green-700">
                ${committedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Total Tracked</p>
              <p className="text-xl font-bold text-gray-900">
                ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <button
              onClick={() => dispatch({ type: 'CLEAR_SELECTIONS' })}
              className="text-xs text-red-500 hover:text-red-700 underline"
            >
              Clear all
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
