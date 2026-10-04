// src/components/PaperCopyPanel.jsx — upload / view a signed paper copy
import { useRef, useState } from 'react';
import { SIGNED_ACCEPT, checkSignedFile, uploadSignedCopy, removeSignedCopy, openSignedCopy } from '../lib/signedDocuments';

const NAVY = '#002147';

/**
 * kind:      'proposals' | 'contracts' (storage folder)
 * docLabel:  'proposal' | 'contract'
 * canUpload: false once the document is already signed
 * onAttach:  async (path) => error message or null; marks the document signed
 */
export default function PaperCopyPanel({ kind, docLabel, docId, filePath, canUpload, onAttach, onMessage }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!docId || (!canUpload && !filePath)) return null;

  async function handleUpload() {
    const problem = checkSignedFile(file);
    if (problem) { setError(problem); return; }
    if (!confirm(`Mark this ${docLabel} as signed on paper and attach "${file.name}"? It will be locked after this.`)) return;
    setBusy(true); setError('');
    const { path, error: upErr } = await uploadSignedCopy(kind, docId, file);
    if (upErr) { setBusy(false); setError(upErr); return; }
    const err = await onAttach(path);
    setBusy(false);
    if (err) { await removeSignedCopy(path); setError(err); return; }
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleView() {
    const { error: err } = await openSignedCopy(filePath);
    if (err) onMessage?.(err, 'error');
  }

  return (
    <div className="mt-3 px-4 py-3 rounded-xl text-xs flex flex-wrap items-center gap-3"
      style={{ backgroundColor: '#F9F8F6', border: '1px dashed #D1D5DB', color: '#374151' }}>
      {filePath ? (
        <>
          <span className="flex-1 min-w-[200px]">📎 A signed paper copy is attached to this {docLabel}.</span>
          <button onClick={handleView} className="px-3 py-1.5 rounded-lg font-bold" style={{ backgroundColor: '#fff', border: '1px solid #D1D5DB', color: NAVY }}>
            View signed copy
          </button>
        </>
      ) : (
        <>
          <span className="flex-1 min-w-[200px]">
            <strong>Signed on paper?</strong> Upload the signed copy (PDF or photo, up to 15 MB) to keep it here and mark the {docLabel} signed.
          </span>
          <input ref={inputRef} type="file" accept={SIGNED_ACCEPT} aria-label="Signed copy file"
            onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(''); }} className="text-xs max-w-[220px]" />
          <button onClick={handleUpload} disabled={busy || !file} className="px-3 py-1.5 rounded-lg font-bold disabled:opacity-50"
            style={{ backgroundColor: NAVY, color: '#D4AF37' }}>
            {busy ? 'Uploading…' : 'Upload signed copy'}
          </button>
          {error && <p role="alert" className="w-full font-semibold" style={{ color: '#DC2626' }}>{error}</p>}
        </>
      )}
    </div>
  );
}
