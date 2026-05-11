import { useState, useEffect } from 'react';
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

function FeedCard({ entry, onLike }) {
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
      <div className="relative" style={{ height: '220px', background: gradientForId(entry.id) }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>
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
            {entry.likes}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PhotoLog() {
  const { user, isAdmin, loading } = useAuth();
  const [feed, setFeed]             = useState([]);
  const [projects, setProjects]     = useState([]);
  const [fetching, setFetching]     = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [caption, setCaption]       = useState('');
  const [category, setCategory]     = useState('Tile');
  const [projectId, setProjectId]   = useState('');
  const [posting, setPosting]       = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    if (loading || !user) return;
    fetchData();
  }, [user, loading]);

  async function fetchData() {
    setFetching(true);
    const [logsRes, projectsRes] = await Promise.all([
      supabase
        .from('photo_logs')
        .select('id, category, caption, created_at, likes, project:projects(id, project_name)')
        .order('created_at', { ascending: false }),
      supabase
        .from('projects')
        .select('id, project_name')
        .order('project_name'),
    ]);

    if (logsRes.data)     setFeed(logsRes.data);
    if (projectsRes.data) {
      setProjects(projectsRes.data);
      if (projectsRes.data.length > 0 && !projectId) {
        setProjectId(projectsRes.data[0].id);
      }
    }
    setFetching(false);
  }

  async function handlePost() {
    if (!caption.trim() || !projectId) return;
    setPosting(true);
    setError('');
    const { error: err } = await supabase.from('photo_logs').insert({
      project_id: projectId,
      category,
      caption: caption.trim(),
      created_by: user.id,
    });
    if (err) {
      setError('Failed to post update. Please try again.');
    } else {
      setCaption('');
      await fetchData();
    }
    setPosting(false);
  }

  function handleLike(id) {
    setFeed((prev) => prev.map((e) => e.id === id ? { ...e, likes: (e.likes || 0) + 1 } : e));
  }

  if (loading || !user) return null;

  const filtered = activeCategory === 'All' ? feed : feed.filter((e) => e.category === activeCategory);

  return (
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
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.project_name}</option>
                  ))}
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
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Describe what was completed, e.g. 'Plumbing rough-in passed inspection. Moving to backer board tomorrow.'"
            rows={3}
            className="w-full text-sm rounded-xl px-3 py-2 resize-none focus:outline-none mb-3"
            style={{ border: '1.5px solid #E8E6E1', color: '#002147', backgroundColor: '#F9F8F6' }}
          />
          {error && <p className="text-xs mb-2" style={{ color: '#EF4444' }}>{error}</p>}
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: '#9CA3AF' }}>Photo upload coming soon — use caption for now.</p>
            <button
              onClick={handlePost}
              disabled={!caption.trim() || posting || !projectId}
              className="px-5 py-2 rounded-xl text-sm font-bold transition-all duration-150 focus:outline-none"
              style={{
                backgroundColor: caption.trim() && !posting && projectId ? '#D4AF37' : '#E5E3DF',
                color: caption.trim() && !posting && projectId ? '#002147' : '#9CA3AF',
                cursor: caption.trim() && !posting && projectId ? 'pointer' : 'not-allowed',
              }}
            >
              {posting ? 'Posting…' : 'Post Update'}
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
                  ? isAdmin ? 'Post the first progress update above.' : 'Your contractor hasn't posted any updates yet.'
                  : `No updates in the "${activeCategory}" category.`}
              </p>
            </div>
          ) : (
            filtered.map((entry) => <FeedCard key={entry.id} entry={entry} onLike={handleLike} />)
          )}
        </div>
      )}
    </div>
  );
}
