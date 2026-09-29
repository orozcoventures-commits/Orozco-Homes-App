// src/utils/contractHelpers.js — Orozco Homes Contract Template Engine

export const CONTRACT_FIELDS = [
  // ── Section 1: Parties ─────────────────────────────────────────────────────
  { key: 'client_name',            label: 'Client Full Name',           section: 'parties',  type: 'text',     required: true },
  { key: 'client_address',         label: 'Client Mailing Address',     section: 'parties',  type: 'text',     required: true },
  { key: 'client_phone',           label: 'Client Phone',               section: 'parties',  type: 'text',     required: true },
  { key: 'client_email',           label: 'Client Email',               section: 'parties',  type: 'email',    required: true },
  { key: 'project_address',        label: 'Project / Property Address', section: 'parties',  type: 'text',     required: true },
  { key: 'contract_date',          label: 'Contract Date',              section: 'parties',  type: 'date',     required: true },

  // ── Section 2: Scope ───────────────────────────────────────────────────────
  { key: 'project_type',           label: 'Project Type (e.g., Master Bath Remodel)', section: 'scope', type: 'text', required: true },
  { key: 'scope_of_work',          label: 'Detailed Scope of Work',     section: 'scope',    type: 'textarea', required: true,
    placeholder: 'Describe all work to be performed: demo, tile, fixtures, framing, electrical, plumbing, painting, etc.' },
  { key: 'materials_spec',         label: 'Materials & Specifications', section: 'scope',    type: 'textarea', required: false,
    placeholder: 'List key materials, brands, model numbers, or reference the attached Selections Sheet.' },
  { key: 'exclusions',             label: 'Exclusions / Not Included',  section: 'scope',    type: 'textarea', required: false,
    placeholder: 'Any work NOT included in this contract (e.g., landscaping, appliance installation, furniture).' },

  // ── Section 3: Price & Payment ─────────────────────────────────────────────
  { key: 'total_cost',             label: 'Total Contract Price ($)',   section: 'payment',  type: 'number',   required: true },
  { key: 'deposit_amount',         label: 'Deposit Amount ($)',         section: 'payment',  type: 'number',   required: true },
  { key: 'deposit_due_date',       label: 'Deposit Due Date',          section: 'payment',  type: 'date',     required: true },
  { key: 'milestone_1_desc',       label: 'Milestone 1 Description',   section: 'payment',  type: 'text',     required: false,
    placeholder: 'e.g., Rough-in / framing complete' },
  { key: 'milestone_1_amount',     label: 'Milestone 1 Amount ($)',    section: 'payment',  type: 'number',   required: false },
  { key: 'milestone_2_desc',       label: 'Milestone 2 Description',   section: 'payment',  type: 'text',     required: false,
    placeholder: 'e.g., Tile & fixtures installed' },
  { key: 'milestone_2_amount',     label: 'Milestone 2 Amount ($)',    section: 'payment',  type: 'number',   required: false },
  { key: 'final_payment_amount',   label: 'Final Payment Amount ($)',  section: 'payment',  type: 'number',   required: true },
  { key: 'payment_method',         label: 'Accepted Payment Methods',  section: 'payment',  type: 'text',     required: false,
    placeholder: 'e.g., Check, ACH, Zelle — no credit cards' },

  // ── Section 4: Timeline ────────────────────────────────────────────────────
  { key: 'start_date',             label: 'Estimated Start Date',      section: 'timeline', type: 'date',     required: true },
  { key: 'substantial_completion', label: 'Substantial Completion Date', section: 'timeline', type: 'date',   required: true },
  { key: 'work_hours',             label: 'Work Hours',                section: 'timeline', type: 'text',     required: false,
    placeholder: 'e.g., Mon–Fri, 7:30 AM – 5:00 PM' },

  // ── Section 8: Warranty ────────────────────────────────────────────────────
  { key: 'workmanship_warranty_months', label: 'Workmanship Warranty (months)', section: 'warranty', type: 'number', required: false },

  // ── Section 10: Signatures ─────────────────────────────────────────────────
  { key: 'contractor_name',        label: 'Contractor Signatory Name', section: 'signatures', type: 'text',   required: true,
    defaultValue: 'Carlos Orozco' },
  { key: 'contractor_title',       label: 'Contractor Title',          section: 'signatures', type: 'text',   required: false,
    defaultValue: 'Owner, Orozco Homes LLC' },
  { key: 'contractor_license',     label: 'VA Contractor License #',   section: 'signatures', type: 'text',   required: false },
];

