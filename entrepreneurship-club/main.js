import { supabase, supabaseConfigError } from './lib/supabase.js';

// ---------- Page navigation ----------
const pages = document.querySelectorAll('.page');
const navLinks = document.querySelectorAll('.navlink');
const allTargets = document.querySelectorAll('[data-target]');
const primaryNav = document.getElementById('primaryNav');
const navToggle = document.getElementById('navToggle');

function showPage(id) {
  pages.forEach((p) => p.classList.toggle('active', p.id === id));
  navLinks.forEach((l) => l.classList.toggle('active', l.dataset.target === id));
  window.scrollTo({ top: 0, behavior: 'instant' });
  history.replaceState(null, '', '#' + id);
  primaryNav.classList.remove('open');
}

allTargets.forEach((el) => {
  el.addEventListener('click', () => showPage(el.dataset.target));
});

navToggle.addEventListener('click', () => primaryNav.classList.toggle('open'));

const initialPage = location.hash ? location.hash.substring(1) : 'home';
showPage(document.getElementById(initialPage) ? initialPage : 'home');

// ---------- Language toggle ----------
const titles = {
  en: 'Entrepreneurship Club — A Global Community of Founders',
  es: 'Entrepreneurship Club — Una Comunidad Global de Fundadores',
};
const langButtons = document.querySelectorAll('.lang-btn');
let currentLang = 'en';

function setLanguage(lang) {
  currentLang = lang;
  document.documentElement.lang = lang;
  document.title = titles[lang] || titles.en;

  document.querySelectorAll('.i18n').forEach((el) => {
    const val = el.dataset[lang];
    if (val === undefined) return;
    el.innerHTML = val;
  });

  document.querySelectorAll('.i18n-opt').forEach((el) => {
    const val = el.dataset[lang];
    if (val === undefined) return;
    el.textContent = val;
  });

  langButtons.forEach((b) => b.classList.toggle('active', b.dataset.lang === lang));
}

langButtons.forEach((b) => {
  b.addEventListener('click', () => setLanguage(b.dataset.lang));
});

setLanguage('en');

// ---------- Form submission ----------
function wireForm({ formId, errorId, confirmId, buildRow, table }) {
  const form = document.getElementById(formId);
  const errorEl = document.getElementById(errorId);
  const confirmEl = document.getElementById(confirmId);
  const submitBtn = form.querySelector('button[type="submit"]');

  if (supabaseConfigError) {
    submitBtn.disabled = true;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';

    if (supabaseConfigError) {
      console.error(supabaseConfigError);
      errorEl.style.display = 'block';
      return;
    }

    submitBtn.disabled = true;

    const { error } = await supabase.from(table).insert(buildRow(form));

    if (error) {
      console.error(`${table} insert failed:`, error);
      errorEl.style.display = 'block';
      submitBtn.disabled = false;
      return;
    }

    form.style.display = 'none';
    confirmEl.style.display = 'block';
  });
}

wireForm({
  formId: 'joinForm',
  errorId: 'joinFormError',
  confirmId: 'confirmMsg',
  table: 'ec_membership_requests',
  buildRow: (form) => ({
    full_name: form.fullName.value.trim(),
    email: form.email.value.trim(),
    location: form.location.value.trim(),
    stage: form.stage.value,
    about: form.ventureAbout.value.trim(),
    agreed_to_policy: form.agree.checked,
    language: currentLang,
  }),
});

wireForm({
  formId: 'storyForm',
  errorId: 'storyFormError',
  confirmId: 'storyConfirmMsg',
  table: 'ec_success_stories',
  buildRow: (form) => ({
    full_name: form.storyName.value.trim(),
    venture_name: form.storyVenture.value.trim(),
    milestone_type: form.storyType.value,
    story_text: form.storyText.value.trim(),
    permission_granted: form.storyPermission.checked,
    language: currentLang,
  }),
});

wireForm({
  formId: 'academyRequestForm',
  errorId: 'academyRequestError',
  confirmId: 'academyRequestConfirm',
  table: 'ec_academy_requests',
  buildRow: (form) => ({
    full_name: form.reqFullName.value.trim(),
    email: form.reqEmail.value.trim(),
    reason: form.reqReason.value.trim(),
    language: currentLang,
  }),
});

// ---------- Genesis Academy paywall ----------
const gatePanels = {
  checking: document.getElementById('gateChecking'),
  signedOut: document.getElementById('gateSignedOut'),
  signedIn: document.getElementById('gateSignedIn'),
  activating: document.getElementById('gateActivating'),
};
const academyGate = document.getElementById('academyGate');
const academyContent = document.getElementById('academyContent');
const gateSignInForm = document.getElementById('gateSignInForm');
const gateSignInSent = document.getElementById('gateSignInSent');
const gateSignInError = document.getElementById('gateSignInError');
const gateSubscribeBtn = document.getElementById('gateSubscribeBtn');
const gateSubscribeError = document.getElementById('gateSubscribeError');
const gateEmailDisplay = document.getElementById('gateEmailDisplay');
const gateSignOutBtn = document.getElementById('gateSignOutBtn');

