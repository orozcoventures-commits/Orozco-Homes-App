import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const CATEGORIES = ['All', 'Demo', 'Framing', 'Plumbing', 'Electrical', 'Tile', 'Cabinets', 'Finishing'];

const CARD_GRADIENTS = [
  'linear-gradient(135deg,#1E3A5F 0%,#2E6DAA 100%)',
  'linear-gradient(135deg,#374151 0%,#6B7280 100%)',
  'linear-gradient(135deg,#3B2F1E 0%,#7C5B3A 100%)',
  'linear-gradient(135deg,#1A3A2A 0%,#2D6B45 100%)',
  'linear-gradient(135deg,#4A1942 0%,#7D3C73 100%)',
  'linear-gradient(135deg,#002147 0%,#1B4F6B 100%)',
  'linear-gradient(135deg,#3B1F0A 0%,#8B4513 100%)',
];

function gradientForId(id = '') {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return CARD_GRADIENTS[hash % CARD_GRADIENTS.length];
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ src, caption, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.88)' }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 flex items-center justify-center w-9 h-9 rounded-full"
        style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: '#fff' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <img
        src={src}
        alt={caption}
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl"
      />

      {caption && (
        <p
          className="mt-4 text-sm text-center max-w-lg px-4"
          style={{ color: 'rgba(255,255,255,0.75)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {caption}
        </p>
      )}

      <p className="mt-2 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
        Press Esc or click outside to close
      </p>
    </div>
  );
}

