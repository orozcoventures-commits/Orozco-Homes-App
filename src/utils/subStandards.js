// Subcontractor Standards — Exhibit A (all trades) and Exhibit B (one section
// per Subs & Materials trade). Every Subcontract Agreement sent from Remodel
// Estimates → Subs & Materials includes Exhibit A and the trade's Exhibit B.
//
// The text below is the built-in version 1 (from "Orozco Homes Subcontractor
// Standards", October 2026, with repeated rules kept in one place). Admins edit
// it in Subcontractors → Standards; each publish is saved as a new version
// (table sub_standards_versions, migration 060). New agreements use the latest
// version; agreements already sent keep the version they were sent with.
// Each line of a section's text is one bullet.

import { TRADES } from './trades';

export const MAX_SECTION = 4000;

const STANDARDS_TRADES = TRADES.map((t) => t.key);

const lines = (...l) => l.join('\n');

export const BUILT_IN_STANDARDS = {
  intro: 'These Subcontractor Standards are part of every Orozco Homes Subcontract Agreement. Exhibit A applies to all trades; Exhibit B adds the expectations for the subcontractor\'s trade. Exhibit C (the Scope of Work for the job) controls what work is included; the signed agreement and applicable Virginia law control payment and legal rights.',
  general: [
    { title: 'Conduct and homeowner boundaries', text: lines(
      'Strict homeowner boundaries: subcontractors, employees, helpers and lower-tier subcontractors may not use the homeowner\'s bathrooms, kitchen, appliances, furniture, living areas or any other part of the home outside the designated work area and approved access route — even if the homeowner offers permission. Workers make their own off-site restroom, meal and break arrangements unless Orozco Homes designates separate facilities in writing. The homeowner cannot authorize exceptions.',
      'Arrive as scheduled, behave professionally, and respect occupants and neighbors; no smoking, vaping, drugs, alcohol, unauthorized visitors or loud music.',
      'Direct all pricing, changes, decisions and schedule commitments to Orozco Homes; do not negotiate or reschedule directly with the homeowner.',
      'Do not publish photos, addresses or identifying details without written authorization.',
    ) },
    { title: 'Site protection', text: lines(
      'Inspect and document preexisting conditions; protect finished floors, stairs, doors, trim, counters, cabinetry, glass, landscaping, driveways and access paths appropriate to the task.',
      'Contain dust and debris with barriers and extraction; protect HVAC returns from construction dust.',
      'Immediately report leaks, damage and unsafe conditions. Do not conceal or repair damage without approval. Subcontractor is responsible for damage caused by its negligent acts or failure to use agreed protections.',
    ) },
    { title: 'Cleanup and material control', text: lines(
      'Clean the work area and designated access routes daily; keep exits clear and secure tools and hazards.',
      'Do not discard, remove or reuse leftover materials, fixtures, hardware, tile or project property without written approval. Retain designated materials through the final punch list.',
    ) },
    { title: 'Schedule and coordination', text: lines(
      'Confirm start dates, expected duration and required predecessors; notify Orozco Homes at least 24 hours before foreseeable schedule changes and immediately for emergencies.',
    ) },
    { title: 'Communication and documentation', text: lines(
      'Report conflicts and delays promptly; provide progress photos and status when requested.',
      'Photograph rough-in and concealed work before cover-up (Exhibit B lists what to photograph for each trade). Do not cover work needed by another trade or an inspection until the inspection has passed and Orozco Homes authorizes it.',
    ) },
    { title: 'Workmanship', text: lines(
      'Verify dimensions and approved drawings before installation; follow applicable codes (Virginia USBC), permits, manufacturer instructions and accepted trade practices.',
      'Correct defective or nonconforming work attributable to the subcontractor at its expense, subject to the agreement.',
    ) },
    { title: 'Changes and discoveries', text: lines(
      'When concealed conditions or problems are found, stop affected work safely, photograph them, and submit the proposed remedy, price and schedule impact to Orozco Homes.',
      'No extra or changed work without written authorization from Orozco Homes, except necessary immediate emergency measures to prevent harm.',
    ) },
    { title: 'Safety and credentials', text: lines(
      'Maintain required Virginia contractor and trade licenses (including master/journeyman licensing for plumbing, electrical and HVAC), insurance, workers\' compensation coverage and safety compliance; keep a current certificate of insurance on file with Orozco Homes and provide license information on request.',
      'Secure hazardous materials and tools; use fall protection and other safety measures required for the task.',
    ) },
    { title: 'Selections and products', text: lines(
      'No substitutions without written approval. Tile: The Tile Shop; plumbing fixtures: Ferguson; lighting: approved design-quality sources (no unapproved Wayfair sourcing).',
      'Custom vanities are preferred. Client-purchased ready-made vanities require project-specific installation terms; inspect and report issues before installation.',
    ) },
    { title: 'Invoices and payment', text: lines(
      'Submit itemized invoices by Thursday at 5:00 p.m. for Tuesday processing of approved invoices.',
      'Payment follows the payment schedule in Exhibit C. Unless Exhibit C says otherwise, payment follows completion of the full trade scope, required inspection and Orozco Homes approval.',
      'The signed agreement and applicable Virginia prompt-payment requirements override administrative timing; no pay-if-paid condition prohibited by law applies.',
    ) },
    { title: 'Punch list, warranty and closeout', text: lines(
      'Complete the trade punch list promptly; provide at least a one-year workmanship warranty unless the agreement or law requires more.',
      'Submit applicable inspection signoffs, testing results, product information and photos; remove authorized waste and return access items.',
    ) },
    { title: 'Confidentiality', text: lines(
      'Keep client identities, property information, pricing, budgets and project documents confidential; no direct client solicitation during the project.',
      'Any post-project restrictive covenant requires separate legal review.',
    ) },
  ],
  trades: {
    demolition: { title: 'Demolition', text: lines(
      'Verify limits, utilities, structural conditions and items to salvage before starting.',
      'Use controlled removal methods and prevent unnecessary damage to work that stays.',
      'Stop and report suspect asbestos, lead, mold, active leaks, concealed wiring or unexpected structural elements; do not disturb suspect hazardous materials pending proper evaluation.',
      'Have exposed systems capped or made safe by appropriately licensed personnel; keep saved materials separate.',
    ) },
    concrete: { title: 'Concrete and masonry', text: lines(
      'Confirm excavation, subgrade compaction, forms, elevations, drainage, reinforcement and joint plan before placement.',
      'Use the approved mix and placement methods; do not add unauthorized water at the jobsite.',
      'Install control joints and finish as specified; provide curing and weather protection appropriate to conditions.',
      'Protect adjacent structures and maintain safe access until adequate strength is reached.',
    ) },
    framing: { title: 'Framing and structural carpentry', text: lines(
      'Build to approved plans, structural details and field dimensions; confirm load paths and required connectors.',
      'Do not cut or notch joists, rafters, beams or engineered members without an approved design.',
      'Provide blocking for cabinets, grab bars, glass, fixtures and accessories shown in the scope; verify openings and elevations.',
      'Before cover-up, photograph connectors, hold-downs, headers and blocking.',
    ) },
    roofing: { title: 'Roofing', text: lines(
      'Verify decking, underlayment, flashing, penetrations, ventilation and manufacturer fastening requirements (to keep the warranty).',
      'Keep the roof weather-tight at the end of every day; protect windows, decks and vehicles from falling debris.',
      'Secure materials against wind; sweep for nails and remove debris daily.',
      'Photograph flashing details before they are covered and perform a final leak and finish review.',
    ) },
    windows: { title: 'Windows and doors', text: lines(
      'Verify rough openings, egress and safety-glass requirements and the unit\'s swing/handing before installation.',
      'Install sill pans, flashing tape and sealant per the manufacturer and integrate them with the weather barrier; shim plumb, level and square.',
      'Insulate gaps with low-expansion foam; adjust hardware for smooth operation and confirm weather-stripping seals.',
      'Photograph sill pans and flashing before trim or siding covers them.',
    ) },
    siding: { title: 'Siding and exterior work', text: lines(
      'Verify the weather barrier, flashing at openings and penetrations, water management and manufacturer fastening and clearance requirements.',
      'Keep the wall weather-tight during work; secure materials against wind and remove nails and debris daily.',
      'Photograph the weather barrier and flashing before siding covers them; perform a final finish review.',
    ) },
    plumbing: { title: 'Plumbing', text: lines(
      'Confirm fixture specifications, supply sizes, venting, slopes, clearances and access.',
      'Pressure/leak test supply and drain work; photograph lines, valves and test gauges before cover-up; protect occupied spaces from water damage.',
      'Coordinate shower valve depth, shower pan and drain assemblies, vanity rough-ins, toilet flanges and fixtures with tile and cabinetry elevations.',
    ) },
    hvac: { title: 'HVAC and ventilation', text: lines(
      'Verify equipment and duct sizing, airflow and access; coordinate routes with structure and other trades.',
      'Terminate bath exhaust outdoors as required; never exhaust into the attic or crawlspace.',
      'Seal and support ducts, provide condensate management and test performance as applicable.',
      'Report insufficient existing capacity or inaccessible routing before making changes.',
    ) },
    electrical: { title: 'Electrical', text: lines(
      'Verify circuit capacity, grounding, GFCI/AFCI requirements, locations and fixture compatibility.',
      'Confirm device, sconce, fan and recessed-light locations with the approved layout before rough-in; coordinate dimmers, drivers and specialty fixtures.',
      'Label circuits, secure wiring, install required boxes and protections, and test devices; photograph wiring and boxes before cover-up.',
      'Leave electrical systems safe and restore only authorized circuits.',
    ) },
    insulation: { title: 'Insulation', text: lines(
      'Install to the R-values on the plans and required by the Virginia Energy Conservation Code (Climate Zone 4A).',
      'Air-seal top plates, penetrations and rim joists before insulating; install vapor retarders only where specified.',
      'Keep baffles and ventilation clear at eaves; keep required clearances at flues and non-IC recessed lights; do not cover attic access.',
      'For spray foam, follow the manufacturer\'s ventilation and re-entry times and install required thermal/ignition barriers; post the insulation certificate where required.',
    ) },
    drywall: { title: 'Drywall and finishing', text: lines(
      'Install the correct board type for each location, including approved wet-area substrates; maintain fire/sound assemblies where required.',
      'Tape, finish and sand to the specified finish level.',
      'Repair trade-caused damage and leave surfaces ready for primer.',
    ) },
    tiling: { title: 'Tile and waterproofing', text: lines(
      'Verify substrate flatness, deflection, moisture conditions and the approved tile layout before installation.',
      'Use a complete manufacturer-compatible waterproofing assembly, including corners, penetrations, niches and transitions; arrange required flood testing/inspection for shower pans.',
      'Confirm tile, grout and trim selections, movement joints, slopes, drain heights, lippage and pattern before setting.',
      'Protect finished tile; do not grout or seal before specified cure times.',
    ) },
    flooring: { title: 'Flooring', text: lines(
      'Confirm substrate flatness, dryness, stability, transitions and manufacturer acclimation requirements.',
      'Use the specified underlayment, adhesives, expansion clearances and moisture mitigation where required.',
      'Maintain smooth, safe transitions and clean edges.',
      'Protect completed flooring from subsequent trades.',
    ) },
    carpentry: { title: 'Cabinetry, millwork and countertops', text: lines(
      'Field-verify dimensions, finished floor heights, appliance and fixture clearances and wall conditions before fabrication or installation.',
      'Install level, plumb, securely anchored cabinetry with appropriate blocking; align reveals, hardware and doors.',
      'Coordinate vanity sinks, countertop templates, outlets, trim and splash details; correct fit issues.',
      'Do not modify approved custom designs without written approval.',
    ) },
    painting: { title: 'Painting and wallpaper', text: lines(
      'Confirm the approved color, sheen, wallcovering and finish schedule; provide samples when requested.',
      'Properly clean, patch, sand, prime and prepare surfaces before finish coats.',
      'Maintain clean cut lines, even coverage and manufacturer-required drying conditions; address flashing, drips and visible defects.',
      'For wallpaper, verify wall preparation, pattern match, seams and adhesive compatibility.',
    ) },
    other: { title: 'Glass, shower enclosures and other specialty work', text: lines(
      'Field-measure after final tile completion; verify substrate backing, door swing, clearances and hardware finish.',
      'Use specified safety glazing and compatible mounting/sealant methods.',
      'Protect waterproofing while drilling; report missing blocking or unsuitable substrates before installation.',
      'Test operation, alignment, seals and leaks, and communicate cure time.',
    ) },
  },
  incorporation: 'The parties acknowledge receipt of Exhibit A and the applicable Exhibit B trade section and incorporate them into this Subcontract Agreement. If they conflict, Exhibit C (this job\'s Scope of Work) controls the scope of work, and the signed agreement and applicable law control payment and legal rights.',
};

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

