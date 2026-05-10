// =============================================================================
// src/materialsData.js  —  Orozco Homes Material Selection Portal
// =============================================================================
//
// This is your master material list. Every item has an `imageURL` field.
//
// HOW TO ADD A PHOTO:
//   1. Find the item by name or `id` below.
//   2. Paste the direct image URL inside the quotes for `imageURL`.
//
//   Example (Home Depot product photo):
//     imageURL: 'https://images.homedepot.com/productImages/abc123_1000.jpg',
//
//   Example (Ferguson product photo):
//     imageURL: 'https://media.ferguson.com/assets/product/abc_l.jpg',
//
//   Tip: On any retailer site, right-click the product image
//   → "Copy image address" and paste it here.
//
// HOW TO ADD A NEW MATERIAL:
//   Copy any existing entry, give it a unique `id`, fill in the fields,
//   and set `category` to match one of the existing category values.
// =============================================================================

const materialsData = [

  // ─── WALL & FLOOR TILE ───────────────────────────────────────────────────

  {
    id:        'tile-subway-white',
    category:  'tile',
    name:      'Classic White Subway Tile',
    supplier:  'floordecor',
    sku:       'FD-TL-1001',
    price:     2.49,
    unit:      'sq ft',
    finish:    'Glossy',
    size:      '3x6"',
    material:  'Ceramic',
    imageURL:  '',  // ← paste product photo URL here
  },
  {
    id:        'tile-marble-calacatta',
    category:  'tile',
    name:      'Calacatta Gold Marble Tile',
    supplier:  'floordecor',
    sku:       'FD-TL-2048',
    price:     12.99,
    unit:      'sq ft',
    finish:    'Polished',
    size:      '12x24"',
    material:  'Natural Marble',
    imageURL:  '',  // ← paste product photo URL here
  },
  {
    id:        'tile-porcelain-wood-look',
    category:  'tile',
    name:      'Woodgrain Porcelain Plank',
    supplier:  'floordecor',
    sku:       'FD-TL-3310',
    price:     3.79,
    unit:      'sq ft',
    finish:    'Matte',
    size:      '6x36"',
    material:  'Porcelain',
    imageURL:  '',  // ← paste product photo URL here
  },
  {
    id:        'tile-hexagon-matte',
    category:  'tile',
    name:      'Matte Cement Hex Tile',
    supplier:  'floordecor',
    sku:       'FD-TL-5521',
    price:     5.49,
    unit:      'sq ft',
    finish:    'Matte',
    size:      '4" Hex',
    material:  'Porcelain',
    imageURL:  '',  // ← paste product photo URL here
  },
  {
    id:        'tile-large-format-gray',
    category:  'tile',
    name:      'Slate Gray Large Format',
    supplier:  'homedepot',
    sku:       'HD-TL-6677',
    price:     4.99,
    unit:      'sq ft',
    finish:    'Matte',
    size:      '24x48"',
    material:  'Porcelain',
    imageURL:  '',  // ← paste product photo URL here
  },
  {
    id:        'tile-travertine',
    category:  'tile',
    name:      'Travertine Natural Stone',
    supplier:  'msisurfaces',
    sku:       'MSI-TL-9012',
    price:     8.49,
    unit:      'sq ft',
    finish:    'Tumbled',
    size:      '12x12"',
    material:  'Travertine',
    imageURL:  '',  // ← paste product photo URL here
  },
  {
    id:        'tile-penny-round',
    category:  'tile',
    name:      'White Penny Round Mosaic',
    supplier:  'floordecor',
    sku:       'FD-TL-7701',
    price:     6.99,
    unit:      'sq ft',
    finish:    'Glossy',
    size:      '1" Round',
    material:  'Porcelain',
    imageURL:  '',  // ← paste product photo URL here
  },

  // ─── FLOORING ────────────────────────────────────────────────────────────

  {
    id:        'floor-lvp-oak',
    category:  'flooring',
    name:      'Golden Oak LVP',
    supplier:  'floordecor',
    sku:       'FD-FL-1100',
    price:     3.49,
    unit:      'sq ft',
    finish:    'Hand-scraped',
    thickness: '6mm + 2mm pad',
    material:  'Luxury Vinyl Plank',
    imageURL:  '',  // ← paste product photo URL here
  },
  {
    id:        'floor-hardwood-hickory',
    category:  'flooring',
    name:      'Hickory Solid Hardwood',
    supplier:  'floordecor',
    sku:       'FD-FL-2200',
    price:     7.99,
    unit:      'sq ft',
    finish:    'Wire-brushed',
    thickness: '3/4"',
    material:  'Solid Hardwood',
    imageURL:  '',  // ← paste product photo URL here
  },
  {
    id:        'floor-engineered-walnut',
    category:  'flooring',
    name:      'Walnut Engineered Hardwood',
    supplier:  'homedepot',
    sku:       'HD-FL-3301',
    price:     5.49,
    unit:      'sq ft',
    finish:    'Smooth',
    thickness: '5/8"',
    material:  'Engineered Hardwood',
    imageURL:  '',  // ← paste product photo URL here
  },
  {
    id:        'floor-laminate-whitewash',
    category:  'flooring',
    name:      'Whitewashed Laminate Plank',
    supplier:  'homedepot',
    sku:       'HD-FL-4410',
    price:     2.19,
    unit:      'sq ft',
    finish:    'Embossed',
    thickness: '8mm',
    material:  'Laminate',
    imageURL:  '',  // ← paste product photo URL here
  },
  {
    id:        'floor-tile-porcelain-24',
    category:  'flooring',
    name:      'Light Beige Porcelain Floor',
    supplier:  'floordecor',
    sku:       'FD-FL-5500',
    price:     4.29,
    unit:      'sq ft',
    finish:    'Polished',
    thickness: '10mm',
    material:  'Porcelain',
    imageURL:  '',  // ← paste product photo URL here
  },
  {
    id:        'floor-outdoor-slate',
    category:  'flooring',
    name:      'Slate Grey Outdoor Paver',
    supplier:  'homedepot',
    sku:       'HD-FL-6601',
    price:     3.99,
    unit:      'sq ft',
    finish:    'Natural',
    thickness: '3/4"',
    material:  'Slate',
    imageURL:  '',  // ← paste product photo URL here
  },
  {
    id:        'floor-concrete-look',
    category:  'flooring',
    name:      'Concrete Look LVT',
    supplier:  'floordecor',
    sku:       'FD-FL-7700',
    price:     2.89,
    unit:      'sq ft',
    finish:    'Matte',
    thickness: '4mm',
    material:  'Luxury Vinyl Tile',
    imageURL:  '',  // ← paste product photo URL here
  },

  // ─── VANITY & SINK ───────────────────────────────────────────────────────

  {
    id:       'vanity-single-30',
    category: 'vanity',
    name:     'Shaker 30" Single Vanity – White',
    supplier: 'ferguson',
    sku:      'FG-VN-3001W',
    price:    649,
    unit:     'each',
    style:    'Shaker',
    width:    '30"',
    finish:   'White',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'vanity-double-60',
    category: 'vanity',
    name:     'Modern 60" Double Vanity – Espresso',
    supplier: 'ferguson',
    sku:      'FG-VN-6002E',
    price:    1299,
    unit:     'each',
    style:    'Modern',
    width:    '60"',
    finish:   'Espresso',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'vanity-freestanding-48',
    category: 'vanity',
    name:     'Floating 48" Vanity – Driftwood',
    supplier: 'wayfair',
    sku:      'WF-VN-4801D',
    price:    899,
    unit:     'each',
    style:    'Contemporary',
    width:    '48"',
    finish:   'Driftwood',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'vanity-pedestal',
    category: 'vanity',
    name:     'Classic Pedestal Sink',
    supplier: 'ferguson',
    sku:      'FG-VN-PD01',
    price:    289,
    unit:     'each',
    style:    'Traditional',
    width:    '24"',
    finish:   'White',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'vanity-double-72',
    category: 'vanity',
    name:     'Luxury 72" Double Vanity – Charcoal',
    supplier: 'ferguson',
    sku:      'FG-VN-7202C',
    price:    2199,
    unit:     'each',
    style:    'Transitional',
    width:    '72"',
    finish:   'Charcoal',
    imageURL: '',  // ← paste product photo URL here
  },

  // ─── PLUMBING FIXTURES ───────────────────────────────────────────────────

  {
    id:       'fixture-faucet-chrome',
    category: 'fixtures',
    name:     'Single-Handle Chrome Faucet',
    supplier: 'ferguson',
    sku:      'FG-FX-1001CH',
    price:    179,
    unit:     'each',
    finish:   'Polished Chrome',
    brand:    'Moen',
    type:     'Bathroom Faucet',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'fixture-faucet-matte-black',
    category: 'fixtures',
    name:     'Waterfall Matte Black Faucet',
    supplier: 'ferguson',
    sku:      'FG-FX-2002MB',
    price:    299,
    unit:     'each',
    finish:   'Matte Black',
    brand:    'Delta',
    type:     'Bathroom Faucet',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'fixture-faucet-brushed-nickel',
    category: 'fixtures',
    name:     '3-Hole Brushed Nickel Kitchen Faucet',
    supplier: 'ferguson',
    sku:      'FG-FX-3003BN',
    price:    349,
    unit:     'each',
    finish:   'Brushed Nickel',
    brand:    'Kohler',
    type:     'Kitchen Faucet',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'fixture-toilet-elongated',
    category: 'fixtures',
    name:     'Comfort Height Elongated Toilet',
    supplier: 'ferguson',
    sku:      'FG-FX-4001T',
    price:    399,
    unit:     'each',
    finish:   'White',
    brand:    'TOTO',
    type:     'Toilet',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'fixture-toilet-smart',
    category: 'fixtures',
    name:     'Smart Bidet Toilet',
    supplier: 'ferguson',
    sku:      'FG-FX-5001BT',
    price:    1299,
    unit:     'each',
    finish:   'White',
    brand:    'TOTO Washlet',
    type:     'Smart Toilet',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'fixture-kitchen-sink-farmhouse',
    category: 'fixtures',
    name:     'Farmhouse Apron Sink 33"',
    supplier: 'ferguson',
    sku:      'FG-FX-6001FS',
    price:    699,
    unit:     'each',
    finish:   'White Fireclay',
    brand:    'Rohl',
    type:     'Kitchen Sink',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'fixture-kitchen-sink-undermount',
    category: 'fixtures',
    name:     'Stainless Steel Undermount Sink 32"',
    supplier: 'homedepot',
    sku:      'HD-FX-7001SS',
    price:    299,
    unit:     'each',
    finish:   'Stainless Steel',
    brand:    'Kraus',
    type:     'Kitchen Sink',
    imageURL: '',  // ← paste product photo URL here
  },

  // ─── SHOWER SYSTEMS ──────────────────────────────────────────────────────

  {
    id:       'shower-system-chrome',
    category: 'shower',
    name:     'Rain Head Shower System – Chrome',
    supplier: 'ferguson',
    sku:      'FG-SH-1001CH',
    price:    549,
    unit:     'each',
    finish:   'Polished Chrome',
    brand:    'Moen',
    type:     'Shower System',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'shower-system-matte-black',
    category: 'shower',
    name:     'Multi-Function Shower System – Matte Black',
    supplier: 'ferguson',
    sku:      'FG-SH-2002MB',
    price:    899,
    unit:     'each',
    finish:   'Matte Black',
    brand:    'Delta',
    type:     'Shower System',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'shower-enclosure-frameless',
    category: 'shower',
    name:     'Frameless Glass Shower Enclosure 48"',
    supplier: 'homedepot',
    sku:      'HD-SH-3001FG',
    price:    1199,
    unit:     'each',
    finish:   'Clear Glass / Chrome',
    type:     'Enclosure',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'shower-pan-32',
    category: 'shower',
    name:     'Solid Surface Shower Pan 32x32"',
    supplier: 'homedepot',
    sku:      'HD-SH-4001SP',
    price:    249,
    unit:     'each',
    finish:   'White',
    type:     'Shower Pan',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'shower-linear-drain',
    category: 'shower',
    name:     'Stainless Linear Drain 36"',
    supplier: 'ferguson',
    sku:      'FG-SH-5001LD',
    price:    199,
    unit:     'each',
    finish:   'Brushed Stainless',
    type:     'Drain',
    imageURL: '',  // ← paste product photo URL here
  },

  // ─── BATHTUBS ────────────────────────────────────────────────────────────

  {
    id:       'tub-soaking-freestanding',
    category: 'tub',
    name:     'Freestanding Soaking Tub 67"',
    supplier: 'ferguson',
    sku:      'FG-TB-1001WT',
    price:    1599,
    unit:     'each',
    finish:   'White',
    brand:    'Kohler',
    type:     'Freestanding',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'tub-alcove-60',
    category: 'tub',
    name:     'Alcove Tub/Shower Combo 60"',
    supplier: 'homedepot',
    sku:      'HD-TB-2001AC',
    price:    499,
    unit:     'each',
    finish:   'White',
    brand:    'American Standard',
    type:     'Alcove',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'tub-clawfoot',
    category: 'tub',
    name:     'Cast Iron Clawfoot Tub 66"',
    supplier: 'ferguson',
    sku:      'FG-TB-3001CF',
    price:    2499,
    unit:     'each',
    finish:   'Glossy White / Black Claw',
    brand:    'Randolph Morris',
    type:     'Clawfoot',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'tub-drop-in-jetted',
    category: 'tub',
    name:     'Drop-In Jetted Whirlpool Tub 60"',
    supplier: 'ferguson',
    sku:      'FG-TB-4001JW',
    price:    3299,
    unit:     'each',
    finish:   'White',
    brand:    'Jacuzzi',
    type:     'Drop-In Jetted',
    imageURL: '',  // ← paste product photo URL here
  },

  // ─── LIGHTING ────────────────────────────────────────────────────────────

  {
    id:       'light-vanity-3-bar',
    category: 'lighting',
    name:     '3-Light Vanity Bar – Brushed Nickel',
    supplier: 'ferguson',
    sku:      'FG-LT-1001BN',
    price:    119,
    unit:     'each',
    finish:   'Brushed Nickel',
    type:     'Vanity Light',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'light-recessed-6',
    category: 'lighting',
    name:     '6" LED Recessed Downlight',
    supplier: 'homedepot',
    sku:      'HD-LT-2001RL',
    price:    29,
    unit:     'each',
    finish:   'White',
    type:     'Recessed',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'light-pendant-kitchen',
    category: 'lighting',
    name:     'Seeded Glass Pendant Light',
    supplier: 'wayfair',
    sku:      'WF-LT-3001PD',
    price:    89,
    unit:     'each',
    finish:   'Oil-Rubbed Bronze',
    type:     'Pendant',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'light-under-cabinet',
    category: 'lighting',
    name:     'LED Under-Cabinet Strip Light',
    supplier: 'homedepot',
    sku:      'HD-LT-4001UC',
    price:    19,
    unit:     'each',
    finish:   'White',
    type:     'Under-Cabinet',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'light-outdoor-sconce',
    category: 'lighting',
    name:     'Outdoor Wall Sconce – Black',
    supplier: 'ferguson',
    sku:      'FG-LT-5001OW',
    price:    149,
    unit:     'each',
    finish:   'Matte Black',
    type:     'Outdoor Sconce',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'light-chandelier',
    category: 'lighting',
    name:     'Modern Chandelier – Chrome',
    supplier: 'wayfair',
    sku:      'WF-LT-6001CH',
    price:    399,
    unit:     'each',
    finish:   'Polished Chrome',
    type:     'Chandelier',
    imageURL: '',  // ← paste product photo URL here
  },

  // ─── CABINETS ────────────────────────────────────────────────────────────

  {
    id:       'cab-shaker-white',
    category: 'cabinets',
    name:     'Shaker White Cabinet Set',
    supplier: 'homedepot',
    sku:      'HD-CB-1001SW',
    price:    189,
    unit:     'linear ft',
    style:    'Shaker',
    finish:   'White',
    material: 'MDF / Soft-close',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'cab-flat-panel-gray',
    category: 'cabinets',
    name:     'Flat-Panel Gray Cabinet Set',
    supplier: 'homedepot',
    sku:      'HD-CB-2001FG',
    price:    229,
    unit:     'linear ft',
    style:    'Modern',
    finish:   'Gray',
    material: 'Plywood box / Soft-close',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'cab-custom-walnut',
    category: 'cabinets',
    name:     'Custom Walnut Semi-Custom Cabinet',
    supplier: 'ferguson',
    sku:      'FG-CB-3001WL',
    price:    449,
    unit:     'linear ft',
    style:    'Transitional',
    finish:   'Natural Walnut',
    material: 'Solid wood / Dovetail',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'cab-navy-inset',
    category: 'cabinets',
    name:     'Navy Blue Inset Cabinet Set',
    supplier: 'lowes',
    sku:      'LW-CB-4001NB',
    price:    279,
    unit:     'linear ft',
    style:    'Traditional',
    finish:   'Navy Blue',
    material: 'MDF / Soft-close',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'cab-two-tone',
    category: 'cabinets',
    name:     'Two-Tone Upper White / Lower Sage',
    supplier: 'lowes',
    sku:      'LW-CB-5001TT',
    price:    259,
    unit:     'linear ft',
    style:    'Transitional',
    finish:   'White / Sage Green',
    material: 'MDF / Soft-close',
    imageURL: '',  // ← paste product photo URL here
  },

  // ─── COUNTERTOPS ─────────────────────────────────────────────────────────

  {
    id:       'counter-quartz-white',
    category: 'countertops',
    name:     'Calacatta White Quartz',
    supplier: 'msisurfaces',
    sku:      'MSI-CT-1001WQ',
    price:    75,
    unit:     'sq ft',
    material: 'Quartz',
    thickness:'3cm',
    finish:   'Polished',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'counter-granite-black',
    category: 'countertops',
    name:     'Absolute Black Granite',
    supplier: 'msisurfaces',
    sku:      'MSI-CT-2001BG',
    price:    65,
    unit:     'sq ft',
    material: 'Granite',
    thickness:'3cm',
    finish:   'Polished',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'counter-butcher-block',
    category: 'countertops',
    name:     'Walnut Butcher Block',
    supplier: 'homedepot',
    sku:      'HD-CT-3001BB',
    price:    99,
    unit:     'linear ft',
    material: 'Solid Wood',
    thickness:'1.5"',
    finish:   'Oil',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'counter-carrara-marble',
    category: 'countertops',
    name:     'Carrara Marble Slab',
    supplier: 'msisurfaces',
    sku:      'MSI-CT-4001CM',
    price:    95,
    unit:     'sq ft',
    material: 'Natural Marble',
    thickness:'3cm',
    finish:   'Polished',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'counter-laminate',
    category: 'countertops',
    name:     'Formica Laminate Countertop',
    supplier: 'lowes',
    sku:      'LW-CT-5001LM',
    price:    18,
    unit:     'sq ft',
    material: 'Laminate',
    thickness:'1.5"',
    finish:   'Various patterns',
    imageURL: '',  // ← paste product photo URL here
  },

  // ─── BACKSPLASH TILE ─────────────────────────────────────────────────────

  {
    id:       'back-herringbone-marble',
    category: 'tile-backsplash',
    name:     'Carrara Herringbone Mosaic',
    supplier: 'msisurfaces',
    sku:      'MSI-BK-1001HM',
    price:    14.99,
    unit:     'sq ft',
    pattern:  'Herringbone',
    material: 'Natural Marble',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'back-subway-3x6',
    category: 'tile-backsplash',
    name:     'White Subway Backsplash 3x6"',
    supplier: 'floordecor',
    sku:      'FD-BK-2001SW',
    price:    3.49,
    unit:     'sq ft',
    pattern:  'Running Bond',
    material: 'Ceramic',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'back-zellige-terracotta',
    category: 'tile-backsplash',
    name:     'Zellige Terracotta Handmade Tile',
    supplier: 'floordecor',
    sku:      'FD-BK-3001ZT',
    price:    22.99,
    unit:     'sq ft',
    pattern:  'Stacked',
    material: 'Handmade Ceramic',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'back-glass-blue',
    category: 'tile-backsplash',
    name:     'Cobalt Blue Glass Mosaic',
    supplier: 'homedepot',
    sku:      'HD-BK-4001GB',
    price:    9.99,
    unit:     'sq ft',
    pattern:  'Mosaic',
    material: 'Glass',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'back-brick-veneer',
    category: 'tile-backsplash',
    name:     'White Brick Veneer Panel',
    supplier: 'homedepot',
    sku:      'HD-BK-5001BV',
    price:    7.49,
    unit:     'sq ft',
    pattern:  'Brick',
    material: 'Faux Brick',
    imageURL: '',  // ← paste product photo URL here
  },

  // ─── BATH ACCESSORIES ────────────────────────────────────────────────────

  {
    id:       'acc-towel-bar',
    category: 'accessories',
    name:     'Towel Bar 24" – Brushed Nickel',
    supplier: 'ferguson',
    sku:      'FG-AC-1001TB',
    price:    59,
    unit:     'each',
    finish:   'Brushed Nickel',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'acc-robe-hook',
    category: 'accessories',
    name:     'Robe Hook – Matte Black',
    supplier: 'wayfair',
    sku:      'WF-AC-2001RH',
    price:    29,
    unit:     'each',
    finish:   'Matte Black',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'acc-toilet-paper',
    category: 'accessories',
    name:     'Toilet Paper Holder – Chrome',
    supplier: 'homedepot',
    sku:      'HD-AC-3001TP',
    price:    24,
    unit:     'each',
    finish:   'Polished Chrome',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'acc-mirror-oval',
    category: 'accessories',
    name:     'Frameless Oval Bathroom Mirror 30x40"',
    supplier: 'wayfair',
    sku:      'WF-AC-4001OM',
    price:    189,
    unit:     'each',
    finish:   'Frameless',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'acc-mirror-medicine',
    category: 'accessories',
    name:     'LED Medicine Cabinet 30"',
    supplier: 'homedepot',
    sku:      'HD-AC-5001MC',
    price:    349,
    unit:     'each',
    finish:   'Stainless Frame',
    imageURL: '',  // ← paste product photo URL here
  },

  // ─── EXTERIOR FINISHES ───────────────────────────────────────────────────

  {
    id:       'ext-hardie-board',
    category: 'exterior',
    name:     'HardiePlank Lap Siding',
    supplier: 'homedepot',
    sku:      'HD-EX-1001HP',
    price:    4.99,
    unit:     'sq ft',
    material: 'Fiber Cement',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'ext-stucco',
    category: 'exterior',
    name:     'Stucco Finish System',
    supplier: 'homedepot',
    sku:      'HD-EX-2001ST',
    price:    3.49,
    unit:     'sq ft',
    material: 'Stucco',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'ext-brick-veneer',
    category: 'exterior',
    name:     'Brick Veneer Exterior',
    supplier: 'homedepot',
    sku:      'HD-EX-3001BV',
    price:    8.99,
    unit:     'sq ft',
    material: 'Brick Veneer',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'ext-stone-facade',
    category: 'exterior',
    name:     'Ledger Stone Facade',
    supplier: 'msisurfaces',
    sku:      'MSI-EX-4001SF',
    price:    12.99,
    unit:     'sq ft',
    material: 'Natural Stone',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'ext-wood-soffit',
    category: 'exterior',
    name:     'Cypress Wood Soffit/Beam',
    supplier: 'lowes',
    sku:      'LW-EX-5001WB',
    price:    14.99,
    unit:     'linear ft',
    material: 'Cypress Wood',
    imageURL: '',  // ← paste product photo URL here
  },

  // ─── ROOFING ─────────────────────────────────────────────────────────────

  {
    id:       'roof-architectural-shingle',
    category: 'roofing',
    name:     'Architectural Shingles 30-yr',
    supplier: 'homedepot',
    sku:      'HD-RF-1001AS',
    price:    189,
    unit:     'square (100 sq ft)',
    material: 'Asphalt',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'roof-metal-standing-seam',
    category: 'roofing',
    name:     'Standing Seam Metal Roof',
    supplier: 'lowes',
    sku:      'LW-RF-2001MS',
    price:    12.99,
    unit:     'sq ft',
    material: 'Steel',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'roof-clay-tile',
    category: 'roofing',
    name:     'Clay S-Tile Roof',
    supplier: 'homedepot',
    sku:      'HD-RF-3001CT',
    price:    299,
    unit:     'square (100 sq ft)',
    material: 'Clay',
    imageURL: '',  // ← paste product photo URL here
  },

  // ─── WINDOWS & DOORS ─────────────────────────────────────────────────────

  {
    id:       'wd-vinyl-window',
    category: 'windows-doors',
    name:     "Double-Hung Vinyl Window 3x4'",
    supplier: 'lowes',
    sku:      'LW-WD-1001VW',
    price:    299,
    unit:     'each',
    material: 'Vinyl',
    type:     'Window',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'wd-patio-door',
    category: 'windows-doors',
    name:     "French Patio Door 6' – White",
    supplier: 'homedepot',
    sku:      'HD-WD-2001FD',
    price:    1499,
    unit:     'each',
    material: 'Wood / Fiberglass',
    type:     'Door',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'wd-entry-door',
    category: 'windows-doors',
    name:     'Steel Entry Door 36" – Iron Ore',
    supplier: 'homedepot',
    sku:      'HD-WD-3001ED',
    price:    699,
    unit:     'each',
    material: 'Steel',
    type:     'Entry Door',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'wd-skylight',
    category: 'windows-doors',
    name:     'Fixed Skylight 21x38"',
    supplier: 'lowes',
    sku:      'LW-WD-4001SL',
    price:    449,
    unit:     'each',
    material: 'Tempered Glass',
    type:     'Skylight',
    imageURL: '',  // ← paste product photo URL here
  },

  // ─── COLUMNS & TRIM ──────────────────────────────────────────────────────

  {
    id:       'col-fiberglass-8ft',
    category: 'columns',
    name:     "Fiberglass Round Column 8'",
    supplier: 'lowes',
    sku:      'LW-CL-1001FC',
    price:    299,
    unit:     'each',
    material: 'Fiberglass',
    style:    'Tuscan',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'col-craftsman-post',
    category: 'columns',
    name:     'Craftsman Square Post Wrap Kit',
    supplier: 'homedepot',
    sku:      'HD-CL-2001CP',
    price:    149,
    unit:     'each',
    material: 'PVC / Wood',
    style:    'Craftsman',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'col-steel-modern',
    category: 'columns',
    name:     "Steel Round Column 10'",
    supplier: 'lowes',
    sku:      'LW-CL-3001SC',
    price:    499,
    unit:     'each',
    material: 'Powder-coated Steel',
    style:    'Modern',
    imageURL: '',  // ← paste product photo URL here
  },

  // ─── INSULATION & DRYWALL ────────────────────────────────────────────────

  {
    id:       'ins-spray-foam',
    category: 'insulation',
    name:     'Closed-Cell Spray Foam R-6.5',
    supplier: 'homedepot',
    sku:      'HD-IN-1001SF',
    price:    2.49,
    unit:     'sq ft',
    material: 'Spray Foam',
    rValue:   'R-6.5/inch',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'ins-fiberglass-batt',
    category: 'insulation',
    name:     'R-19 Fiberglass Batt',
    supplier: 'lowes',
    sku:      'LW-IN-2001FB',
    price:    0.99,
    unit:     'sq ft',
    material: 'Fiberglass',
    rValue:   'R-19',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'ins-drywall-5-8',
    category: 'insulation',
    name:     '5/8" Type X Drywall',
    supplier: 'homedepot',
    sku:      'HD-IN-3001DW',
    price:    18,
    unit:     "sheet (4x8')",
    material: 'Gypsum',
    imageURL: '',  // ← paste product photo URL here
  },

  // ─── APPLIANCES ──────────────────────────────────────────────────────────

  {
    id:       'app-range-gas',
    category: 'appliances',
    name:     '30" Gas Range – Stainless',
    supplier: 'homedepot',
    sku:      'HD-AP-1001GR',
    price:    899,
    unit:     'each',
    finish:   'Stainless Steel',
    brand:    'Samsung',
    type:     'Range',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'app-range-professional',
    category: 'appliances',
    name:     '36" Professional Dual-Fuel Range',
    supplier: 'ferguson',
    sku:      'FG-AP-2001PR',
    price:    4299,
    unit:     'each',
    finish:   'Stainless Steel',
    brand:    'Thermador',
    type:     'Range',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'app-dishwasher',
    category: 'appliances',
    name:     '24" Built-In Dishwasher',
    supplier: 'homedepot',
    sku:      'HD-AP-3001DW',
    price:    649,
    unit:     'each',
    finish:   'Stainless Steel',
    brand:    'Bosch',
    type:     'Dishwasher',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'app-refrigerator-french',
    category: 'appliances',
    name:     '36" French Door Refrigerator',
    supplier: 'lowes',
    sku:      'LW-AP-4001FR',
    price:    2199,
    unit:     'each',
    finish:   'Stainless Steel',
    brand:    'LG',
    type:     'Refrigerator',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'app-microwave-drawer',
    category: 'appliances',
    name:     'Microwave Drawer 24"',
    supplier: 'ferguson',
    sku:      'FG-AP-5001MD',
    price:    1099,
    unit:     'each',
    finish:   'Stainless Steel',
    brand:    'Sharp',
    type:     'Microwave',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'app-range-hood',
    category: 'appliances',
    name:     'Wall-Mount Range Hood 36"',
    supplier: 'homedepot',
    sku:      'HD-AP-6001RH',
    price:    449,
    unit:     'each',
    finish:   'Stainless Steel',
    brand:    'Cosmo',
    type:     'Range Hood',
    imageURL: '',  // ← paste product photo URL here
  },

  // ─── KITCHEN ISLAND ──────────────────────────────────────────────────────

  {
    id:       'island-butcher-block',
    category: 'island',
    name:     'Butcher Block Kitchen Island 48x24"',
    supplier: 'homedepot',
    sku:      'HD-IS-1001BB',
    price:    699,
    unit:     'each',
    style:    'Farmhouse',
    finish:   'Natural Wood',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'island-shaker-gray',
    category: 'island',
    name:     'Shaker Gray Island with Quartz Top 60x36"',
    supplier: 'lowes',
    sku:      'LW-IS-2001SG',
    price:    2199,
    unit:     'each',
    style:    'Shaker',
    finish:   'Gray / White Quartz',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'island-custom',
    category: 'island',
    name:     'Custom Built Island with Storage',
    supplier: 'ferguson',
    sku:      'FG-IS-3001CB',
    price:    599,
    unit:     'linear ft',
    style:    'Custom',
    finish:   'Client choice',
    imageURL: '',  // ← paste product photo URL here
  },

  // ─── CUSTOM MILLWORK ─────────────────────────────────────────────────────

  {
    id:       'mill-crown-molding',
    category: 'custom-millwork',
    name:     'Crown Molding 4.5"',
    supplier: 'homedepot',
    sku:      'HD-MW-1001CM',
    price:    4.99,
    unit:     'linear ft',
    material: 'MDF',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'mill-wainscoting',
    category: 'custom-millwork',
    name:     'Wainscoting Panel Kit',
    supplier: 'lowes',
    sku:      'LW-MW-2001WP',
    price:    6.99,
    unit:     'sq ft',
    material: 'MDF / PVC',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'mill-shiplap',
    category: 'custom-millwork',
    name:     'White Shiplap Panel',
    supplier: 'homedepot',
    sku:      'HD-MW-3001SH',
    price:    3.49,
    unit:     'sq ft',
    material: 'MDF',
    imageURL: '',  // ← paste product photo URL here
  },
  {
    id:       'mill-built-in-shelf',
    category: 'custom-millwork',
    name:     'Custom Built-In Shelving',
    supplier: 'ferguson',
    sku:      'FG-MW-4001BS',
    price:    299,
    unit:     'linear ft',
    material: 'Solid Wood / MDF',
    imageURL: '',  // ← paste product photo URL here
  },

];

export default materialsData;
