// src/utils/contractPrefill.js — client-safe hand-off from the Remodel Budget
// to the Contracts page.
//
// Security rule: a contract is a client document. Only the fields listed in
// CONTRACT_PREFILL_KEYS can be filled from the budget, and only the client
// price is passed as a number. Internal figures (gross margin, contingency,
// direct/subcontractor costs, line-item dollar amounts, actuals) are never
// passed in, and any text line that mentions them or contains a dollar amount
// is dropped as a second safety net.

export const CONTRACT_PREFILL_KEYS = [
  'client_name',
  'client_email',
  'client_phone',
  'project_type',
  'scope_of_work',
  'materials_spec',
  'total_cost',
];

const INTERNAL_TERMS = /margin|mark-?up|profit|overhead|contingenc|net\s*cost|direct\s*cost|sub-?contractor|actual\s*cost|variance|\$\s*\d|\d+(\.\d+)?\s*%/i;

const clean = (text) => (typeof text === 'string' ? text.trim() : '');

// Drops every line that mentions an internal figure.
export function stripInternalLines(text) {
  return clean(text)
    .split('\n')
    .filter((line) => !INTERNAL_TERMS.test(line))
    .join('\n')
    .trim();
}

/**
 * @param {object}   args
 * @param {object}   args.client       { full_name, email, phone } from Manage Clients (may be null)
 * @param {string}   args.projectType  e.g. 'Master Bathroom Renovation'
 * @param {Array<{division: string, items: string[]}>} args.scope  work descriptions only, no amounts
 * @param {string[]} args.changeOrders approved change-order titles, no amounts
 * @param {string[]} args.materials    approved selection descriptions, no amounts
 * @param {number}   args.clientPrice  total client price (the only number passed)
 * @returns {object} frozen object with only CONTRACT_PREFILL_KEYS
 */
export function buildContractPrefill({ client, projectType, scope = [], changeOrders = [], materials = [], clientPrice }) {
  const scopeLines = [];
  for (const { division, items } of scope) {
    if (!items.length) continue;
    scopeLines.push(`• ${division}: ${items.join(', ')}`);
  }
  if (changeOrders.length) {
    scopeLines.push('', 'Approved change orders included in the contract price:');
    for (const title of changeOrders) scopeLines.push(`• ${title}`);
  }

  const price = Number(clientPrice);
  const values = {
    client_name:    clean(client?.full_name),
    client_email:   clean(client?.email),
    client_phone:   clean(client?.phone),
    project_type:   stripInternalLines(projectType),
    scope_of_work:  stripInternalLines(scopeLines.length ? `Work includes:\n${scopeLines.join('\n')}` : ''),
    materials_spec: stripInternalLines(materials.map((m) => `• ${m}`).join('\n')),
    total_cost:     Number.isFinite(price) && price > 0 ? price.toFixed(2) : '',
  };

  // Allowlist: anything not listed above can never reach a contract.
  return Object.freeze(Object.fromEntries(
    CONTRACT_PREFILL_KEYS.filter((k) => values[k]).map((k) => [k, values[k]]),
  ));
}