export const SECTION_LABELS = {
  parties:    '1. Parties & Project Identification',
  scope:      '2. Scope of Work',
  payment:    '3. Contract Price & Payment Schedule',
  timeline:   '4. Timeline & Work Hours',
  warranty:   '8. Warranties',
  signatures: '10. Signatures',
};

/** Replace all {{key}} placeholders in the template string with values */
export function fillTemplate(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = values[key];
    if (val === undefined || val === null || val === '') return `[${key.toUpperCase()}]`;
    return val;
  });
}

/** Format a currency string */
export function fmtDollars(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return val || '___';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Format a date string like "September 14, 2026" */
export function fmtDate(val) {
  if (!val) return '___';
  try {
    const [y, m, d] = val.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return val;
  }
}

/** Build a formatted payment schedule paragraph from form values */
export function buildPaymentSchedule(v) {
  const rows = [];
  rows.push(`  a. Deposit: ${fmtDollars(v.deposit_amount)} due on or before ${fmtDate(v.deposit_date || v.deposit_due_date)}.`);
  if (v.milestone_1_desc && v.milestone_1_amount)
    rows.push(`  b. Draw 1 – ${v.milestone_1_desc}: ${fmtDollars(v.milestone_1_amount)}.`);
  if (v.milestone_2_desc && v.milestone_2_amount)
    rows.push(`  c. Draw 2 – ${v.milestone_2_desc}: ${fmtDollars(v.milestone_2_amount)}.`);
  rows.push(`  ${rows.length > 1 ? String.fromCharCode(96 + rows.length + 1) : 'b'}. Final Payment: ${fmtDollars(v.final_payment_amount)} upon substantial completion.`);
  return rows.join('\n');
}

/** Produce the full resolved contract text ready to display */
export function buildContractText(v) {
  const paymentSchedule = buildPaymentSchedule(v);
  const warrantyMonths  = v.workmanship_warranty_months || '12';

  return `RESIDENTIAL REMODELING CONTRACT

OROZCO HOMES LLC
Licensed General Contractor — Commonwealth of Virginia
License No.: ${v.contractor_license || '[LICENSE #]'}
Phone: (571) 234-5678  |  Email: orozcoventures@gmail.com

════════════════════════════════════════════════════════════════

1. PARTIES AND PROJECT IDENTIFICATION

This Residential Remodeling Contract ("Agreement") is entered into as of ${fmtDate(v.contract_date)}, by and between:

CONTRACTOR:
  Orozco Homes LLC
  ${v.contractor_name || 'Carlos Orozco'}, ${v.contractor_title || 'Owner'}
  Licensed General Contractor, Commonwealth of Virginia

CLIENT:
  ${v.client_name || '[CLIENT NAME]'}
  ${v.client_address || '[CLIENT ADDRESS]'}
  Phone: ${v.client_phone || '[PHONE]'}
  Email: ${v.client_email || '[EMAIL]'}

PROJECT LOCATION:
  ${v.project_address || '[PROJECT ADDRESS]'}

Contractor and Client are collectively referred to herein as the "Parties."

════════════════════════════════════════════════════════════════

2. SCOPE OF WORK

Contractor agrees to furnish all labor, materials, equipment, and supervision necessary to complete the following remodeling project ("Work"):

Project Type: ${v.project_type || '[PROJECT TYPE]'}

Scope of Work:
${v.scope_of_work || '[Detailed scope to be inserted]'}

Materials and Specifications:
${v.materials_spec || 'Refer to the attached Material Selections Sheet, incorporated herein by reference.'}

Exclusions (Work NOT included in this Contract):
${v.exclusions || 'None specified. Any work not explicitly listed above is excluded.'}

All Work shall be performed in a workmanlike manner consistent with industry standards and in compliance with all applicable Virginia building codes and local ordinances. Any changes to the Scope of Work must be authorized in writing via a Change Order (see Section 5).

════════════════════════════════════════════════════════════════

3. CONTRACT PRICE AND PAYMENT SCHEDULE

3.1  Total Contract Price
The total fixed price for all Work described in Section 2 is:

  TOTAL:  ${fmtDollars(v.total_cost)}

This price is inclusive of all labor, standard materials, equipment, disposal, and Contractor overhead and profit. It does not include permit fees (see Section 6) unless explicitly stated above.

3.2  Payment Schedule
Payments shall be made according to the following schedule:

${paymentSchedule}

3.3  Payment Terms
Payments are due within three (3) business days of the milestone trigger event or invoice date noted above. Accepted payment methods: ${v.payment_method || 'check, ACH bank transfer, or Zelle'}. Contractor reserves the right to suspend Work if any scheduled payment is more than five (5) calendar days past due. A late fee of 1.5% per month shall accrue on balances outstanding beyond fifteen (15) days.

3.4  Retainage
No retainage shall be withheld, provided the Client has no documented, written objection to completed work phases at the time of each draw request.

════════════════════════════════════════════════════════════════

4. TIMELINE, DELAYS, AND WORK HOURS

4.1  Estimated Schedule
  Estimated Start Date:               ${fmtDate(v.start_date)}
  Estimated Substantial Completion:   ${fmtDate(v.substantial_completion)}

These dates are estimates only, not guarantees. The schedule is contingent upon: (a) timely payment per Section 3; (b) Client's timely selection of materials and fixtures; (c) site access as described in Section 7; and (d) conditions outside Contractor's control.

4.2  Delays
Contractor shall not be liable for delays caused by acts of God, inclement weather, supply chain disruptions, labor shortages, permit delays, differing site conditions discovered after commencement, Client-directed changes, or other causes beyond Contractor's reasonable control ("Excusable Delays"). Contractor shall provide written notice of any Excusable Delay within five (5) business days of its onset and shall use commercially reasonable efforts to mitigate delay.

4.3  Work Hours
Contractor's crew will generally work ${v.work_hours || 'Monday through Friday, 7:30 AM to 5:00 PM'}. Contractor will provide reasonable notice of any weekend or holiday work and shall comply with local noise ordinances.

════════════════════════════════════════════════════════════════

5. CHANGE ORDER PROCESS

5.1  Written Authorization Required
No extra work, substitution of materials, or deviation from the Scope of Work in Section 2 shall be performed or paid for without a written Change Order signed by both Parties. Verbal authorizations are not binding.

5.2  Change Order Pricing
Each Change Order shall include: (a) a description of the added, deleted, or modified Work; (b) the adjustment to the Contract Price (increase or decrease); and (c) the adjustment to the Substantial Completion date, if any.

5.3  Client Approval
Client shall respond to any Change Order request within three (3) business days. Failure to respond shall be deemed rejection. Contractor may, at its option, suspend work on affected areas pending approval.

5.4  Pricing Basis
Change Order pricing shall be computed using Contractor's then-current labor rates plus material costs at invoice price plus Contractor's standard overhead and profit margin.

════════════════════════════════════════════════════════════════

6. CONTRACTOR RESPONSIBILITIES, PERMITTING, AND CLEAN-UP

6.1  Permitting
Contractor shall apply for and obtain all required building permits and inspections necessary for the Work under applicable Virginia and local codes. Permit fees are: (check one) ☐ included in the Contract Price above  ☐ billed to Client at cost as a pass-through. Contractor shall post permits as required and schedule all required inspections. Client shall not interfere with the permit process.

6.2  Subcontractors
Contractor may engage licensed subcontractors to perform portions of the Work. All subcontractors shall carry their own insurance and be properly licensed for their trade under Virginia law. Contractor remains fully responsible for the quality and completion of all subcontracted Work.

6.3  Supervision and Safety
Contractor shall maintain a competent supervisor or lead on-site whenever work is actively in progress. Contractor shall comply with all OSHA safety regulations and maintain the work site in a reasonably safe condition. Client and Client's guests shall not enter active work areas without Contractor's permission.

6.4  Daily Clean-Up
Contractor shall keep the work area and immediately surrounding areas reasonably clean and free of debris on a daily basis. All construction waste shall be removed from the property within five (5) business days of substantial completion. Contractor shall protect flooring, furniture, and adjacent surfaces not part of the Work.

6.5  Materials and Equipment
Contractor shall be responsible for ordering, receiving, storing, and safeguarding all materials and equipment purchased for the Project. Risk of loss for materials delivered to the site shall transfer to Client upon delivery.

════════════════════════════════════════════════════════════════

7. CLIENT RESPONSIBILITIES AND ACCESS

7.1  Site Access
Client shall provide Contractor and its subcontractors with free, unobstructed access to the Project property during normal work hours throughout the duration of the Project. Contractor will be provided a key or access code if needed; Client may revoke access only with fourteen (14) days' written notice unless Contractor is in material breach.

7.2  Utilities
Client shall maintain active water, electricity, and HVAC service at the property at Client's expense during the Project. Contractor shall have the right to use these utilities as necessary to perform the Work.

7.3  Selections and Decisions
Client shall make all material and fixture selections, and respond to Contractor's requests for decisions, within the timeframes Contractor specifies. Delays caused by Client's failure to make timely decisions may result in schedule extensions and additional costs, which shall be addressed via Change Order.

7.4  Relocation of Personal Property
Client shall remove or protect personal property, valuables, and furnishings from the work area prior to commencement. Contractor is not responsible for damage to items Client fails to remove or protect.

7.5  Existing Conditions
Client represents that Client has disclosed to Contractor all known material defects, hazardous materials (including asbestos, lead paint, mold), structural issues, or other site conditions that may affect the Work. Discovery of undisclosed concealed conditions may require a Change Order.

════════════════════════════════════════════════════════════════

8. WARRANTIES AND LIMITATION OF LIABILITY

8.1  Workmanship Warranty
Contractor warrants that all Work performed under this Agreement shall be free from defects in workmanship for a period of ${warrantyMonths} months from the date of substantial completion ("Warranty Period"). During the Warranty Period, Contractor shall, at no additional charge, repair or correct any defect in workmanship brought to Contractor's written attention within ten (10) business days of discovery. This warranty does not cover: (a) normal wear and tear; (b) damage caused by Client's misuse or negligence; (c) damage caused by subsequent alterations or repairs by others; or (d) pre-existing conditions.

8.2  Materials and Equipment Warranty
Manufacturer warranties on materials, fixtures, and equipment are passed through to Client to the extent transferable. Contractor makes no independent warranty beyond the manufacturer's terms for any product. Contractor will reasonably assist Client in pursuing valid manufacturer warranty claims.

8.3  Limitation of Liability
IN NO EVENT SHALL CONTRACTOR'S AGGREGATE LIABILITY TO CLIENT EXCEED THE TOTAL CONTRACT PRICE PAID BY CLIENT TO CONTRACTOR UNDER THIS AGREEMENT. CONTRACTOR SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF USE, LOSS OF REVENUE, OR COST OF ALTERNATIVE HOUSING, ARISING OUT OF OR RELATED TO THIS AGREEMENT, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.

8.4  Insurance
Contractor shall maintain throughout the Project: (a) Commercial General Liability insurance with limits not less than $1,000,000 per occurrence / $2,000,000 aggregate; and (b) Workers' Compensation insurance as required by Virginia law. Certificates of insurance shall be provided to Client upon request.

════════════════════════════════════════════════════════════════

9. DISPUTE RESOLUTION AND TERMINATION

9.1  Notice and Cure
Before either Party initiates any formal dispute process, the aggrieved Party shall deliver written notice describing the alleged breach in reasonable detail. The breaching Party shall have fifteen (15) calendar days to cure the breach (or, if the breach cannot reasonably be cured in fifteen days, to commence cure and diligently pursue completion).

9.2  Mediation
If the Parties cannot resolve a dispute through good-faith negotiation within thirty (30) days of the initial notice, either Party may demand non-binding mediation administered by a mutually agreed mediator or, failing agreement, by JAMS or AAA in Northern Virginia. Costs of mediation shall be shared equally.

9.3  Arbitration
Any dispute not resolved by mediation shall be settled by binding arbitration under the Construction Industry Arbitration Rules of the American Arbitration Association (AAA), with proceedings held in Fairfax County, Virginia, before a single arbitrator. Judgment on the arbitration award may be entered in any court of competent jurisdiction. The prevailing Party shall be entitled to recover reasonable attorneys' fees and arbitration costs.

9.4  Governing Law; Venue
This Agreement shall be governed by the laws of the Commonwealth of Virginia, without regard to conflict-of-law principles. For any matter not subject to arbitration, the Parties consent to the exclusive jurisdiction of the courts of Fairfax County, Virginia.

9.5  Termination by Client
Client may terminate this Agreement for convenience upon fourteen (14) days' written notice to Contractor. Upon termination, Client shall pay Contractor for: (a) all Work performed and accepted through the termination date at the pro-rata Contract Price; (b) all non-cancelable material orders and restocking fees; and (c) a cancellation fee equal to 15% of the remaining unearned Contract Price to compensate Contractor for lost profits and overhead.

9.6  Termination by Contractor
Contractor may terminate this Agreement upon seven (7) days' written notice if: (a) Client fails to make any payment when due and fails to cure such non-payment within five (5) days of written demand; (b) Client materially interferes with Contractor's performance of the Work; or (c) the Project becomes legally impossible to complete. Upon Contractor's termination for cause, Client shall pay all amounts owed as of the termination date plus the cancellation fee described in Section 9.5(c).

9.7  Entire Agreement; Amendments
This Agreement, together with any attached Exhibit A (Material Selections Sheet) and any fully executed Change Orders, constitutes the entire agreement between the Parties with respect to the subject matter hereof and supersedes all prior negotiations, representations, and understandings. No amendment shall be valid unless in writing and signed by both Parties.

9.8  Severability
If any provision of this Agreement is held invalid or unenforceable, such provision shall be modified to the minimum extent necessary to make it enforceable, and the remaining provisions shall continue in full force and effect.

════════════════════════════════════════════════════════════════

10. SIGNATURE AND DATE EXECUTION

By signing below, each Party represents that they have read, understand, and agree to all terms and conditions of this Agreement, and that they are duly authorized to execute it.

CONTRACTOR — OROZCO HOMES LLC
─────────────────────────────────────────────────────────────
Signature: _________________________________   Date: _________

Printed Name: ${v.contractor_name || 'Carlos Orozco'}
Title:        ${v.contractor_title || 'Owner, Orozco Homes LLC'}
VA License #: ${v.contractor_license || '_______________'}


CLIENT
─────────────────────────────────────────────────────────────
Signature: _________________________________   Date: _________

Printed Name: ${v.client_name || '[CLIENT NAME]'}
Address:      ${v.client_address || '[CLIENT ADDRESS]'}


CLIENT (Co-Owner / Spouse, if applicable)
─────────────────────────────────────────────────────────────
Signature: _________________________________   Date: _________

Printed Name: ___________________________________


════════════════════════════════════════════════════════════════
This document was generated by Orozco Homes LLC | orozcoventures@gmail.com
Contract prepared: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
════════════════════════════════════════════════════════════════`;
}
