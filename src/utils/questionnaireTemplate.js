// Pre-Consultation Questionnaire: built-in questions, editing helpers,
// answer checks and display. The admin's own version is saved in
// questionnaire_templates (migration 047); each questionnaire keeps a copy
// of the questions it was answered with.

export const QUESTION_TYPES = {
  short:  'Short answer',
  long:   'Paragraph',
  email:  'Email',
  phone:  'Phone',
  single: 'Pick one',
  multi:  'Pick all that apply',
  photos: 'Photo upload',
};

// Questions that fill the customer's name and contact details on the list.
// They can be reworded but not removed.
export const CORE_QUESTIONS = {
  full_name:       'Customer name',
  project_address: 'Project address',
  phone:           'Phone',
  email:           'Email',
};

export const OTHER_VALUE = '__other__';
const MAX_TEXT = 5000;

const opt = (label, description = '') => ({ label, description });

export const BUILT_IN_QUESTIONNAIRE = {
  title: 'Pre-Consultation Questionnaire',
  intro: 'Thank you for your interest in working with us! Please complete this pre-consultation form to help us better understand your project needs and vision. This information will allow us to prepare for our initial meeting and ensure we’re the right fit for your project.',
  closing: 'Thank you! We have received your questionnaire and will review it before our consultation. We look forward to meeting with you.',
  sections: [
    {
      id: 'contact',
      title: 'Contact Information',
      questions: [
        { id: 'full_name', type: 'short', required: true, label: 'Full Name(s)', help: 'Please provide your full name(s) as they should appear on project documentation.' },
        { id: 'project_address', type: 'short', required: true, label: 'Project Address', help: 'Enter the address where the project will take place.' },
        { id: 'phone', type: 'phone', required: true, label: 'Phone Number', help: 'Please provide a phone number where we can reach you.' },
        { id: 'email', type: 'email', required: true, label: 'Email Address', help: 'Please enter your email address for correspondence.' },
        { id: 'best_time', type: 'short', required: true, label: 'What is the best time of day to meet?', help: '' },
        { id: 'contact_method', type: 'single', required: true, label: 'Preferred Method of Contact', help: 'How would you prefer we contact you regarding your project?',
          options: [opt('Email'), opt('Phone'), opt('Text Message')] },
        { id: 'decision_makers', type: 'long', required: true, label: 'Who will be involved in decision-making for this project?', help: '(Names, roles, and whether they will attend the consultations, phone calls, etc.)' },
      ],
    },
    {
      id: 'project',
      title: 'Your Project',
      questions: [
        { id: 'project_type', type: 'single', required: true, other: true, label: 'Type of Project', help: 'What type of project are you considering? Select the most appropriate option.',
          options: [opt('Addition'), opt('Remodel'), opt('Kitchen'), opt('Bathroom'), opt('Porch (front, screened in, etc)')] },
        { id: 'consultation_type', type: 'single', required: false, label: 'Which type of consultation would you like to schedule?', help: '',
          options: [
            opt('Free Consultation', 'Best for homeowners who mostly know what they want. Includes a walkthrough of the space, discussion of ideas and a very preliminary investment range based on project scope and size.'),
            opt('Design Consultation – $295', 'Best for homeowners looking for more guidance and brainstorming before construction planning. Includes a one-hour in-home consultation focused on layout ideas, functionality, finishes, and overall vision, followed by a second meeting approximately one week later with conceptual ideas and recommendations.'),
          ] },
        { id: 'start_time', type: 'single', required: true, other: true, label: 'Desired Start Time', help: 'When would you ideally like to begin the project?',
          options: [opt('ASAP'), opt('3–6 months'), opt('Flexible'), opt('Just exploring')] },
        { id: 'motivation', type: 'multi', required: true, other: true, label: 'Project Motivation', help: 'What is motivating you to undertake this project? (Select all that apply)',
          options: [opt('More space'), opt('Updated style'), opt('Family needs'), opt('Resale'), opt('Water Damage')] },
      ],
    },
    {
      id: 'vision',
      title: 'Your Vision',
      questions: [
        { id: 'must_haves', type: 'long', required: true, label: 'Must-Have Features', help: 'List any features that are essential for your project.' },
        { id: 'wish_list', type: 'long', required: true, label: 'Wish-List Features', help: 'List any additional features you would love to include if possible.' },
        { id: 'ideal_space', type: 'long', required: true, label: 'Describe Your Ideal Space', help: 'In your own words, describe what your ideal finished space would look and feel like.' },
      ],
    },
    {
      id: 'experience',
      title: 'Experience & Planning',
      questions: [
        { id: 'contractor_before', type: 'single', required: true, label: 'Have You Worked with a Contractor Before?', help: 'Please indicate if you have previous experience working with contractors.',
          options: [opt('Yes'), opt('No')] },
        { id: 'past_experience', type: 'long', required: false, label: 'Is there anything in past remodel/construction experiences that you either appreciated or want to avoid this time?', help: '' },
        { id: 'drawings_permits', type: 'single', required: true, label: 'Do You Already Have Architectural Drawings or Permits?', help: 'Let us know if you already have any architectural plans or permits for this project.',
          options: [opt('Yes'), opt('No'), opt('In process')] },
        { id: 'concerns', type: 'long', required: false, label: 'Any Concerns We Should Know Ahead of Time?', help: 'Share any concerns or important information you’d like us to know before the consultation.' },
      ],
    },
    {
      id: 'home',
      title: 'Your Home & Investment',
      questions: [
        { id: 'home_age', type: 'short', required: false, label: 'How old is your home?', help: '(Approximate year built) Why?: Homes from different time periods have different challenges i.e. electrical, plumbing, asbestos, framing styles, etc.' },
        { id: 'investment_range', type: 'single', required: false, label: 'What is your intended investment range?', help: '',
          options: [opt('under $25,000'), opt('$25,000-$75,000'), opt('$75,000-$125,000'), opt('$125,000-$175,000'), opt('$175,000-$250,000'), opt('over $250,000')] },
      ],
    },
    {
      id: 'photos',
      title: 'Photos',
      questions: [
        { id: 'space_photos', type: 'photos', required: false, maxFiles: 5, label: 'Please take 3-5 pictures of the space we will look at together for the consult.', help: 'Upload up to 5 photos. Max 10 MB per photo.' },
        { id: 'inspiration_photos', type: 'photos', required: false, maxFiles: 10, label: 'Please share a few inspirational pictures for this space. These can be screen shots from Pinterest/google/etc.', help: 'Upload up to 10 photos. Max 10 MB per photo.' },
      ],
    },
  ],
};