// ── Feed card ─────────────────────────────────────────────────────────────────
function FeedCard({ entry, onLike, onEnlarge }) {
  const projectName = entry.project?.project_name ?? entry.project_id ?? '—';
  const formattedDate = new Date(entry.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  const formattedTime = new Date(entry.created_at).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  });

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 2px 10px rgba(0,33,71,0.06)' }}
    >
      {/* Image / placeholder */}
      <div className="relative" style={{ height: '240px' }}>
        {entry.image_url ? (
          <button
            className="w-full h-full focus:outline-none group"
            onClick={() => onEnlarge(entry)}
            title="Click to enlarge"
          >
            <img
              src={entry.image_url}
              alt={entry.caption}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
            {/* Enlarge hint */}
            <div
              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{ backgroundColor: 'rgba(0,0,0,0.28)' }}
            >
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold"
                style={{ backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
                </svg>
                Click to enlarge
              </div>
            </div>
          </button>
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: gradientForId(entry.id) }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: '#D4AF37', color: '#002147', letterSpacing: '0.04em' }}
          >
            {entry.category}
          </span>
        </div>
      </div>

      <div className="p-5">
        <p className="text-xs font-semibold mb-1.5" style={{ color: '#D4AF37' }}>{projectName}</p>
        <p className="text-sm leading-relaxed mb-3" style={{ color: '#002147' }}>{entry.caption}</p>
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: '#9CA3AF' }}>{formattedDate} · {formattedTime}</p>
          <button
            onClick={() => onLike(entry.id)}
            className="flex items-center gap-1.5 text-xs font-semibold transition-colors duration-150 focus:outline-none"
            style={{ color: '#9CA3AF' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#9CA3AF'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {entry.likes ?? 0}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PhotoLog() {
  const { user, isAdmin, loading } = useAuth();

  const [feed, setFeed]                   = useState([]);
  const [projects, setProjects]           = useState([]);
  const [fetching, setFetching]           = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  // Form state
  const [caption, setCaption]     = useState('');
  const [category, setCategory]   = useState('Tile');
  const [projectId, setProjectId] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [posting, setPosting]     = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError]         = useState('');

  // Lightbox
  const [lightbox, setLightbox] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (loading || !user) return;
    fetchData();
  }, [user, loading]);

  async function fetchData() {
    setFetching(true);
    const [logsRes, projectsRes] = await Promise.all([
      supabase
        .from('photo_logs')
        .select('id, category, caption, image_url, created_at, likes, project:projects(id, project_name)')
        .order('created_at', { ascending: false }),
      supabase
        .from('projects')
        .select('id, project_name')
        .order('project_name'),
    ]);

    if (logsRes.data) setFeed(logsRes.data);
    if (projectsRes.data) {
      setProjects(projectsRes.data);
      if (projectsRes.data.length > 0 && !projectId) {
        setProjectId(projectsRes.data[0].id);
      }
    }
    setFetching(false);
  }

  function handlePhotoSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      setError('Photo must be under 10 MB.');
      return;
    }

    setPhotoFile(file);
    setError('');

    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  }

  function clearPhoto() {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handlePost() {
    if (!caption.trim() || !projectId) return;
    setPosting(true);
    setError('');
    setUploadProgress(0);

    let imageUrl = null;

    // Upload photo if one was selected
    if (photoFile) {
      const ext = photoFile.name.split('.').pop().toLowerCase();
      const safeName = `${user.id}/${Date.now()}.${ext}`;

      setUploadProgress(30);
      const { error: uploadErr } = await supabase.storage
        .from('project-photos')
        .upload(safeName, photoFile, { cacheControl: '3600', upsert: false });

      if (uploadErr) {
        setError(`Photo upload failed: ${uploadErr.message}`);
        setPosting(false);
        setUploadProgress(0);
        return;
      }

      setUploadProgress(70);
      const { data: urlData } = supabase.storage
        .from('project-photos')
        .getPublicUrl(safeName);
      imageUrl = urlData.publicUrl;
    }

    setUploadProgress(90);
    const { data: newEntry, error: insertErr } = await supabase
      .from('photo_logs')
      .insert({
        project_id: projectId,
        category,
        caption: caption.trim(),
        created_by: user.id,
        image_url: imageUrl,
      })
      .select('id, category, caption, image_url, created_at, likes, project:projects(id, project_name)')
      .single();

    setUploadProgress(0);
    setPosting(false);

    if (insertErr) {
      setError(`Failed to save update: ${insertErr.message}`);
      return;
    }

    setFeed((prev) => [newEntry, ...prev]);
    setCaption('');
    clearPhoto();
  }

  const handleLike = useCallback((id) => {
    setFeed((prev) => prev.map((e) => e.id === id ? { ...e, likes: (e.likes || 0) + 1 } : e));
  }, []);

  const handleEnlarge = useCallback((entry) => {
    setLightbox(entry);
  }, []);

  if (loading || !user) return null;

  const filtered = activeCategory === 'All' ? feed : feed.filter((e) => e.category === activeCategory);
  const canPost  = caption.trim() && projectId && !posting;

  return (
    <>
      {lightbox && (
        <Lightbox
          src={lightbox.image_url}
          caption={lightbox.caption}
          onClose={() => setLightbox(null)}
        />
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-bold tracking-[0.18em] uppercase mb-1" style={{ color: '#D4AF37' }}>
            {isAdmin ? 'Contractor Tool' : 'Client Portal'}
          </p>
          <h2 className="text-2xl font-bold" style={{ color: '#002147' }}>Progress Photo Log</h2>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
            {isAdmin
              ? 'Post progress updates so clients can follow along in real time.'
              : 'See the latest progress photos from your project.'}
          </p>
        </div>

        {/* Post form — admin only */}
        {isAdmin && (
          <div
            className="rounded-2xl p-5 mb-8"
            style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 2px 12px rgba(0,33,71,0.07)' }}
          >
            <h3 className="font-bold text-sm mb-4" style={{ color: '#002147' }}>Post a Progress Update</h3>

            {/* Project + Category */}
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Project</label>
                {projects.length === 0 ? (
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>No projects yet.</p>
                ) : (
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full text-sm rounded-xl px-3 py-2 focus:outline-none"
                    style={{ border: '1.5px solid #E8E6E1', color: '#002147', backgroundColor: '#F9F8F6' }}
                  >
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.project_name}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-sm rounded-xl px-3 py-2 focus:outline-none"
                  style={{ border: '1.5px solid #E8E6E1', color: '#002147', backgroundColor: '#F9F8F6' }}
                >
                  {CATEGORIES.filter((c) => c !== 'All').map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Photo upload */}
            <div className="mb-3">
              <label className="block text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Photo</label>

              {photoPreview ? (
                /* Preview with remove button */
                <div className="relative rounded-xl overflow-hidden" style={{ height: '180px' }}>
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    onClick={clearPhoto}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff' }}
                    title="Remove photo"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                  <div
                    className="absolute bottom-2 left-2 text-xs px-2 py-1 rounded-lg"
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff' }}
                  >
                    {photoFile?.name}
                  </div>
                </div>
              ) : (
                /* Drop zone / file picker */
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 rounded-xl transition-colors duration-150 focus:outline-none"
                  style={{
                    height: '120px',
                    border: '1.5px dashed #D4AF37',
                    backgroundColor: '#FDFCF8',
                    color: '#9CA3AF',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FAF7EE'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FDFCF8'; }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(212,175,55,0.12)' }}
                  >
                    {/* Camera icon */}
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold" style={{ color: '#D4AF37' }}>Choose a photo</p>
                    <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>JPEG, PNG, WEBP — max 10 MB</p>
                  </div>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </div>

            {/* Caption */}
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Describe what was completed, e.g. 'Plumbing rough-in passed inspection. Moving to backer board tomorrow.'"
              rows={3}
              className="w-full text-sm rounded-xl px-3 py-2 resize-none focus:outline-none mb-3"
              style={{ border: '1.5px solid #E8E6E1', color: '#002147', backgroundColor: '#F9F8F6' }}
            />

            {/* Upload progress bar */}
            {posting && uploadProgress > 0 && (
              <div className="mb-3 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#E8E6E1' }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%`, backgroundColor: '#D4AF37' }}
                />
              </div>
            )}

            {error && <p className="text-xs mb-2" style={{ color: '#EF4444' }}>{error}</p>}

            <div className="flex justify-end">
              <button
                onClick={handlePost}
                disabled={!canPost}
                className="px-5 py-2 rounded-xl text-sm font-bold transition-all duration-150 focus:outline-none flex items-center gap-2"
                style={{
                  backgroundColor: canPost ? '#D4AF37' : '#E5E3DF',
                  color: canPost ? '#002147' : '#9CA3AF',
                  cursor: canPost ? 'pointer' : 'not-allowed',
                }}
              >
                {posting ? (
                  <>
                    <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    {photoFile ? 'Uploading…' : 'Posting…'}
                  </>
                ) : 'Post Update'}
              </button>
            </div>
          </div>
        )}

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap mb-6">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 focus:outline-none"
              style={{
                backgroundColor: activeCategory === c ? '#002147' : '#F0EEE9',
                color: activeCategory === c ? '#fff' : '#6B7280',
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Feed */}
        {fetching ? (
          <div className="flex items-center gap-3 py-16 justify-center">
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.2" /><path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
            <span className="text-sm" style={{ color: '#9CA3AF' }}>Loading photos…</span>
          </div>
        ) : (
          <div className="space-y-6">
            {filtered.length === 0 ? (
              <div className="text-center py-12 rounded-2xl" style={{ border: '1.5px dashed #E8E6E1' }}>
                <p className="text-sm font-semibold mb-1" style={{ color: '#374151' }}>No updates yet</p>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>
                  {activeCategory === 'All'
                    ? isAdmin ? 'Post the first progress update above.' : "Your contractor hasn't posted any updates yet."
                    : `No updates in the "${activeCategory}" category.`}
                </p>
              </div>
            ) : (
              filtered.map((entry) => (
                <FeedCard
                  key={entry.id}
                  entry={entry}
                  onLike={handleLike}
                  onEnlarge={handleEnlarge}
                />
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}
