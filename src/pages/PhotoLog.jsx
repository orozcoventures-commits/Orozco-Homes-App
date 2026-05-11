import { useState } from 'react';

const CATEGORIES = ['All', 'Demo', 'Framing', 'Plumbing', 'Electrical', 'Tile', 'Cabinets', 'Finishing'];

const INITIAL_FEED = [
  {
    id: 1,
    project: 'Kitchen Remodel – Johnson',
    category: 'Tile',
    caption: 'Tile Layout Day 3 — herringbone pattern coming together beautifully. About 60% complete on the backsplash.',
    date: 'Feb 13, 2025',
    time: '4:22 PM',
    gradient: 'linear-gradient(135deg,#1E3A5F 0%,#2E6DAA 100%)',
    likes: 3,
  },
  {
    id: 2,
    project: 'Kitchen Remodel – Johnson',
    category: 'Plumbing',
    caption: 'Plumbing rough-in complete and passed city inspection. Ready for backer board.',
    date: 'Feb 5, 2025',
    time: '11:08 AM',
    gradient: 'linear-gradient(135deg,#374151 0%,#6B7280 100%)',
    likes: 5,
  },
  {
    id: 3,
    project: 'Master Bath – Rodriguez',
    category: 'Demo',
    caption: 'Demo complete. Old vanity and shower surround removed. Subfloor in excellent condition.',
    date: 'Feb 1, 2025',
    time: '2:45 PM',
    gradient: 'linear-gradient(135deg,#3B2F1E 0%,#7C5B3A 100%)',
    likes: 2,
  },
  {
    id: 4,
    project: 'Kitchen Remodel – Johnson',
    category: 'Electrical',
    caption: 'Electrical rough-in done. Added 4 new GFCI circuits for island and appliances per updated plan.',
    date: 'Jan 30, 2025',
    time: '5:00 PM',
    gradient: 'linear-gradient(135deg,#1A3A2A 0%,#2D6B45 100%)',
    likes: 4,
  },
];

function FeedCard({ entry, onLike }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 2px 10px rgba(0,33,71,0.06)' }}
    >
      {/* Photo placeholder */}
      <div className="relative" style={{ height: '220px', background: entry.gradient }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>
        {/* Category badge */}
        <div className="absolute top-3 left-3">
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: '#D4AF37', color: '#002147', letterSpacing: '0.04em' }}
          >
            {entry.category}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        <p className="text-xs font-semibold mb-1.5" style={{ color: '#D4AF37' }}>{entry.project}</p>
        <p className="text-sm leading-relaxed mb-3" style={{ color: '#002147' }}>{entry.caption}</p>
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: '#9CA3AF' }}>{entry.date} · {entry.time}</p>
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
  const [feed, setFeed] = useState(INITIAL_FEED);
  const [activeCategory, setActiveCategory] = useState('All');
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('Tile');
  const [project, setProject] = useState('Kitchen Remodel – Johnson');
  const [posting, setPosting] = useState(false);

  function handlePost() {
    if (!caption.trim()) return;
    setPosting(true);
    setTimeout(() => {
      const gradients = [
        'linear-gradient(135deg,#4A1942 0%,#7D3C73 100%)',
        'linear-gradient(135deg,#002147 0%,#1B4F6B 100%)',
        'linear-gradient(135deg,#3B1F0A 0%,#8B4513 100%)',
      ];
      setFeed((prev) => [
        {
          id: Date.now(),
          project,
          category,
          caption: caption.trim(),
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          gradient: gradients[Math.floor(Math.random() * gradients.length)],
          likes: 0,
        },
        ...prev,
      ]);
      setCaption('');
      setPosting(false);
    }, 600);
  }

  function handleLike(id) {
    setFeed((prev) => prev.map((e) => e.id === id ? { ...e, likes: e.likes + 1 } : e));
  }

  const filtered = activeCategory === 'All' ? feed : feed.filter((e) => e.category === activeCategory);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-bold tracking-[0.18em] uppercase mb-1" style={{ color: '#D4AF37' }}>Contractor Tool</p>
        <h2 className="text-2xl font-bold" style={{ color: '#002147' }}>Progress Photo Log</h2>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>Post updates so clients can follow along in real time.</p>
      </div>

      {/* Post form */}
      <div
        className="rounded-2xl p-5 mb-8"
        style={{ backgroundColor: '#fff', border: '1.5px solid #E8E6E1', boxShadow: '0 2px 12px rgba(0,33,71,0.07)' }}
      >
        <h3 className="font-bold text-sm mb-4" style={{ color: '#002147' }}>Post a Progress Update</h3>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Project</label>
            <select
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="w-full text-sm rounded-xl px-3 py-2 focus:outline-none"
              style={{ border: '1.5px solid #E8E6E1', color: '#002147', backgroundColor: '#F9F8F6' }}
            >
              <option>Kitchen Remodel – Johnson</option>
              <option>Master Bath – Rodriguez</option>
              <option>Garage Conversion – Lee</option>
            </select>
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
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: '#9CA3AF' }}>Photo upload coming soon — paste a URL or use caption only.</p>
          <button
            onClick={handlePost}
            disabled={!caption.trim() || posting}
            className="px-5 py-2 rounded-xl text-sm font-bold transition-all duration-150 focus:outline-none"
            style={{
              backgroundColor: caption.trim() && !posting ? '#D4AF37' : '#E5E3DF',
              color: caption.trim() && !posting ? '#002147' : '#9CA3AF',
              cursor: caption.trim() && !posting ? 'pointer' : 'not-allowed',
            }}
          >
            {posting ? 'Posting…' : 'Post Update'}
          </button>
        </div>
      </div>

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
      <div className="space-y-6">
        {filtered.length === 0 ? (
          <p className="text-center py-12 text-sm" style={{ color: '#9CA3AF' }}>No updates in this category yet.</p>
        ) : (
          filtered.map((entry) => <FeedCard key={entry.id} entry={entry} onLike={handleLike} />)
        )}
      </div>
    </div>
  );
}
