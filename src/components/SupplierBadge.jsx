import { SUPPLIERS } from '../data/materials';

export default function SupplierBadge({ supplierId }) {
  const supplier = SUPPLIERS[supplierId];
  if (!supplier) return null;

  const colorMap = {
    ferguson: 'bg-blue-900 text-white',
    homedepot: 'bg-orange-500 text-white',
    floordecor: 'bg-green-800 text-white',
    lowes: 'bg-blue-700 text-white',
    wayfair: 'bg-purple-700 text-white',
    msisurfaces: 'bg-red-800 text-white',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${colorMap[supplierId] ?? 'bg-gray-500 text-white'}`}
      title={supplier.specialty}
    >
      {supplier.logo}
    </span>
  );
}
