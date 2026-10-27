// Welcome & Capabilities Package (Sales → Welcome Package): the client-facing
// document sent at the start of a project. Admins edit it in the app; it is
// saved in welcome_package (migration 061) and printed / saved as PDF from the
// browser. The built-in content below is the first version.
//
// Content: { cover, contact, sections: [{ id, kind, newPage, eyebrow, title, intro, ... }] }
//   text     body (each line a paragraph; ## heading, - bullet, **bold**)
//   quote    text (highlighted quote)
//   callout  text (gold highlight box)
//   cards    items [{ title, text }] (two per row)
//   table    col1, col2, items [{ title, text }]
//   steps    items [{ title, text }] (numbered; consecutive steps sections keep counting)
//   contact  closing box with the contact details

import { parseBody } from './proposalTemplate';

export const SECTION_KINDS = {
  text: 'Text',
  quote: 'Quote',
  callout: 'Highlight box',
  cards: 'Cards',
  table: 'Table',
  steps: 'Numbered steps',
  contact: 'Contact box',
};
export const ITEM_KINDS = new Set(['cards', 'table', 'steps']);
export const MAX_TEXT = 4000;

const id = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `w${Date.now()}${Math.random().toString(16).slice(2)}`);
const items = (...pairs) => pairs.map(([title, text]) => ({ title, text }));
const sec = (kind, fields) => ({ id: id(), kind, newPage: false, eyebrow: '', title: '', intro: '', ...fields });

export function newSection(kind) {
  if (kind === 'table') return sec(kind, { col1: 'Service', col2: 'What is typically included', items: items(['', '']) });
  if (ITEM_KINDS.has(kind)) return sec(kind, { items: items(['', '']) });
  if (kind === 'contact') return sec(kind, { title: 'Let’s create your home together' });
  return sec(kind, kind === 'text' ? { body: '' } : { text: '' });
}