// Fills anything missing from the built-in text, so a saved version always has
// every trade (including trades added to the app later).
export function normalizeStandards(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const general = Array.isArray(r.general)
    ? r.general.map((s) => ({ title: str(s?.title, 120), text: str(s?.text, MAX_SECTION) })).filter((s) => s.title || s.text)
    : BUILT_IN_STANDARDS.general;
  const trades = {};
  for (const key of STANDARDS_TRADES) {
    const t = r.trades?.[key];
    trades[key] = t && typeof t === 'object'
      ? { title: str(t.title, 120), text: str(t.text, MAX_SECTION) }
      : BUILT_IN_STANDARDS.trades[key];
  }
  return {
    intro: typeof r.intro === 'string' ? str(r.intro, MAX_SECTION) : BUILT_IN_STANDARDS.intro,
    general,
    trades,
    incorporation: typeof r.incorporation === 'string' ? str(r.incorporation, MAX_SECTION) : BUILT_IN_STANDARDS.incorporation,
  };
}

// The built-in text counts as version 1.
export const BUILT_IN_VERSION = { version_no: 1, published_at: null, notes: 'Built-in (October 2026)', content: BUILT_IN_STANDARDS };

export const versionLabel = (v) => `Version ${v.version_no}${v.published_at
  ? ` · ${new Date(v.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  : ' · built-in, October 2026'}`;

export const bullets = (text) => String(text ?? '').split('\n').map((l) => l.replace(/^\s*[•\-*]\s*/, '').trim()).filter(Boolean);

// Latest published version, or the built-in one. Resolves to
// { version, missing } — missing = migration 060 not run yet.
export async function loadLatestStandards(supabase) {
  const { data, error } = await supabase.from('sub_standards_versions')
    .select('version_no, content, notes, published_at').order('version_no', { ascending: false }).limit(1);
  if (error) return { version: BUILT_IN_VERSION, missing: /sub_standards_versions|schema cache|does not exist/i.test(error.message ?? ''), error };
  const v = data?.[0];
  return { version: v ? { ...v, content: normalizeStandards(v.content) } : BUILT_IN_VERSION, missing: false };
}
