// Starter Scope of Work for each subcontractor trade (Remodel Budget →
// Subs & Materials). Orozco Homes buys the materials; subs supply labor.
// These are used until a default is saved for a trade (table
// trade_scope_templates, migration 053), and each budget can edit its own copy
// (layout_json.scopes). Internal working text — edit freely.

export const MAX_SCOPE = 8000;

const GENERAL = [
  'Furnish all labor, tools, equipment and consumables (fasteners, blades, tape, caulk, etc.) to complete the work below.',
  'Orozco Homes supplies the materials listed in the budget unless noted otherwise.',
  'Work to Virginia USBC / 2021 IRC and manufacturer instructions; schedule and pass required inspections for this trade.',
  'Protect finished surfaces, keep the work area broom clean daily and remove trade debris to the job dumpster.',
  'Current COI (general liability + workers\' comp) and Virginia contractor license on file before starting.',
].map((t) => `• ${t}`).join('\n');

const scope = (...lines) => `${lines.map((t) => `• ${t}`).join('\n')}\n\nGeneral:\n${GENERAL}`;

export const STARTER_SCOPES = {
  demolition: scope(
    'Install floor, wall and doorway protection and dust barriers before demo.',
    'Selective demolition of the areas shown; remove fixtures, finishes and materials to studs/subfloor as required.',
    'Cap or confirm plumbing and electrical are made safe before removal (by licensed trades).',
    'Haul debris to the dumpster; sweep and vacuum; leave the area ready for framing.',
    'Notify Orozco Homes immediately of rot, mold, termite damage or hidden conditions.',
  ),
  concrete: scope(
    'Layout, excavation and forming for footings / slab per approved plans.',
    'Place reinforcing, vapor barrier and anchors as specified; call for footing inspection before pour.',
    'Place, finish and cure concrete; saw-cut control joints as required.',
    'Strip forms, backfill and remove excess spoils.',
  ),
  framing: scope(
    'Frame walls, openings, headers, blocking and backing per plans and USBC.',
    'Install beams, posts and joist reinforcement as engineered; temporary shoring where required.',
    'Install blocking for cabinets, vanities, grab bars, TV mounts and accessories as marked.',
    'Plumb, level and square all framing; correct framing items noted at framing inspection.',
  ),
  roofing: scope(
    'Remove existing roofing as noted; inspect and report damaged decking.',
    'Install underlayment, ice & water shield at valleys/penetrations, drip edge and flashing.',
    'Install roofing per manufacturer specs to keep warranty; vents and boots at penetrations.',
    'Magnetic sweep of the property for nails; haul roofing debris.',
  ),
  windows: scope(
    'Remove and dispose of existing units where noted.',
    'Install windows / doors plumb, level and square with sill pans, flashing tape and sealant per manufacturer.',
    'Insulate gaps with low-expansion foam; install hardware and adjust for smooth operation.',
    'Meet egress and tempered-glass requirements where applicable.',
  ),
  siding: scope(
    'Install housewrap / weather barrier lapped and taped; flash all openings and penetrations.',
    'Install siding, trim, corners and soffit per manufacturer specs.',
    'Caulk joints and penetrations; leave ready for paint where required.',
  ),
  plumbing: scope(
    'Rough-in supply, drain, waste and vent lines to fixture locations; tie into existing systems.',
    'Install valves, shower/tub rough-in and test caps; pressure test and pass rough-in inspection.',
    'Final set: install fixtures, faucets, trim, toilets and drains supplied by Orozco Homes.',
    'Test for leaks, check flow and drainage; pass final plumbing inspection.',
  ),
  hvac: scope(
    'Size equipment (Manual J where required) and install HVAC / mini-split system as specified.',
    'Run line sets, condensate, ductwork, supply and return as needed; seal ducts.',
    'Start-up, charge verification and testing; provide owner instructions and warranty registration.',
    'Pass mechanical inspection.',
  ),
  electrical: scope(
    'Rough-in circuits, boxes, switches, outlets, GFCI/AFCI and dedicated circuits to code.',
    'Install exhaust fans and lighting rough-in; panel work where specified.',
    'Pass rough-in electrical inspection before insulation / drywall.',
    'Trim out devices, plates and light fixtures supplied by Orozco Homes; label panel; pass final.',
  ),
  insulation: scope(
    'Install insulation to the R-values required by the Virginia energy code (Climate Zone 4A).',
    'Air-seal top plates, penetrations and rim joists; install vapor barrier where specified.',
    'Pass insulation inspection before drywall.',
  ),
  drywall: scope(
    'Hang drywall (moisture-resistant / cement board where specified) on walls and ceilings.',
    'Tape, mud and sand to Level 4 finish (Level 5 where noted); corner bead at outside corners.',
    'Patch and blend repairs to match existing texture.',
    'Leave ready for prime and paint.',
  ),
  tiling: scope(
    'Install cement board / backer and waterproofing system per manufacturer (flood test shower pans).',
    'Set floor, wall and backsplash tile to the approved layout; level, aligned and properly supported.',
    'Grout, caulk changes of plane, and seal grout/stone where required.',
    'Install trim pieces, niches and thresholds as shown.',
  ),
  flooring: scope(
    'Prepare and level subfloor; install underlayment / moisture barrier as specified.',
    'Install flooring per manufacturer with proper expansion gaps.',
    'Install transitions, thresholds and stair nosing; replace or reinstall shoe molding.',
  ),
  carpentry: scope(
    'Install cabinets, vanities and built-ins level and secured to blocking; adjust doors and drawers.',
    'Install trim, baseboard, casing, crown and doors; install hardware.',
    'Coordinate countertop template and installation; install accessories and mirrors.',
    'Fill nail holes and leave ready for paint.',
  ),
  painting: scope(
    'Prepare surfaces: fill, sand, caulk and spot prime.',
    'Paint walls (2 coats), ceilings, trim and doors in the colors selected by the client.',
    'Protect floors, fixtures and finishes; clean lines and touch-ups at completion.',
  ),
  other: scope(
    'Describe the work to be performed by this subcontractor.',
  ),
};

export function starterScope(trade) {
  return STARTER_SCOPES[trade] ?? STARTER_SCOPES.other;
}