export function defaultWelcomePackage() {
  return {
    cover: {
      eyebrow: 'Welcome & Capabilities Package',
      title: 'Welcome to Orozco Homes',
      subtitle: 'A full-service, design-build remodeling experience',
    },
    contact: {
      name: 'Mary-Blake Orozco', title: 'Owner', phone: '757-513-2593', email: 'mborozco@orozcohomes.com',
      license: 'Licensed & Insured Class A Contractor', tagline: 'Design & Construction · Virginia Beach, VA',
    },
    sections: [
      sec('quote', {
        newPage: true, eyebrow: 'Our Promise to You', title: 'What it means to experience a stress-free remodel',
        text: '“A home remodel should transform your life, not disrupt your sanity.”',
      }),
      sec('text', {
        body: 'We believe that a beautiful home should not come at the cost of your peace of mind. Most homeowners dread remodeling because of scheduling chaos, hidden surprises and poor communication. We started our company to change that. When you partner with us, we take full responsibility for your entire project, from the initial sketch to the final sweep. Here is exactly what you can expect when you trust us with your home.',
      }),
      sec('steps', {
        items: items(
          ['One Hand to Shake — Complete Project Accountability', 'You will never have to manage multiple contractors, track down material deliveries or resolve disputes between designers, architects and builders. We design the project, guide and source your finishes, coordinate licensed and insured trades and the permits, and manage the build timeline. If an issue arises, it is our job to solve it, and we keep you informed along the way.'],
          ['Proactive Communication — No “Black Boxes”', 'You will never have to text us asking, “What is happening next week?” We believe that certainty eliminates anxiety. You will receive regular progress updates in your project portal, showing the current phase, what was completed and what is coming next, and we let you know right away about any adjustments.'],
          ['Respect for Your Sanctuary', 'We never forget that your project site is first and foremost your home. Our trade partners sign our written Code of Conduct, which safeguards your comfort and respects your neighbors: daily site cleanup, strict dust containment, careful protection of your finishes and non-remodeled living spaces, and strict boundaries, so workers never use your bathrooms, kitchen or living areas.'],
        ),
      }),
      sec('quote', {
        newPage: true, eyebrow: '1 · What We Stand For', title: 'Our mission',
        text: '“Our goal is to manage the entire remodeling and building process for your space so you can enjoy creating your home without having to become your own designer, purchaser, scheduler and general contractor.”',
      }),
      sec('text', {
        body: 'A successful remodel involves much more than construction. It requires hundreds of decisions, multiple specialized trades, material procurement, scheduling, design coordination, inspections, problem-solving and quality control. Orozco Homes provides a full-service, design-build remodeling experience designed to take that responsibility off the homeowner.',
      }),
      sec('cards', {
        title: 'Our philosophy',
        items: items(
          ['Collaboration with you', 'We work collaboratively with you to develop the layouts, establish the design direction and guide material, fixture, finish and color selections, creating spaces that reflect your priorities.'],
          ['Beauty that lasts', 'Every design balances aesthetics, functionality, constructability and long-term durability. Wet areas are properly waterproofed using professional installation methods and industry best practices.'],
          ['Transparency', 'We align scope and selections with your desired investment level while maintaining transparency throughout, from preliminary estimate to final construction agreement.'],
          ['Built to code', 'All applicable work is completed in accordance with local building codes, manufacturer requirements and professional construction standards, with required permits and inspections coordinated by us.'],
        ),
      }),
      sec('table', {
        newPage: true, eyebrow: '2 · What Differentiates Us', title: 'More than a contractor',
        intro: 'Our team manages every part of your remodel, so you have one partner instead of a long list of vendors, trades and schedules to coordinate.',
        col1: 'We manage', col2: 'What it means for you',
        items: items(
          ['Client Communication', 'A clear point of contact throughout design, planning and construction.'],
          ['Design & Space Planning', 'Layouts that balance beauty, functionality and the existing structure of your home.'],
          ['Professional Design Guidance', 'Our designer guides cabinetry, tile, plumbing fixtures, lighting, carpentry, finishes and other selections.'],
          ['Trade Coordination', 'Expert plumbers, electricians, carpenters, tile installers, painters, HVAC professionals and other specialized trades.'],
          ['Architectural & Engineering Coordination', 'Architects, engineers and other professionals when required by the project.'],
          ['Permitting & Inspections', 'Required permits, inspections and applicable construction requirements.'],
          ['Material Procurement', 'We order and coordinate materials, so you do not manage vendors, deliveries and specifications.'],
          ['Project Scheduling', 'Trades and materials sequenced to keep construction moving efficiently.'],
          ['Construction Management', 'From demolition through completion, including the day-to-day decisions that arise.'],
          ['Quality Control', 'Workmanship and installation reviewed throughout, with corrections coordinated when necessary.'],
        ),
      }),
      sec('cards', {
        newPage: true, title: 'How we work differently',
        items: items(
          ['Plan first, then build', 'No demolition or construction begins until all major selections are finalized and documented, to ensure efficiency, cost control and a seamless build process.'],
          ['Clear, local pricing', 'Estimates are built line by line from current Virginia Beach / Hampton Roads labor and material pricing. Your proposal lists the allowances included for the products you select.'],
          ['Allowances you can track', 'Each selection is compared with its allowance. If a selection costs more, the difference is added by change order; if it costs less, it is credited.'],
          ['Nothing changes without your approval', 'Extra or changed work is documented as a change order that you review and approve before it is added to your project.'],
          ['Your own project portal', 'One place for your project: phases and progress updates, a progress photo gallery, design selections to approve, messages, and proposals and agreements to review and sign electronically.'],
          ['Trade partners held to our standards', 'Our trade partners are required to keep a current certificate of insurance and the required Virginia licenses, and to sign our written Subcontractor Standards and a Scope of Work for your job before starting.'],
          ['Workmanship warranty', 'Our Construction Agreement includes a workmanship warranty: 12 months from substantial completion unless your agreement states otherwise. Manufacturer warranties on materials and fixtures are passed through to you.'],
          ['Honest about remodeling', 'Existing homes can hide water damage, prior installations or outdated systems. We work to identify risks early and explain any verified unforeseen condition before work continues.'],
        ),
      }),
      sec('callout', {
        newPage: true, eyebrow: '3 · Our Remodeling Services', title: 'What we build',
        intro: 'Every project is priced and planned from our detailed remodeling scopes for the Virginia Beach and Hampton Roads area. Typical work for each service is listed below; your final scope is confirmed during design and planning.',
        text: '**Every project starts with a design consultation and selections.** Where the work requires them, we also provide permit plans, building permits and inspections, engineering, site protection and dust barriers, and debris removal, and our trades clean the work area daily.',
      }),
      sec('table', {
        title: 'Bathrooms', col1: 'Service', col2: 'What is typically included',
        items: items(
          ['Bathroom Remodel (small, medium & large)', 'Demolition, plumbing and electrical rough-in, waterproofing, floor and wall tile, shower pan and glass enclosure, vanity and sink, toilet, tub (medium and large baths), faucets and trim, lighting, mirror or medicine cabinet, accessories, paint and trim. Custom millwork for larger baths.'],
          ['Add a Shower', 'Shower framing and blocking, new drain and vent tie-in, valve rough-in, shower pan and waterproofing, wall tile, glass door or enclosure, trim kit and head, exhaust fan, GFCI and light.'],
          ['Tub-to-Shower Conversion', 'Tub removal, valve relocation and drain conversion, shower pan and waterproofing, wall tile, glass door or enclosure, trim kit and head.'],
          ['Bathroom Refresh', 'New vanity and top, faucet, toilet, mirror or medicine cabinet, lighting and accessories, with hookups in the same locations (no tile or plumbing moves).'],
          ['Aging-in-Place / Accessible Bath', 'Curbless shower with waterproofing, non-slip floor tile, widened 36" doorway, grab bars with blocking, comfort-height toilet, accessible vanity, handheld shower.'],
          ['Second Vanity / Double Sink', 'Double vanity cabinet, countertop with two sinks, two faucets, plumbing branch for the second sink, lighting and mirrors.'],
        ),
      }),
      sec('table', {
        title: 'Kitchens', col1: 'Service', col2: 'What is typically included',
        items: items(
          ['Kitchen Remodel (small, medium & large)', 'Lower and upper cabinets, quartz or granite countertops, backsplash tile, island (medium and large), range or cooktop with hood, refrigerator, dishwasher, microwave, sink and faucet, flooring, lighting, plumbing and electrical rough-in, paint. Custom millwork for larger kitchens.'],
          ['Kitchen Refresh', 'Cabinet painting (doors and boxes), new hardware, new countertops and backsplash tile, sink and faucet, under-cabinet lighting and wall paint.'],
          ['Kitchen Island Addition', 'Island cabinets and countertop, island outlets and circuit, pendant lights, flooring patch.'],
        ),
      }),
      sec('table', {
        title: 'Additions & Major Projects', col1: 'Service', col2: 'What is typically included',
        items: items(
          ['Home Addition', 'Structural engineering, footings and slab, framing and sheathing, roofing, siding, windows and exterior door, electrical, plumbing and HVAC, insulation, drywall, flooring, trim and paint.'],
          ['Portico (Covered Entry)', 'Footings, structural columns, beam and header work, roof framing and roofing, soffit and fascia, paver, slate or brick entry floor, exterior lighting and paint.'],
          ['Garage Conversion', 'Slab repair and leveling, garage door infill, new window and door, electrical upgrade, HVAC mini-split, insulation and drywall, flooring, trim, paint and lighting; plumbing if a bath is added.'],
          ['Attic Conversion', 'Joist reinforcement and subfloor, staircase to code, egress window, spray foam insulation at the roofline, HVAC mini-split, electrical, drywall, flooring, lighting, paint and trim.'],
          ['Full House Renovation', 'Structural repairs, plumbing, electrical and HVAC replacement, roof, windows and siding, insulation and drywall, kitchen and bathrooms, flooring, trim, doors and paint.'],
        ),
      }),
      sec('table', {
        title: 'Interior Renovations', col1: 'Service', col2: 'What is typically included',
        items: items(
          ['Wall Removal / Open Concept', 'Wall removal, beam and temporary shoring for load-bearing walls, relocation of switches, outlets and lights, drywall and ceiling patch, flooring patch and paint.'],
          ['Fireplace Removal + Built-In', 'Fireplace and hearth removal, framing infill, chimney cap and roof patch, built-in cabinets and shelving with lighting.'],
          ['Flooring Replacement', 'Removal of old flooring, subfloor prep and leveling, LVP or hardwood, transitions and baseboard.'],
          ['Interior Painting & Popcorn Ceiling Removal', 'Protection and masking, popcorn ceiling removal with testing, skim coat, walls, ceilings and trim.'],
          ['Trim & Molding', 'Baseboard, crown molding, door and window casing, accent walls and wainscoting, caulk and paint.'],
          ['Laundry Room / Mudroom', 'Cabinets and countertop, utility sink and washer box, dryer circuit and lighting, bench, hooks and cubbies, flooring.'],
          ['Closets, Home Office & Built-Ins', 'Custom shelving and rods, drawers, desk, cabinets and shelving, outlets, data lines and lighting.'],
          ['Staircase Remodel', 'Treads and risers, railing and balusters, newel posts, stain or paint.'],
        ),
      }),
      sec('table', {
        title: 'Exterior & Outdoor', col1: 'Service', col2: 'What is typically included',
        items: items(
          ['Deck (New or Rebuild)', 'Footings and posts, pressure-treated framing, decking (pressure-treated or composite), railing and stairs.'],
          ['Screened Porch Conversion', 'Screen framing system and screen door, ceiling fan and lighting, beadboard ceiling, flooring or deck coating, paint or stain.'],
          ['Windows, Exterior & Patio Doors', 'Removal of old units, installation with flashing, sill pans and insulation, hardware and lockset, interior and exterior trim and paint.'],
          ['Siding Repair / Replacement', 'Removal of old siding, sheathing repair, housewrap and flashing, vinyl or fiber cement siding, trim, corners and soffit.'],
        ),
      }),
      sec('table', {
        title: 'Repairs & Building Health', col1: 'Service', col2: 'What is typically included',
        items: items(
          ['Crawlspace Encapsulation', 'Vapor barrier on walls and floor, sealed vents and rim joists, insulation, dehumidifier and sealed access door.'],
          ['Water Damage / Mold Repair', 'Removal of damaged materials, drying and dehumidification, mold treatment, framing and subfloor repair, drywall, flooring and paint.'],
        ),
      }),
      sec('text', { newPage: true, eyebrow: 'Working Together', title: 'The seamless journey ahead', body: '' }),
      sec('steps', {
        title: 'Phase 1 · Precision Planning',
        intro: 'We finalize every detail, drawing and fixture choice before construction begins, so your Construction Agreement is built on a finished plan.',
        items: items(
          ['Pre-Consultation Questionnaire', 'You share your project, your vision and your goals so we can prepare for our first meeting and make sure we are the right fit.'],
          ['Consultation & Site Visit', 'We visit your home, listen to your priorities and review existing conditions.'],
          ['Project Proposal', 'You receive a Project Proposal with a preliminary scope, estimated timeline and estimated investment range, which you can review and sign online.'],
          ['Design & Selections', 'With our designer, we develop the layout and guide your selections. You approve each selection in your project portal and can compare it with its allowance. No demolition begins until all major selections are finalized and documented.'],
          ['Construction Agreement', 'Once scope, selections and pricing are final, you receive a Construction Agreement with the timeline, total investment and payment schedule, and a confirmed start date.'],
        ),
      }),
      sec('steps', {
        title: 'Phase 2 · Secure Sourcing',
        intro: 'We order and coordinate your materials so you never manage vendors, deliveries or specifications.',
        items: items(['Materials Ordered & Tracked', 'Materials are ordered, tracked and scheduled with the trades, to keep construction moving efficiently.']),
      }),
      sec('steps', {
        title: 'Phase 3 · Managed Build',
        intro: 'Our licensed, insured trade partners handle the physical transformation, coordinated by your Orozco Homes point of contact.',
        items: items(
          ['Construction', 'We manage every trade from demolition through completion. Follow each phase with progress updates and photos in your portal.'],
          ['Changes, in Writing', 'If something changes or a concealed condition is found, it is documented as a change order that you review and approve before it is added.'],
        ),
      }),
      sec('steps', {
        title: 'Phase 4 · Flawless Handover',
        intro: 'Final cleaning and thorough quality checks, presenting your newly reimagined home as you envisioned it.',
        items: items(['Completion & Warranty', 'Punch list and closeout, backed by our workmanship warranty and the manufacturers’ warranties.']),
      }),
      sec('contact', { title: 'Let’s create your home together' }),
    ],
  };
}

