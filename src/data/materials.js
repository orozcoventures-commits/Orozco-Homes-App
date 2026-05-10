// src/data/materials.js — Orozco Homes Material Selection Portal
//
// SUPPLIERS are defined here.
// All material items live in src/materialsData.js (flat list).
// MATERIALS is rebuilt from that flat list grouped by category.

import materialsData from '../materialsData';

export const SUPPLIERS = {
  ferguson: {
    id: 'ferguson',
    name: 'Ferguson Bath, Kitchen & Lighting',
    logo: 'FG',
    color: '#003087',
    url: 'https://www.ferguson.com',
    specialty: 'Plumbing, bath, kitchen, lighting',
  },
  homedepot: {
    id: 'homedepot',
    name: 'The Home Depot',
    logo: 'HD',
    color: '#F96302',
    url: 'https://www.homedepot.com',
    specialty: 'Building materials, appliances, flooring',
  },
  floordecor: {
    id: 'floordecor',
    name: 'Floor & Decor',
    logo: 'F&D',
    color: '#1B5E20',
    url: 'https://www.flooranddecor.com',
    specialty: 'Tile, hardwood, laminate, luxury vinyl',
  },
  lowes: {
    id: 'lowes',
    name: "Lowe's",
    logo: 'LW',
    color: '#004990',
    url: 'https://www.lowes.com',
    specialty: 'Building materials, appliances, fixtures',
  },
  wayfair: {
    id: 'wayfair',
    name: 'Wayfair Pro',
    logo: 'WF',
    color: '#7B2D8B',
    url: 'https://www.wayfair.com',
    specialty: 'Vanities, lighting, décor, accessories',
  },
  msisurfaces: {
    id: 'msisurfaces',
    name: 'MSI Surfaces',
    logo: 'MSI',
    color: '#8B1A1A',
    url: 'https://www.msisurfaces.com',
    specialty: 'Natural stone, porcelain, quartz countertops',
  },
};

// Group the flat list by category for category-based rendering
export const MATERIALS = materialsData.reduce((acc, item) => {
  if (!acc[item.category]) acc[item.category] = [];
  acc[item.category].push(item);
  return acc;
}, {});