export function newId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}

const str = (v, max = 2000) => (typeof v === 'string' ? v.slice(0, max) : '');

// Cleans a saved or edited questionnaire so the form can always render it.
export function normalizeQuestionnaire(q) {
  const src = q && typeof q === 'object' ? q : BUILT_IN_QUESTIONNAIRE;
  const seen = new Set();
  const uniq = (id, prefix) => {
    let v = typeof id === 'string' && /^[a-z0-9_]{1,40}$/i.test(id) ? id : newId(prefix);
    while (seen.has(v)) v = newId(prefix);
    seen.add(v);
    return v;
  };
  const sections = (Array.isArray(src.sections) ? src.sections : []).map((s) => ({
    id: uniq(s?.id, 's'),
    title: str(s?.title, 200),
    questions: (Array.isArray(s?.questions) ? s.questions : []).map((x) => {
      const type = QUESTION_TYPES[x?.type] ? x.type : 'short';
      const out = { id: uniq(x?.id, 'q'), type, label: str(x?.label, 500), help: str(x?.help, 1000), required: !!x?.required };
      if (type === 'single' || type === 'multi') {
        out.options = (Array.isArray(x?.options) ? x.options : [])
          .map((o) => (typeof o === 'string' ? { label: o, description: '' } : { label: str(o?.label, 200), description: str(o?.description, 1000) }))
          .filter((o) => o.label.trim());
        out.other = !!x?.other;
      }
      if (type === 'photos') out.maxFiles = Math.min(10, Math.max(1, Number(x?.maxFiles) || 5));
      return out;
    }),
  }));
  return {
    title: str(src.title, 200) || BUILT_IN_QUESTIONNAIRE.title,
    intro: str(src.intro, 3000),
    closing: str(src.closing, 2000),
    sections,
  };
}

