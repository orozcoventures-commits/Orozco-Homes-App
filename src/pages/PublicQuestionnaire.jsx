// src/pages/PublicQuestionnaire.jsx — the questionnaire a customer fills in
// without logging in: /q/<private link code> or the website link
// /questionnaire (migration 048).
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import QuestionnaireForm from '../components/QuestionnaireForm';
import { normalizeQuestionnaire, validateAnswers, cleanAnswers } from '../utils/questionnaireTemplate';

const NAVY = '#002147';
const GOLD = '#D4AF37';
const BG = '#F5F4F0';
const PHONE = '757-513-2593';

// Photo questions arrive in step 3; until then they are left out.
function withoutPhotos(q) {
  return {
    ...q,
    sections: q.sections
      .map((s) => ({ ...s, questions: s.questions.filter((x) => x.type !== 'photos') }))
      .filter((s) => s.questions.length > 0),
  };
}

function Shell({ children }) {
  return (
    <div className="min-h-screen px-4 py-8 sm:py-12" style={{ backgroundColor: BG }}>
      {children}
      <p className="text-center text-xs mt-8" style={{ color: '#9CA3AF' }}>
        Orozco Homes · Questions? Call <a href={`tel:${PHONE.replace(/-/g, '')}`} style={{ color: NAVY }}>{PHONE}</a>
      </p>
    </div>
  );
}

function Message({ title, children }) {
  return (
    <div className="max-w-xl mx-auto rounded-2xl overflow-hidden" style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 4px 24px rgba(0,33,71,0.06)' }}>
      <div className="px-6 py-5 flex items-center gap-4" style={{ backgroundColor: NAVY }}>
        <img src="/orozco-homes-logo.png" alt="Orozco Homes" className="h-11 w-auto rounded-xl object-contain" />
        <p className="text-lg font-bold text-white">{title}</p>
      </div>
      <div className="px-6 py-6 text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#374151' }}>{children}</div>
    </div>
  );
}

export default function PublicQuestionnaire({ route }) {
  const [state, setState] = useState({ phase: 'loading' });
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [website, setWebsite] = useState(''); // hidden field only bots fill in

  useEffect(() => {
    document.title = 'Pre-Consultation Questionnaire · Orozco Homes';
    const load = route.mode === 'link'
      ? supabase.rpc('get_questionnaire_by_token', { p_token: route.token })
      : supabase.rpc('get_public_questionnaire');
    load.then(({ data, error }) => {
      if (error) { setState({ phase: 'error' }); return; }
      if (route.mode === 'link') {
        if (!data) { setState({ phase: 'invalid' }); return; }
        if (data.status !== 'sent') { setState({ phase: 'already', title: data.title, closing: data.closing }); return; }
        const q = normalizeQuestionnaire(data.questionnaire);
        const p = data.prefill ?? {};
        setAnswers(Object.fromEntries(Object.entries({ full_name: p.full_name, email: p.email, phone: p.phone }).filter(([, v]) => v)));
        setState({ phase: 'form', questionnaire: withoutPhotos(q) });
      } else {
        if (!data) { setState({ phase: 'unavailable' }); return; }
        setState({ phase: 'form', questionnaire: withoutPhotos(normalizeQuestionnaire(data)) });
      }
    });
  }, [route.mode, route.token]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    const q = state.questionnaire;
    const errs = validateAnswers(q, answers);
    setErrors(errs);
    setSubmitError('');
    if (Object.keys(errs).length) {
      setSubmitError('Please answer the questions marked in red.');
      document.getElementById(`qf-${Object.keys(errs)[0]}-label`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSubmitting(true);
    if (website) { setState({ phase: 'done', closing: q.closing }); return; }
    const clean = cleanAnswers(q, answers);
    const { data, error } = route.mode === 'link'
      ? await supabase.rpc('submit_questionnaire_by_token', { p_token: route.token, p_answers: clean })
      : await supabase.rpc('submit_public_questionnaire', { p_answers: clean });
    setSubmitting(false);
    if (error || !data?.ok) {
      setSubmitError(data?.error || 'Something went wrong. Please try again, or call us.');
      return;
    }
    window.scrollTo({ top: 0 });
    setState({ phase: 'done', closing: data.closing || q.closing });
  }

  if (state.phase === 'loading') {
    return <Shell><p className="text-center text-sm py-20" style={{ color: '#9CA3AF' }}>Loading…</p></Shell>;
  }
  if (state.phase === 'done') {
    return <Shell><Message title="Questionnaire received">{state.closing || 'We have received your questionnaire.'}</Message></Shell>;
  }
  if (state.phase === 'already') {
    return (
      <Shell>
        <Message title="Already submitted">
          {state.closing || 'This questionnaire was already submitted.'}
          {'\n\n'}This questionnaire has already been submitted. If you need to change an answer, please contact us.
        </Message>
      </Shell>
    );
  }
  if (state.phase !== 'form') {
    const text = {
      invalid: 'This questionnaire link is not valid. Please check the link you received, or contact Orozco Homes.',
      unavailable: 'This questionnaire is not available right now. Please contact Orozco Homes.',
      error: 'We could not load the questionnaire. Please check your connection and try again.',
    }[state.phase];
    return <Shell><Message title="Pre-Consultation Questionnaire">{text}</Message></Shell>;
  }

  return (
    <Shell>
      <form onSubmit={handleSubmit} noValidate>
        <QuestionnaireForm questionnaire={state.questionnaire} answers={answers} onChange={setAnswers} errors={errors}
          footer={(
            <div className="pb-2">
              <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
                <label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
              </div>
              {submitError && (
                <p role="alert" className="text-sm font-semibold mb-3 text-center" style={{ color: '#DC2626' }}>{submitError}</p>
              )}
              <button type="submit" disabled={submitting}
                className="w-full py-3.5 rounded-xl text-base font-bold disabled:opacity-60"
                style={{ backgroundColor: NAVY, color: GOLD }}>
                {submitting ? 'Submitting…' : 'Submit Questionnaire'}
              </button>
            </div>
          )} />
      </form>
    </Shell>
  );
}
