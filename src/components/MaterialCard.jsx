import { useProject } from '../context/ProjectContext';
import SupplierBadge from './SupplierBadge';
import { SUPPLIERS } from '../data/materials';

const STATUS_CONFIG = {
  Considering: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', ring: 'ring-yellow-400' },
  Selected: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', ring: 'ring-green-500' },
  Ordered: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', ring: 'ring-blue-500' },
};

const STATUSES = ['Considering', 'Selected', 'Ordered'];

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
    material.finish && `Finish: ${material.finish}`,
    material.size && `Size: ${material.size}`,
    material.material && `Material: ${material.material}`,
    material.style && `Style: ${material.style}`,
    material.brand && `Brand: ${material.brand}`,
    material.type && `Type: ${material.type}`,
    material.width && `Width: ${material.width}`,
    material.thickness && `Thickness: ${material.thickness}`,
    material.pattern && `Pattern: ${material.pattern}`,
    material.includes && `Includes: ${material.includes}`,
    material.rValue && `R-Value: ${material.rValue}`,
  ].filter(Boolean);

  return (
    <div
      className={`bg-white rounded-xl border-2 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden
        ${cfg ? `${cfg.border} ring-2 ${cfg.ring}` : 'border-gray-200'}
      `}
    >
      {/* Color swatch placeholder */}
      <div className="h-28 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative">
        <span className="text-4xl opacity-30 select-none">
          {category === 'tile' || category === 'tile-backsplash' ? '⬜' :
           category === 'flooring' ? '▭' :
           category === 'vanity' ? '🪥' :
           category === 'fixtures' ? '🚿' :
           category === 'shower' ? '🚿' :
           category === 'tub' ? '🛁' :
           category === 'lighting' ? '💡' :
           category === 'cabinets' ? '🗄️' :
           category === 'countertops' ? '⬛' :
           category === 'appliances' ? '🍳' :
           category === 'exterior' ? '🧱' :
           category === 'roofing' ? '🏠' :
           category === 'columns' ? '🏛️' : '📦'}
        </span>
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <SupplierBadge supplierId={material.supplier} />
        </div>
        {currentStatus && (
          <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-bold ${cfg.bg} ${cfg.text} ${cfg.border} border`}>
            {currentStatus}
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col gap-3">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">{supplier?.name}</p>
          <h3 className="font-semibold text-gray-900 text-sm leading-snug">{material.name}</h3>
          {material.sku && <p className="text-xs text-gray-400 mt-0.5">SKU: {material.sku}</p>}
        </div>

        {details.length > 0 && (
          <ul className="space-y-0.5">
            {details.map((d) => (
              <li key={d} className="text-xs text-gray-500">{d}</li>
            ))}
          </ul>
        )}

        <div className="mt-auto pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-lg font-bold text-gray-900">
              ${material.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-gray-400">/ {material.unit}</span>
          </div>

          <div className="flex gap-1.5">
            {STATUSES.map((s) => {
              const c = STATUS_CONFIG[s];
              const active = currentStatus === s;
              return (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`flex-1 text-xs font-medium py-1.5 rounded-lg border transition-all duration-150
                    ${active
                      ? `${c.bg} ${c.text} ${c.border} border shadow-inner`
                      : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                    }`}
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