const str = (v, max = MAX_TEXT) => (typeof v === 'string' ? v.slice(0, max) : '');

// Saved content → a complete, safe structure (missing parts come from the built-in version).
export function normalizeWelcomePackage(raw) {
  const def = defaultWelcomePackage();
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.sections)) return def;
  const pick = (obj, base) => Object.fromEntries(Object.keys(base).map((k) => [k, typeof obj?.[k] === 'string' ? str(obj[k], 300) : base[k]]));
  return {
    cover: pick(raw.cover, def.cover),
    contact: pick(raw.contact, def.contact),
    sections: raw.sections.filter((s) => s && SECTION_KINDS[s.kind]).map((s) => ({
      ...newSection(s.kind),
      id: typeof s.id === 'string' ? s.id : id(),
      newPage: !!s.newPage,
      eyebrow: str(s.eyebrow, 120), title: str(s.title, 200), intro: str(s.intro),
      ...(s.kind === 'text' ? { body: str(s.body) } : {}),
      ...(['quote', 'callout'].includes(s.kind) ? { text: str(s.text) } : {}),
      ...(s.kind === 'table' ? { col1: str(s.col1, 60), col2: str(s.col2, 60) } : {}),
      ...(ITEM_KINDS.has(s.kind) ? { items: (Array.isArray(s.items) ? s.items : []).slice(0, 60).map((it) => ({ title: str(it?.title, 200), text: str(it?.text) })) } : {}),
    })),
  };
}

