// src/components/QuestionnaireForm.jsx — the Pre-Consultation Questionnaire
// as the customer sees it. Used for the admin preview and manual entry, and
// (step 2) on the customer's private link.
import { OTHER_VALUE } from '../utils/questionnaireTemplate';

const NAVY = '#002147';
const GOLD = '#D4AF37';
const BORDER = '#E8E6E1';

const inputStyle = (error) => ({
  border: `1.5px solid ${error ? '#FCA5A5' : BORDER}`, borderRadius: 10, padding: '0.6rem 0.85rem',
  fontSize: '0.9rem', color: NAVY, backgroundColor: '#fff', width: '100%',
});

function Choice({ type, name, checked, onChange, label, description, children }) {
  return (
    <label className="flex items-start gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors duration-100"
      style={{ border: `1.5px solid ${checked ? GOLD : BORDER}`, backgroundColor: checked ? '#FFFBEB' : '#fff' }}>
      <input type={type} name={name} checked={checked} onChange={onChange} className="mt-0.5 shrink-0"
        style={{ accentColor: NAVY, width: 16, height: 16 }} />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold" style={{ color: NAVY }}>{label}</span>
        {description && <span className="block text-xs mt-1 leading-relaxed" style={{ color: '#6B7280' }}>{description}</span>}
        {children}
      </span>
    </label>
  );
}

function Question({ q, first, answers, setAnswer, error, photoSlot }) {
  const v = answers[q.id];
  const otherKey = `${q.id}__other`;
  const fieldId = `qf-${q.id}`;
  const describedBy = [q.help && `${fieldId}-help`, error && `${fieldId}-err`].filter(Boolean).join(' ') || undefined;

  let control = null;
  if (q.type === 'short' || q.type === 'email' || q.type === 'phone') {
    control = (
      <input id={fieldId} type={q.type === 'email' ? 'email' : q.type === 'phone' ? 'tel' : 'text'}
        autoComplete={{ full_name: 'name', email: 'email', phone: 'tel', project_address: 'street-address' }[q.id] ?? 'off'}
        value={v ?? ''} onChange={(e) => setAnswer(q.id, e.target.value)} aria-describedby={describedBy}
        aria-invalid={!!error} style={inputStyle(error)} className="focus:outline-none" maxLength={5000} />
    );
  } else if (q.type === 'long') {
    control = (
      <textarea id={fieldId} rows={4} value={v ?? ''} onChange={(e) => setAnswer(q.id, e.target.value)}
        aria-describedby={describedBy} aria-invalid={!!error} style={{ ...inputStyle(error), resize: 'vertical' }}
        className="focus:outline-none" maxLength={5000} />
    );
  } else if (q.type === 'single' || q.type === 'multi') {
    const multi = q.type === 'multi';
    const list = multi ? (Array.isArray(v) ? v : []) : null;
    const isOn = (val) => (multi ? list.includes(val) : v === val);
    const toggle = (val) => {
      if (!multi) return setAnswer(q.id, val);
      setAnswer(q.id, isOn(val) ? list.filter((x) => x !== val) : [...list, val]);
    };
    control = (
      <div role={multi ? 'group' : 'radiogroup'} aria-labelledby={`${fieldId}-label`} aria-describedby={describedBy} className="space-y-2">
        {q.options.map((o) => (
          <Choice key={o.label} type={multi ? 'checkbox' : 'radio'} name={fieldId} checked={isOn(o.label)}
            onChange={() => toggle(o.label)} label={o.label} description={o.description} />
        ))}
        {q.other && (
          <Choice type={multi ? 'checkbox' : 'radio'} name={fieldId} checked={isOn(OTHER_VALUE)}
            onChange={() => toggle(OTHER_VALUE)} label="Other">
            {isOn(OTHER_VALUE) && (
              <input value={answers[otherKey] ?? ''} onChange={(e) => setAnswer(otherKey, e.target.value)}
                aria-label={`${q.label} — other`} placeholder="Please describe" maxLength={500}
                className="mt-2 focus:outline-none" style={{ ...inputStyle(false), fontSize: '0.85rem' }} />
            )}
          </Choice>
        )}
      </div>
    );
  } else if (q.type === 'photos') {
    control = photoSlot ? photoSlot(q) : (
      <div className="px-4 py-5 rounded-xl text-center text-xs" style={{ border: `1.5px dashed ${BORDER}`, color: '#9CA3AF', backgroundColor: '#FAFAF8' }}>
        Photo upload (up to {q.maxFiles}) — available on the customer’s link.
      </div>
    );
  }

  return (
    <div className="py-5" style={{ borderTop: first ? 'none' : '1px solid #F1EFEA' }}>
      <label id={`${fieldId}-label`} htmlFor={q.type === 'single' || q.type === 'multi' || q.type === 'photos' ? undefined : fieldId}
        className="block text-sm font-bold mb-1" style={{ color: NAVY }}>
        {q.label || 'Untitled question'}
        {q.required && <span style={{ color: '#DC2626' }} aria-label="required"> *</span>}
      </label>
      {q.help && <p id={`${fieldId}-help`} className="text-xs mb-3 leading-relaxed" style={{ color: '#6B7280' }}>{q.help}</p>}
      {!q.help && <div className="mb-2" />}
      {control}
      {error && <p id={`${fieldId}-err`} role="alert" className="text-xs font-semibold mt-2" style={{ color: '#DC2626' }}>{error}</p>}
    </div>
  );
}

/**
 * questionnaire: normalized questionnaire ({ title, intro, sections })
 * answers / onChange(nextAnswers): controlled answers
 * errors: { [questionId]: message }
 * footer: rendered under the last section (submit button etc.)
 */
export default function QuestionnaireForm({ questionnaire, answers, onChange, errors = {}, footer, photoSlot }) {
  const setAnswer = (key, value) => onChange({ ...answers, [key]: value });
  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-2xl overflow-hidden mb-5" style={{ backgroundColor: '#fff', border: `1.5px solid ${BORDER}`, boxShadow: '0 4px 24px rgba(0,33,71,0.06)' }}>
        <div className="px-6 sm:px-8 py-6 flex items-center gap-4" style={{ backgroundColor: NAVY }}>
          <img src="/orozco-homes-logo.png" alt="Orozco Homes" className="h-12 w-auto rounded-xl shrink-0 object-contain" />
          <div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: GOLD }}>Orozco Homes</p>
            <h1 className="text-xl sm:text-2xl font-bold text-white">{questionnaire.title}</h1>
          </div>
        </div>
        {questionnaire.intro && (
          <div className="px-6 sm:px-8 py-5">
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#374151' }}>{questionnaire.intro}</p>
            <p className="text-xs mt-3" style={{ color: '#DC2626' }}>* Indicates required question</p>
          </div>
        )}
      </div>

      {questionnaire.sections.map((s) => (
        <section key={s.id} className="rounded-2xl mb-5 px-6 sm:px-8 pt-5 pb-2"
          style={{ backgroundColor: '#fff', border: `1.5px solid ${BORDER}` }} aria-label={s.title || undefined}>
          {s.title && (
            <h2 className="text-xs font-bold uppercase tracking-widest pb-1" style={{ color: GOLD }}>{s.title}</h2>
          )}
          {s.questions.map((q, i) => (
            <Question key={q.id} q={q} first={i === 0} answers={answers} setAnswer={setAnswer} error={errors[q.id]} photoSlot={photoSlot} />
          ))}
        </section>
      ))}
      {footer}
    </div>
  );
}