function showGatePanel(name) {
  Object.entries(gatePanels).forEach(([key, el]) => {
    el.hidden = key !== name;
  });
  academyGate.style.display = '';
  academyContent.hidden = true;
}

const ACADEMY_UNLOCK_KEY = 'ec_academy_unlocked';

function unlockAcademy() {
  academyGate.style.display = 'none';
  academyContent.hidden = false;
}

function hasStoredAccessCode() {
  try {
    return localStorage.getItem(ACADEMY_UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

async function getActiveSubscription(userId) {
  const { data } = await supabase
    .from('ec_subscribers')
    .select('status')
    .eq('id', userId)
    .maybeSingle();
  return data?.status === 'active';
}

async function checkAcademyAccess() {
  if (hasStoredAccessCode()) {
    unlockAcademy();
    return;
  }

  if (supabaseConfigError) {
    console.error(supabaseConfigError);
    showGatePanel('signedOut');
    gateSignInForm.querySelector('button[type="submit"]').disabled = true;
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    showGatePanel('signedOut');
    return;
  }

  const active = await getActiveSubscription(session.user.id);
  if (active) {
    unlockAcademy();
    return;
  }

  gateEmailDisplay.textContent = session.user.email;
  showGatePanel('signedIn');
}

async function pollForActiveSubscription(userId, attemptsLeft = 6) {
  const active = await getActiveSubscription(userId);
  if (active) {
    unlockAcademy();
    history.replaceState(null, '', location.pathname + '#academy');
    return;
  }
  if (attemptsLeft <= 0) {
    await checkAcademyAccess();
    return;
  }
  setTimeout(() => pollForActiveSubscription(userId, attemptsLeft - 1), 1500);
}

gateSignInForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  gateSignInError.style.display = 'none';
  const submitBtn = gateSignInForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  const email = document.getElementById('gateEmail').value.trim();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + window.location.pathname },
  });

  if (error) {
    console.error('signInWithOtp failed:', error);
    gateSignInError.style.display = 'block';
    submitBtn.disabled = false;
    return;
  }

  gateSignInForm.style.display = 'none';
  gateSignInSent.style.display = 'block';
});

gateSubscribeBtn?.addEventListener('click', async () => {
  gateSubscribeError.style.display = 'none';
  gateSubscribeBtn.disabled = true;

  const { data, error } = await supabase.functions.invoke('academy-checkout');

  if (error || !data?.url) {
    console.error('academy-checkout failed:', error || data);
    gateSubscribeError.style.display = 'block';
    gateSubscribeBtn.disabled = false;
    return;
  }

  window.location.href = data.url;
});

gateSignOutBtn?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  await checkAcademyAccess();
});

const gateCodeToggle = document.getElementById('gateCodeToggle');
const gateCodePanel = document.getElementById('gateCodePanel');
const gateCodeForm = document.getElementById('gateCodeForm');
const gateCodeError = document.getElementById('gateCodeError');
const gateCodeInput = document.getElementById('gateCode');

gateCodeToggle?.addEventListener('click', () => {
  gateCodePanel.hidden = !gateCodePanel.hidden;
});

gateCodeInput?.addEventListener('input', () => {
  gateCodeInput.value = gateCodeInput.value.replace(/\D/g, '').slice(0, 4);
});

if (supabaseConfigError && gateCodeForm) {
  console.error(supabaseConfigError);
  gateCodeForm.querySelector('button[type="submit"]').disabled = true;
}

gateCodeForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  gateCodeError.style.display = 'none';
  const submitBtn = gateCodeForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  const password = document.getElementById('gateCode').value;
  const { data, error } = await supabase.functions.invoke('academy-access-check', {
    body: { password },
  });

  if (error || !data?.ok) {
    console.error('academy-access-check failed:', error || data);
    gateCodeError.style.display = 'block';
    submitBtn.disabled = false;
    return;
  }

  try {
    localStorage.setItem(ACADEMY_UNLOCK_KEY, '1');
  } catch {
    // localStorage unavailable (private browsing, etc.) -- access still
    // works for the rest of this page load, just won't persist.
  }
  unlockAcademy();
});

supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_IN') {
    showPage('academy');
    checkAcademyAccess();
  } else if (event === 'SIGNED_OUT') {
    checkAcademyAccess();
  }
});

if (academyGate) {
  const checkoutStatus = new URLSearchParams(window.location.search).get('checkout');
  if (checkoutStatus === 'success') {
    showGatePanel('activating');
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        pollForActiveSubscription(session.user.id);
      } else {
        checkAcademyAccess();
      }
    });
  } else {
    checkAcademyAccess();
  }
}