export const allQuestions = (q) => (q?.sections ?? []).flatMap((s) => s.questions);

const isEmpty = (v) => v == null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && v.length === 0);

// Returns { [questionId]: message } for anything that must be fixed.
export function validateAnswers(questionnaire, answers) {
  const errors = {};
  for (const q of allQuestions(questionnaire)) {
    const v = answers?.[q.id];
    const other = answers?.[`${q.id}__other`];
    if (q.type === 'photos') {
      if (q.required && isEmpty(v)) errors[q.id] = 'Please add at least one photo.';
      continue;
    }
    if (q.required && isEmpty(v)) { errors[q.id] = 'This question is required.'; continue; }
    if (isEmpty(v)) continue;
    if (q.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim())) errors[q.id] = 'Please enter a valid email address.';
    if (q.type === 'phone' && String(v).replace(/\D/g, '').length < 10) errors[q.id] = 'Please enter a phone number with area code.';
    const choseOther = q.type === 'single' ? v === OTHER_VALUE : Array.isArray(v) && v.includes(OTHER_VALUE);
    if (choseOther && isEmpty(other)) errors[q.id] = 'Please describe “Other”.';
  }
  return errors;
}

// Keeps only answers to the questionnaire's own questions, in the right shape.
export function cleanAnswers(questionnaire, answers) {
  const out = {};
  for (const q of allQuestions(questionnaire)) {
    const v = answers?.[q.id];
    if (q.type === 'single') {
      const ok = q.options.some((o) => o.label === v) || (q.other && v === OTHER_VALUE);
      if (ok) out[q.id] = v;
    } else if (q.type === 'multi') {
      const list = (Array.isArray(v) ? v : []).filter((x) => q.options.some((o) => o.label === x) || (q.other && x === OTHER_VALUE));
      if (list.length) out[q.id] = [...new Set(list)];
    } else if (q.type === 'photos') {
      const list = (Array.isArray(v) ? v : []).filter((x) => typeof x === 'string').slice(0, q.maxFiles);
      if (list.length) out[q.id] = list;
    } else if (typeof v === 'string' && v.trim()) {
      out[q.id] = v.trim().slice(0, MAX_TEXT);
    }
    const other = answers?.[`${q.id}__other`];
    const choseOther = out[q.id] === OTHER_VALUE || (Array.isArray(out[q.id]) && out[q.id].includes(OTHER_VALUE));
    if (choseOther && typeof other === 'string' && other.trim()) out[`${q.id}__other`] = other.trim().slice(0, 500);
  }
  return out;
}

// Human-readable answer, or '' when unanswered.
export function formatAnswer(q, answers) {
  const v = answers?.[q.id];
  const other = answers?.[`${q.id}__other`];
  const show = (x) => (x === OTHER_VALUE ? `Other${other ? `: ${other}` : ''}` : x);
  if (q.type === 'single') return v ? show(v) : '';
  if (q.type === 'multi') return Array.isArray(v) ? v.map(show).join(', ') : '';
  if (q.type === 'photos') return Array.isArray(v) && v.length ? `${v.length} photo${v.length === 1 ? '' : 's'}` : '';
  return typeof v === 'string' ? v : '';
}

// Contact details copied to the questionnaire row for the list view.
export function contactFromAnswers(answers) {
  const s = (k) => (typeof answers?.[k] === 'string' ? answers[k].trim().slice(0, 300) : '');
  return {
    respondent_name:  s('full_name'),
    respondent_email: s('email'),
    respondent_phone: s('phone'),
    project_address:  s('project_address'),
  };
}

// Which customer questionnaire an address is for (/q/<link code> or the
// website link /questionnaire), or null when it isn't one.
export function questionnaireRoute(pathname) {
  const m = pathname.match(/^\/q\/([0-9a-f]{64})\/?$/i);
  if (m) return { mode: 'link', token: m[1].toLowerCase() };
  if (/^\/questionnaire\/?$/i.test(pathname)) return { mode: 'public' };
  return null;
}

export const questionnaireLinkUrl = (token) => `${window.location.origin}/q/${token}`;
export const websiteQuestionnaireUrl = () => `${window.location.origin}/questionnaire`;
