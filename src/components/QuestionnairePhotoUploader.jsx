// src/components/QuestionnairePhotoUploader.jsx — the customer's photo picker
// for a "photos" question. Each photo uploads as soon as it is chosen; the
// answer is the list of uploaded file paths.
import { useRef, useState, useEffect } from 'react';
import { QUESTIONNAIRE_PHOTO_ACCEPT, checkQuestionnairePhoto, uploadQuestionnairePhoto } from '../lib/questionnairePhotos';

const NAVY = '#002147';
const GOLD = '#D4AF37';

/**
 * q: the question ({ id, label, maxFiles })
 * value: uploaded file paths
 * update(fn): replaces the paths with fn(currentPaths), so uploads that
 *   finish one after another never overwrite each other
 * token: private link code, or null for the website link
 * onBusyChange(delta): +1 when an upload starts, -1 when it ends
 */
export default function QuestionnairePhotoUploader({ q, value, update, token, onBusyChange }) {
  const inputRef = useRef(null);
  const [previews, setPreviews] = useState({}); // path → local preview link
  const [pending, setPending] = useState([]);   // { id, preview } still uploading
  const [error, setError] = useState('');
  const paths = Array.isArray(value) ? value : [];

  useEffect(() => () => Object.values(previews).forEach((u) => URL.revokeObjectURL(u)), []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleFiles(e) {
    const files = [...(e.target.files ?? [])];
    if (inputRef.current) inputRef.current.value = '';
    setError('');
    const room = q.maxFiles - paths.length - pending.length;
    if (files.length > room) setError(room > 0 ? `You can add ${room} more photo${room === 1 ? '' : 's'} here — the first ${room} were added.` : `This question allows up to ${q.maxFiles} photos.`);
    for (const file of files.slice(0, Math.max(0, room))) {
      const problem = checkQuestionnairePhoto(file);
      if (problem) { setError(`${file.name}: ${problem}`); continue; }
      const id = `${Date.now()}-${Math.random()}`;
      const preview = URL.createObjectURL(file);
      setPending((p) => [...p, { id, preview }]);
      onBusyChange?.(1);
      const res = await uploadQuestionnairePhoto(token, file);
      onBusyChange?.(-1);
      setPending((p) => p.filter((x) => x.id !== id));
      if (res.error) { URL.revokeObjectURL(preview); setError(res.error); continue; }
      setPreviews((p) => ({ ...p, [res.path]: preview }));
      update((cur) => [...cur, res.path]);
    }
  }

  const remove = (path) => { setError(''); update((cur) => cur.filter((p) => p !== path)); };
  const full = paths.length + pending.length >= q.maxFiles;

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {paths.map((p, i) => (
          <div key={p} className="relative aspect-square rounded-xl overflow-hidden" style={{ border: '1.5px solid #E8E6E1', backgroundColor: '#F5F4F0' }}>
            {previews[p]
              ? <img src={previews[p]} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              : <span className="flex items-center justify-center h-full text-xs" style={{ color: '#6B7280' }}>Photo {i + 1}</span>}
            <button type="button" onClick={() => remove(p)} aria-label={`Remove photo ${i + 1}`}
              className="absolute top-1 right-1 w-6 h-6 rounded-full text-sm font-bold flex items-center justify-center"
              style={{ backgroundColor: 'rgba(0,33,71,0.85)', color: '#fff' }}>×</button>
          </div>
        ))}
        {pending.map((x) => (
          <div key={x.id} className="relative aspect-square rounded-xl overflow-hidden" style={{ border: `1.5px solid ${GOLD}` }}>
            <img src={x.preview} alt="Uploading" className="w-full h-full object-cover opacity-50" />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color: NAVY }}>Uploading…</span>
          </div>
        ))}
        {!full && (
          <button type="button" onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-bold"
            style={{ border: `1.5px dashed ${GOLD}`, color: NAVY, backgroundColor: '#FFFDF5' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
            </svg>
            Add photos
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" multiple accept={QUESTIONNAIRE_PHOTO_ACCEPT} onChange={handleFiles}
        className="hidden" aria-label={`${q.label} — choose photos`} />
      <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>{paths.length} of {q.maxFiles} photos</p>
      {error && <p role="alert" className="text-xs font-semibold mt-1" style={{ color: '#DC2626' }}>{error}</p>}
    </div>
  );
}
