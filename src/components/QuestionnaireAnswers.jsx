// src/components/QuestionnaireAnswers.jsx — a customer's answers, laid out
// for review and printing before the consultation.
import { useEffect, useState } from 'react';
import { formatAnswer, allQuestions } from '../utils/questionnaireTemplate';
import { signedQuestionnairePhotoUrls } from '../lib/questionnairePhotos';

const NAVY = '#002147';
const GOLD = '#D4AF37';

const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' }) : '');

export default function QuestionnaireAnswers({ record, id }) {
  const q = record.questionnaire;
  const answers = record.answers ?? {};
  const [photoUrls, setPhotoUrls] = useState({});
  const photoKey = allQuestions(q).filter((x) => x.type === 'photos').flatMap((x) => answers[x.id] ?? []).join('|');
  useEffect(() => {
    const paths = photoKey ? photoKey.split('|') : [];
    let live = true;
    signedQuestionnairePhotoUrls(paths).then((m) => { if (live) setPhotoUrls(m); });
    return () => { live = false; };
  }, [photoKey]);

  return (
    <div id={id} className="bg-white px-8 sm:px-12 py-10" style={{ color: '#1F2937' }}>
      <div className="flex items-center gap-4 pb-5 mb-6" style={{ borderBottom: `2px solid ${GOLD}` }}>
        <img src="/orozco-homes-logo.png" alt="Orozco Homes" className="h-12 w-auto rounded-xl object-contain" />
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: GOLD }}>Orozco Homes</p>
          <h2 className="text-xl font-bold" style={{ color: NAVY }}>{q?.title || 'Pre-Consultation Questionnaire'}</h2>
        </div>
        <div className="text-right text-xs" style={{ color: '#6B7280' }}>
          <p className="font-bold text-sm" style={{ color: NAVY }}>{record.respondent_name || 'Unnamed customer'}</p>
          {record.submitted_at && <p>Submitted {fmtDateTime(record.submitted_at)}</p>}
        </div>
      </div>

      {(q?.sections ?? []).map((s) => (
        <div key={s.id} className="mb-6" style={{ breakInside: 'avoid-page' }}>
          {s.title && <h3 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: GOLD }}>{s.title}</h3>}
          <dl>
            {s.questions.map((x) => {
              const a = formatAnswer(x, answers);
              const photos = x.type === 'photos' && Array.isArray(answers[x.id]) ? answers[x.id] : null;
              return (
                <div key={x.id} className="py-2.5" style={{ borderBottom: '1px solid #F1EFEA', breakInside: 'avoid' }}>
                  <dt className="text-xs font-semibold mb-0.5" style={{ color: '#6B7280' }}>{x.label}</dt>
                  {photos ? (
                    <dd className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-1">
                      {photos.map((p, i) => (
                        photoUrls[p] ? (
                          <a key={p} href={photoUrls[p]} target="_blank" rel="noopener noreferrer" className="block aspect-square rounded-lg overflow-hidden" style={{ border: '1px solid #E8E6E1' }}>
                            <img src={photoUrls[p]} alt={`${x.label} — photo ${i + 1}`} className="w-full h-full object-cover" />
                          </a>
                        ) : (
                          <span key={p} className="aspect-square rounded-lg flex items-center justify-center text-xs" style={{ border: '1px solid #E8E6E1', color: '#9CA3AF' }}>Photo {i + 1}</span>
                        )
                      ))}
                    </dd>
                  ) : (
                    <dd className="text-sm whitespace-pre-wrap" style={{ color: a ? NAVY : '#9CA3AF' }}>{a || '—'}</dd>
                  )}
                </div>
              );
            })}
          </dl>
        </div>
      ))}

      {record.admin_notes && (
        <div className="mt-6 px-4 py-3 rounded-xl" style={{ backgroundColor: '#F9F8F6', border: '1px solid #E8E6E1' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: GOLD }}>Orozco Homes notes</p>
          <p className="text-sm whitespace-pre-wrap">{record.admin_notes}</p>
        </div>
      )}
    </div>
  );
}
