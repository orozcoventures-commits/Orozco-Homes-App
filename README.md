# Orozco Homes — Remodel Material Selection App

A client-facing material selection and planning tool for home renovation projects. Built with React + Vite + Tailwind CSS.

## Features

- **Project Types**: Bathrooms (small/medium/large), Kitchens (small/medium/large), Home Addition, Portico/Entry, Garage Conversion, Full House Renovation
- **Multi-Supplier Catalog**: Materials sourced from Ferguson, Home Depot, Floor & Decor, Lowe's, Wayfair Pro, and MSI Surfaces
- **Material Categories**: Tile, Flooring, Vanities, Fixtures, Showers, Tubs, Lighting, Cabinets, Countertops, Backsplash, Appliances, Exterior, Roofing, Windows & Doors, Custom Millwork, and more
- **Status Tracking**: Mark each material as *Considering*, *Selected*, or *Ordered*
- **Budget Tracker**: Live running total showing committed spend (Selected + Ordered) vs. total tracked
- **Search & Filter**: Filter by supplier and search by name, material type, or finish
- **My List View**: Grouped summary of all tracked items by status with subtotals

## Project Structure

```
src/
├── App.jsx                    # Root component, wraps ProjectProvider
├── index.css                  # Tailwind CSS entry
├── main.jsx                   # React DOM entry point
│
├── context/
│   └── ProjectContext.jsx     # Global state: active project + material selections
│
├── data/
│   ├── projectTypes.js        # All 10 project types with their material categories
│   └── materials.js           # Full material catalog (~80 items) + supplier definitions
│
├── pages/
│   ├── ProjectSelector.jsx    # Landing: choose project type
│   └── ProjectDetail.jsx      # Materials browser + My List for selected project
│
└── components/
    ├── Header.jsx             # Top navigation bar
    ├── MaterialCard.jsx       # Individual material card with status buttons
    ├── MaterialSection.jsx    # Category tabs + search/filter + card grid
    ├── BudgetTracker.jsx      # Sticky bottom bar showing totals
    ├── SelectionSummary.jsx   # "My List" view grouped by status
    └── SupplierBadge.jsx      # Colored supplier logo badge
```

## How to Run Locally

### Prerequisites
- Node.js 18+
- npm 9+

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

## Usage Guide

1. **Choose a project** from the home screen (e.g., "Medium Bathroom" or "Large Kitchen")
2. **Browse material categories** using the tabs (Tile, Flooring, Fixtures, etc.)
3. **Filter by supplier** using the colored badges (FG, HD, F&D, LW, WF, MSI)
4. **Search** by material name, finish, or type
5. **Set status** on each card: *Considering* → *Selected* → *Ordered*
6. **Track your budget** in the sticky bar at the bottom
7. **View My List** to see a grouped summary with subtotals

## Material Suppliers

| Badge | Supplier | Specialty |
|-------|----------|-----------|
| FG | Ferguson Bath, Kitchen & Lighting | Plumbing, fixtures, lighting |
| HD | The Home Depot | Building materials, appliances, flooring |
| F&D | Floor & Decor | Tile, hardwood, luxury vinyl |
| LW | Lowe's | Building materials, windows, doors |
| WF | Wayfair Pro | Vanities, lighting, decor |
| MSI | MSI Surfaces | Natural stone, quartz, porcelain |

## Tech Stack

- **React 19** — UI components
- **Vite 8** — Dev server and bundler
- **Tailwind CSS v4** — Utility-first styling
- **React Context + useReducer** — State management (no external library needed)

## Notes

- All prices shown are **per-unit estimates** (per sq ft, each, per linear ft). Final project costs depend on quantities, labor, and site conditions.
- A full detailed estimate is provided by Orozco Homes during the client consultation.
- SKU numbers are reference codes for ordering discussions.
