// Labor rates in $/unit for each material category
export const LABOR_RATES = {
  tile:              8.00,
  'tile-backsplash': 7.00,
  flooring:          4.50,
  shower:           10.00,
  countertops:      25.00,
  vanity:          150.00,
  fixtures:        125.00,
  tub:             275.00,
  lighting:        100.00,
  cabinets:        200.00,
  'custom-millwork':180.00,
  island:          175.00,
  'windows-doors': 150.00,
  accessories:      50.00,
  exterior:          5.00,
  roofing:           3.50,
  insulation:        2.00,
  columns:         200.00,
  appliances:      125.00,
};

// Which dimension field to use as quantity per category
const DIMENSION_MAP = {
  tile:              'wall_sqft',
  'tile-backsplash': 'wall_sqft',
  flooring:          'floor_sqft',
  shower:            'wall_sqft',
  countertops:       'linear_feet',
  exterior:          'wall_sqft',
  roofing:           'floor_sqft',
  insulation:        'floor_sqft',
};

// Returns the quantity for a category given room dimensions
export function getQuantity(category, dims) {
  const key = DIMENSION_MAP[category];
  if (!key) return 1; // unit-priced items (vanity, fixture, etc.)
  return Math.max(0, Number(dims?.[key]) || 0);
}

// Returns true if any dimension is > 0
export function hasDimensions(dims) {
  return dims && (Number(dims.floor_sqft) > 0 || Number(dims.wall_sqft) > 0 || Number(dims.linear_feet) > 0);
}

// Core formula: fully installed project cost with waste
export function calculateLineItem(materialPrice, laborRate, quantity, wasteFactor = 0.15) {
  if (quantity <= 0) return 0;
  return (materialPrice + laborRate) * quantity * (1 + wasteFactor);
}

// Returns a complete breakdown object for a material
export function getBreakdown(material, category, dims) {
  const laborRate   = LABOR_RATES[category] ?? 0;
  const quantity    = getQuantity(category, dims);
  const wasteFactor = 0.15;
  const isUnit      = !DIMENSION_MAP[category];

  const materialCost = material.price * quantity;
  const laborCost    = laborRate * quantity;
  const subtotal     = materialCost + laborCost;
  const wasteCost    = subtotal * wasteFactor;
  const total        = subtotal + wasteCost;

  return { materialCost, laborCost, wasteCost, total, quantity, laborRate, wasteFactor, isUnit };
}

export function fmtMoney(n) {
  return '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