// ── Printable HTML (preview and Print / Save as PDF) ─────────────────────────
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inline = (t) => esc(t).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

function bodyHtml(text) {
  return parseBody(text).map((b) => {
    if (b.type === 'heading') return `<h3>${inline(b.text)}</h3>`;
    if (b.type === 'para') return `<p>${inline(b.text)}</p>`;
    return `<ul>${b.items.map((it) => `<li>${inline(it.text)}${it.children.length ? `<ul>${it.children.map((c) => `<li>${inline(c)}</li>`).join('')}</ul>` : ''}</li>`).join('')}</ul>`;
  }).join('');
}

function headingHtml(s) {
  if (s.eyebrow) return `<p class="eyebrow">${esc(s.eyebrow)}</p><h1>${esc(s.title)}</h1><div class="rule"></div>`;
  return s.title ? `<h2>${esc(s.title)}</h2>` : '';
}

export function welcomePackageHtml(content, { logoUrl = '/orozco-homes-logo.png', autoPrint = false } = {}) {
  const c = normalizeWelcomePackage(content);
  const k = c.contact;
  let step = 0;
  let prevKind = null;
  const sections = c.sections.map((s) => {
    if (s.kind !== 'steps' || prevKind !== 'steps') step = 0;
    prevKind = s.kind;
    const head = headingHtml(s) + (s.intro ? `<p class="lead">${inline(s.intro)}</p>` : '');
    let inner = '';
    if (s.kind === 'text') inner = bodyHtml(s.body);
    else if (s.kind === 'quote') inner = s.text ? `<blockquote>${inline(s.text)}</blockquote>` : '';
    else if (s.kind === 'callout') inner = s.text ? `<div class="callout">${inline(s.text)}</div>` : '';
    else if (s.kind === 'cards') inner = `<div class="cards">${s.items.map((it) => `<div class="card"><h4>${inline(it.title)}</h4><p>${inline(it.text)}</p></div>`).join('')}</div>`;
    else if (s.kind === 'table') inner = `<table><thead><tr><th>${esc(s.col1)}</th><th>${esc(s.col2)}</th></tr></thead><tbody>${s.items.map((it) => `<tr><td class="name">${inline(it.title)}</td><td>${inline(it.text)}</td></tr>`).join('')}</tbody></table>`;
    else if (s.kind === 'steps') inner = `<div class="steps">${s.items.map((it) => `<div class="step"><div class="num">${++step}</div><div class="txt"><h4>${inline(it.title)}</h4><p>${inline(it.text)}</p></div></div>`).join('')}</div>`;
    else if (s.kind === 'contact') inner = `<div class="contact"><p class="ct">${esc(s.title)}</p><p class="cn">${esc(k.name)}${k.title ? `, ${esc(k.title)}` : ''}</p><p>${esc(k.phone)} &nbsp;·&nbsp; ${esc(k.email)}</p><p class="cl">${esc(k.license)} &nbsp;·&nbsp; ${esc(k.tagline)}</p></div>`;
    // The contact box shows its title inside the box.
    return `<section class="${s.newPage ? 'newpage' : ''}">${s.kind === 'contact' ? '' : head}${inner}</section>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Orozco Homes — ${esc(c.cover.eyebrow || 'Welcome Package')}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10.5pt;line-height:1.5;color:#374151;background:#F5F4F0}
  .sheet{max-width:8.5in;margin:0 auto;padding:.7in .8in .6in}
  .cover{background:#002147;color:#fff;min-height:11in;display:flex;flex-direction:column;align-items:center;justify-content:space-between;text-align:center;padding:1.1in .8in .9in;border-top:.18in solid #D4AF37;border-bottom:.12in solid #D4AF37}
  .cover img{width:1.9in;border-radius:6px}
  .cover .band{background:#003166;width:100%;padding:.35in .4in}
  .cover .eb{color:#D4AF37;font-weight:700;font-size:9.5pt;letter-spacing:.14em;text-transform:uppercase}
  .cover h1{font-size:30pt;line-height:1.15;margin:.08in 0;color:#fff}
  .cover .sub{color:#C9D3E0;font-size:12pt}
  .cover .who{font-weight:700;font-size:11pt}
  .cover .meta{color:#C9D3E0;font-size:10pt;line-height:1.7}
  .cover .tag{color:#D4AF37;font-weight:700;font-size:8.5pt;letter-spacing:.14em;text-transform:uppercase;margin-top:.25in}
  section{margin-bottom:16px}
  .eyebrow{color:#D4AF37;font-weight:700;font-size:8.5pt;letter-spacing:.12em;text-transform:uppercase;margin-bottom:4px}
  h1{color:#002147;font-size:23pt;line-height:1.2;margin-bottom:8px}
  .rule{width:1.1in;height:3px;background:#D4AF37;margin-bottom:14px}
  h2{color:#002147;font-size:13.5pt;margin:6px 0 6px}
  h3{color:#002147;font-size:11pt;margin:10px 0 4px}
  h4{color:#002147;font-size:10.8pt;margin-bottom:3px}
  p{margin-bottom:7px}
  .lead{font-size:11.5pt;line-height:1.55;color:#1F2937;margin-bottom:10px}
  ul{margin:0 0 8px 20px}
  li{margin-bottom:3px}
  blockquote{background:#fff;border-left:4px solid #D4AF37;padding:14px 18px;color:#002147;font-style:italic;font-size:13pt;line-height:1.5;margin-bottom:10px}
  .callout{background:#F6EFD6;border:1px solid #D4AF37;padding:10px 14px;color:#002147;font-size:9.8pt;margin-bottom:6px}
  .cards{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .card{background:#fff;border:1px solid #E8E6E1;border-top:3px solid #D4AF37;padding:11px 13px;break-inside:avoid}
  .card p{font-size:9.5pt;margin:0}
  table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #E8E6E1;font-size:9.3pt}
  thead{display:table-header-group}
  th{background:#002147;color:#fff;text-align:left;font-size:8pt;letter-spacing:.08em;text-transform:uppercase;padding:6px 9px}
  td{padding:6px 9px;border-bottom:1px solid #E8E6E1;vertical-align:top}
  tr{break-inside:avoid}
  tbody tr:nth-child(even) td{background:#FBFAF7}
  td.name{width:2.2in;font-weight:700;color:#002147}
  .steps{display:flex;flex-direction:column;gap:5px}
  .step{display:flex;background:#fff;break-inside:avoid}
  .step .num{background:#002147;color:#D4AF37;font-weight:700;font-size:15pt;width:.55in;flex:none;text-align:center;padding-top:8px}
  .step .txt{padding:9px 14px;border:1px solid #E8E6E1;border-left:none;flex:1}
  .step .txt p{font-size:9.5pt;margin:0}
  .contact{background:#002147;border-top:3px solid #D4AF37;color:#fff;padding:14px 18px 16px;break-inside:avoid}
  .contact p{margin:0 0 2px}.contact .ct{font-weight:700;font-size:14pt;margin-bottom:6px}
  .contact .cn{color:#D4AF37;font-weight:700}.contact .cl{color:#C9D3E0;font-size:9pt}
  .foot{margin-top:24px;padding-top:8px;border-top:1px solid #E8E6E1;font-size:8pt;color:#6B7280;text-align:center}
  @page{size:letter;margin:.6in .7in}
  @page:first{margin:0}
  @media print{
    body{background:#fff}
    .sheet{padding:0;max-width:none}
    .cover{min-height:11in;break-after:page}
    section.newpage{break-before:page}
    h1,h2,h3,.eyebrow{break-after:avoid}
  }
</style></head><body>
<div class="cover">
  <img src="${esc(logoUrl)}" alt="Orozco Homes">
  <div class="band"><p class="eb">${esc(c.cover.eyebrow)}</p><h1>${esc(c.cover.title)}</h1><p class="sub">${esc(c.cover.subtitle)}</p></div>
  <div><p class="who">${esc(k.name)}${k.title ? `, ${esc(k.title)}` : ''}</p><p class="meta">${esc(k.phone)} &nbsp;·&nbsp; ${esc(k.email)}<br>${esc(k.license)}</p><p class="tag">${esc(k.tagline)}</p></div>
</div>
<div class="sheet">
${sections}
<p class="foot">Orozco Homes · ${esc(k.tagline)} · ${esc(k.phone)} · ${esc(k.email)}</p>
</div>
${autoPrint ? '<script>window.onload=function(){window.print()}</script>' : ''}
</body></html>`;
}
