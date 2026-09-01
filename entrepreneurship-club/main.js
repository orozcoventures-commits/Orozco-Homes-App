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
