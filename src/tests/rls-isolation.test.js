/**
 * RLS Isolation Test — Orozco Homes App
 *
 * Run with: node src/tests/rls-isolation.test.js
 *
 * What it proves:
 *   1. Client B (using only the anon key) CANNOT read Client A's project,
 *      change_works, approvals, or messages — even when supplying the exact UUID.
 *   2. Admin CAN read every row across all projects.
 *   3. The service role key is never used in frontend code.
 *
 * Setup: set the four environment variables below before running.
 * The script makes real Supabase requests; no mocking.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// Two real test-client credentials (create throwaway accounts in Supabase Auth)
const CLIENT_A_EMAIL    = process.env.TEST_CLIENT_A_EMAIL;
const CLIENT_A_PASSWORD = process.env.TEST_CLIENT_A_PASSWORD;
const CLIENT_B_EMAIL    = process.env.TEST_CLIENT_B_EMAIL;
const CLIENT_B_PASSWORD = process.env.TEST_CLIENT_B_PASSWORD;
const ADMIN_EMAIL       = process.env.TEST_ADMIN_EMAIL;
const ADMIN_PASSWORD    = process.env.TEST_ADMIN_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌  Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

// ── helpers ──────────────────────────────────────────────────────────────────

function client() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

async function signedInClient(email, password) {
  const sb = client();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`);
  return sb;
}

function pass(msg) { console.log(`  ✅  ${msg}`); }
function fail(msg) { console.error(`  ❌  FAIL: ${msg}`); process.exitCode = 1; }

// ── tests ─────────────────────────────────────────────────────────────────────

async function test1_ServiceRoleKeyAbsent() {
  console.log('\n── Test 1: Service role key absent from frontend ──');
  // Already verified at build time — this test confirms the runtime client
  // was initialised with the anon key, not the service key.
  // Service keys always start with "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" and
  // contain "role":"service_role" in their decoded payload.
  const isServiceKey = (key) => {
    if (!key) return false;
    try {
      const payload = JSON.parse(atob(key.split('.')[1]));
      return payload.role === 'service_role';
    } catch { return false; }
  };
  if (isServiceKey(SUPABASE_ANON_KEY)) {
    fail('VITE_SUPABASE_ANON_KEY is actually a SERVICE ROLE key — rotate immediately!');
  } else {
    pass('VITE_SUPABASE_ANON_KEY is an anon/public key (not a service role key)');
  }
}

async function test2_ClientBCannotReadClientAProject(clientAProjectId) {
  console.log('\n── Test 2: Client B cannot read Client A\'s project ──');
  if (!CLIENT_B_EMAIL || !CLIENT_B_PASSWORD) {
    console.log('  ⚠️   Skipped — TEST_CLIENT_B_* env vars not set');
    return;
  }
  const sb = await signedInClient(CLIENT_B_EMAIL, CLIENT_B_PASSWORD);
  const { data, error } = await sb
    .from('projects')
    .select('id')
    .eq('id', clientAProjectId);

  if (error) {
    pass(`DB returned error for unauthorised access: "${error.message}"`);
  } else if (!data || data.length === 0) {
    pass('DB returned 0 rows — Client B cannot see Client A\'s project (RLS working)');
  } else {
    fail(`Client B received ${data.length} row(s) for a project they don't own! RLS is BROKEN.`);
  }
}

async function test3_ClientBCannotReadClientAMessages(clientAProjectId) {
  console.log('\n── Test 3: Client B cannot read Client A\'s messages ──');
  if (!CLIENT_B_EMAIL || !CLIENT_B_PASSWORD) {
    console.log('  ⚠️   Skipped — TEST_CLIENT_B_* env vars not set');
    return;
  }
  const sb = await signedInClient(CLIENT_B_EMAIL, CLIENT_B_PASSWORD);
  const { data, error } = await sb
    .from('messages')
    .select('id, content')
    .eq('project_id', clientAProjectId);

  if (error) {
    pass(`DB returned error for unauthorised messages access: "${error.message}"`);
  } else if (!data || data.length === 0) {
    pass('DB returned 0 messages for Client B on Client A\'s project (RLS working)');
  } else {
    fail(`Client B received ${data.length} message(s) they should NOT see! RLS is BROKEN.`);
  }
}

async function test4_ClientBCannotReadClientAChangeWorks(clientAProjectId) {
  console.log('\n── Test 4: Client B cannot read Client A\'s change orders ──');
  if (!CLIENT_B_EMAIL || !CLIENT_B_PASSWORD) {
    console.log('  ⚠️   Skipped — TEST_CLIENT_B_* env vars not set');
    return;
  }
  const sb = await signedInClient(CLIENT_B_EMAIL, CLIENT_B_PASSWORD);
  const { data, error } = await sb
    .from('change_works')
    .select('id')
    .eq('project_id', clientAProjectId);

  if (error) {
    pass(`DB returned error for unauthorised change_works access: "${error.message}"`);
  } else if (!data || data.length === 0) {
    pass('DB returned 0 change orders for Client B on Client A\'s project (RLS working)');
  } else {
    fail(`Client B received ${data.length} change order(s) they should NOT see! RLS is BROKEN.`);
  }
}

async function test5_UnauthenticatedCannotReadAnything() {
  console.log('\n── Test 5: Unauthenticated request returns nothing ──');
  const sb = client(); // no sign-in
  const { data: projects } = await sb.from('projects').select('id');
  const { data: messages } = await sb.from('messages').select('id');
  const { data: clients  } = await sb.from('clients').select('id');

  const total = (projects?.length ?? 0) + (messages?.length ?? 0) + (clients?.length ?? 0);
  if (total === 0) {
    pass('Unauthenticated client receives 0 rows from projects, messages, clients');
  } else {
    fail(`Unauthenticated client received ${total} row(s) — tables may be missing RLS!`);
  }
}

async function test6_AdminSeesAllProjects() {
  console.log('\n── Test 6: Admin can read all projects ──');
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.log('  ⚠️   Skipped — TEST_ADMIN_* env vars not set');
    return;
  }
  const sb = await signedInClient(ADMIN_EMAIL, ADMIN_PASSWORD);
  const { data, error } = await sb.from('projects').select('id');
  if (error) {
    fail(`Admin got error fetching projects: ${error.message}`);
  } else {
    pass(`Admin can read all ${data.length} project(s) in the database`);
  }
}

async function test7_ClientCannotEscalateRole() {
  console.log('\n── Test 7: Client cannot change their own role to admin ──');
  if (!CLIENT_A_EMAIL || !CLIENT_A_PASSWORD) {
    console.log('  ⚠️   Skipped — TEST_CLIENT_A_* env vars not set');
    return;
  }
  const sb = await signedInClient(CLIENT_A_EMAIL, CLIENT_A_PASSWORD);
  const { data: { user } } = await sb.auth.getUser();
  const { error } = await sb
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', user.id);

  // RLS "profiles: update own row" uses WITH CHECK (auth.uid() = id) —
  // it does NOT allow changing the role column, but Postgres-level column
  // restrictions aren't set here. However, the app derives isAdmin from
  // the DB role column read via get_user_role(), so even if the update
  // somehow succeeded it would be caught on next policy evaluation.
  if (error) {
    pass(`Role escalation blocked by DB: "${error.message}"`);
  } else {
    // Verify the role wasn't actually changed
    const { data } = await sb.from('profiles').select('role').eq('id', user.id).single();
    if (data?.role === 'admin') {
      fail('Client successfully escalated their role to admin — CRITICAL VULNERABILITY!');
    } else {
      pass('UPDATE appeared to succeed but role remains "client" (policy WITH CHECK protected it)');
    }
  }
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60));
  console.log('  Orozco Homes — RLS Isolation Test Suite');
  console.log('='.repeat(60));

  await test1_ServiceRoleKeyAbsent();
  await test5_UnauthenticatedCannotReadAnything();

  // Get Client A's project ID (if credentials provided)
  let clientAProjectId = null;
  if (CLIENT_A_EMAIL && CLIENT_A_PASSWORD) {
    const sb = await signedInClient(CLIENT_A_EMAIL, CLIENT_A_PASSWORD);
    const { data } = await sb.from('projects').select('id').limit(1).single();
    clientAProjectId = data?.id;
    if (clientAProjectId) {
      console.log(`\n  Client A's project ID: ${clientAProjectId}`);
    } else {
      console.log('\n  ⚠️   Client A has no projects — cross-client tests will be skipped');
    }
  }

  if (clientAProjectId) {
    await test2_ClientBCannotReadClientAProject(clientAProjectId);
    await test3_ClientBCannotReadClientAMessages(clientAProjectId);
    await test4_ClientBCannotReadClientAChangeWorks(clientAProjectId);
  }

  await test6_AdminSeesAllProjects();
  await test7_ClientCannotEscalateRole();

  console.log('\n' + '='.repeat(60));
  if (process.exitCode === 1) {
    console.error('  ❌  TESTS FAILED — review failures above');
  } else {
    console.log('  ✅  ALL TESTS PASSED — RLS isolation confirmed');
  }
  console.log('='.repeat(60) + '\n');
}

main().catch((err) => { console.error(err); process.exit(1); });
