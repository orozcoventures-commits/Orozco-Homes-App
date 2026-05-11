import { useState, useRef, useEffect } from 'react';

const INITIAL_CONVERSATIONS = [
  {
    id: 'johnson',
    client: 'Sarah Johnson',
    project: 'Kitchen Remodel',
    initials: 'SJ',
    color: '#3B82F6',
    unread: 2,
    messages: [
      { id: 1, from: 'contractor', text: "Hi Sarah! Wanted to give you a quick update — demo is 100% done and we passed the rough-in inspection today.", time: '9:00 AM', date: 'Feb 5' },
      { id: 2, from: 'client',     text: "That's great news! How did the plumbing look behind the walls?", time: '9:14 AM', date: 'Feb 5' },
      { id: 3, from: 'contractor', text: "Plumbing was in good shape. We did find one supply line that needed replacing — already done, no extra cost.", time: '9:18 AM', date: 'Feb 5' },
      { id: 4, from: 'client',     text: "Perfect. When do the tile guys start?", time: '9:20 AM', date: 'Feb 5' },
      { id: 5, from: 'contractor', text: "Tile crew starts Monday Feb 10. We'll do the backsplash first, then the floor.", time: '9:22 AM', date: 'Feb 5' },
      { id: 6, from: 'client',     text: "When will the cabinets arrive?", time: '2:15 PM', date: 'Feb 13' },
      { id: 7, from: 'client',     text: "Also, can we do the island in a slightly darker stain than the perimeter cabinets?", time: '2:17 PM', date: 'Feb 13' },
    ],
  },
  {
    id: 'rodriguez',
    client: 'Maria Rodriguez',
    project: 'Master Bath',
    initials: 'MR',
    color: '#7C3AED',
    unread: 0,
    messages: [
      { id: 1, from: 'contractor', text: "Maria, demo is wrapped up! Subfloor looks solid — no surprises.", time: '3:00 PM', date: 'Feb 1' },
      { id: 2, from: 'client',     text: "Wonderful! Did you get a chance to look at the niche placement I marked on the wall?", time: '3:30 PM', date: 'Feb 1' },
      { id: 3, from: 'contractor', text: "Yes — two niches, 12\" × 24\" each, centered in the shower surround. We'll frame those out tomorrow.", time: '3:45 PM', date: 'Feb 1' },
      { id: 4, from: 'client',     text: "That sounds perfect. Thank you!", time: '4:00 PM', date: 'Feb 1' },
    ],
  },
  {
    id: 'lee',
    client: 'David Lee',
    project: 'Garage Conversion',
    initials: 'DL',
    color: '#059669',
    unread: 1,
    messages: [
      { id: 1, from: 'contractor', text: "David, permits came through! We're cleared to start framing next week.", time: '11:00 AM', date: 'Feb 12' },
      { id: 2, from: 'client',     text: "Excellent! What's the first phase?", time: '11:20 AM', date: 'Feb 12' },
      { id: 3, from: 'contractor', text: "Framing and insulation first, then rough electrical and plumbing. Should take about 2 weeks.", time: '11:25 AM', date: 'Feb 12' },
      { id: 4, from: 'client',     text: "Do we need to pick out flooring before then?", time: '8:40 AM', date: 'Feb 14' },
    ],
  },
];

function Avatar({ initials, color, size = 'md' }) {
  const s = size === 'sm' ? { wh: '32px', font: '0.65rem' } : { wh: '40px', font: '0.8rem' };
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
      style={{ width: s.wh, height: s.wh, backgroundColor: color, fontSize: s.font }}
    >
      {initials}
    </div>
  );
}

export default function MessageCenter() {
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS);
  const [activeId, setActiveId] = useState('johnson');
  const [input, setInput] = useState('');
  const [showList, setShowList] = useState(true); // mobile: toggle between list and chat
  const bottomRef = useRef(null);

  const active = conversations.find((c) => c.id === activeId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [active?.messages.length]);

  function selectConversation(id) {
    setConversations((prev) =>
      prev.map((c) => c.id === id ? { ...c, unread: 0 } : c)
    );
    setActiveId(id);
    setShowList(false);
  }

  function sendMessage() {
    if (!input.trim()) return;
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const date = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? { ...c, messages: [...c.messages, { id: Date.now(), from: 'contractor', text: input.trim(), time, date }] }
          : c
      )
    );
    setInput('');
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  const totalUnread = conversations.reduce((s, c) => s + c.unread, 0);

  return (
    <div className="flex h-[calc(100vh-56px)]" style={{ backgroundColor: '#F5F4F0' }}>

      {/* ── Conversation list ─────────────────────────────────────── */}
      <div
        className={`${showList ? 'flex' : 'hidden'} md:flex flex-col shrink-0 border-r`}
        style={{ width: '280px', backgroundColor: '#fff', borderColor: '#E8E6E1' }}
      >
        {/* List header */}
        <div className="px-4 py-4 border-b" style={{ borderColor: '#E8E6E1' }}>
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base" style={{ color: '#002147' }}>Messages</h2>
            {totalUnread > 0 && (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#EF4444', color: '#fff' }}
              >
                {totalUnread}
              </span>
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{conversations.length} active projects</p>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => {
            const last = conv.messages[conv.messages.length - 1];
            const isActive = conv.id === activeId;
            return (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className="w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors duration-120 focus:outline-none border-b"
                style={{
                  backgroundColor: isActive ? '#F0EEE9' : 'transparent',
                  borderColor: '#F5F4F0',
                  borderLeft: isActive ? '3px solid #D4AF37' : '3px solid transparent',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = '#F9F8F6'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <Avatar initials={conv.initials} color={conv.color} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-semibold truncate" style={{ color: '#002147' }}>{conv.client}</p>
                    {conv.unread > 0 && (
                      <span
                        className="text-xs font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-1"
                        style={{ backgroundColor: '#EF4444', color: '#fff', fontSize: '0.6rem' }}
                      >
                        {conv.unread}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium mb-0.5" style={{ color: '#D4AF37' }}>{conv.project}</p>
                  <p className="text-xs truncate" style={{ color: '#9CA3AF' }}>{last?.text}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Chat window ──────────────────────────────────────────── */}
      <div className={`${showList ? 'hidden' : 'flex'} md:flex flex-1 flex-col min-w-0`}>
        {active ? (
          <>
            {/* Chat header */}
            <div
              className="flex items-center gap-3 px-4 sm:px-6 py-3.5 border-b shrink-0"
              style={{ backgroundColor: '#fff', borderColor: '#E8E6E1' }}
            >
              {/* Mobile back button */}
              <button
                onClick={() => setShowList(true)}
                className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center focus:outline-none mr-1"
                style={{ backgroundColor: '#F0EEE9', color: '#002147' }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 2 4 7 9 12" />
                </svg>
              </button>
              <Avatar initials={active.initials} color={active.color} />
              <div>
                <p className="font-bold text-sm" style={{ color: '#002147' }}>{active.client}</p>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>{active.project}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
              {active.messages.map((msg, i) => {
                const isContractor = msg.from === 'contractor';
                const showDate = i === 0 || active.messages[i - 1].date !== msg.date;
                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px" style={{ backgroundColor: '#E8E6E1' }} />
                        <p className="text-xs font-semibold px-2" style={{ color: '#9CA3AF' }}>{msg.date}</p>
                        <div className="flex-1 h-px" style={{ backgroundColor: '#E8E6E1' }} />
                      </div>
                    )}
                    <div className={`flex items-end gap-2 ${isContractor ? 'flex-row-reverse' : 'flex-row'}`}>
                      {!isContractor && <Avatar initials={active.initials} color={active.color} size="sm" />}
                      <div
                        className="max-w-[72%] px-4 py-2.5 rounded-2xl"
                        style={{
                          backgroundColor: isContractor ? '#002147' : '#fff',
                          color: isContractor ? '#fff' : '#002147',
                          border: isContractor ? 'none' : '1.5px solid #E8E6E1',
                          borderBottomRightRadius: isContractor ? '4px' : '16px',
                          borderBottomLeftRadius: isContractor ? '16px' : '4px',
                        }}
                      >
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                        <p
                          className="text-xs mt-1"
                          style={{ color: isContractor ? 'rgba(255,255,255,0.45)' : '#9CA3AF', textAlign: isContractor ? 'right' : 'left' }}
                        >
                          {msg.time}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div
              className="px-4 sm:px-6 py-3 border-t shrink-0"
              style={{ backgroundColor: '#fff', borderColor: '#E8E6E1' }}
            >
              <div className="flex items-end gap-3">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Type a message… (Enter to send)"
                  rows={1}
                  className="flex-1 text-sm rounded-xl px-4 py-2.5 resize-none focus:outline-none"
                  style={{
                    border: '1.5px solid #E8E6E1',
                    color: '#002147',
                    backgroundColor: '#F9F8F6',
                    maxHeight: '120px',
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150 focus:outline-none"
                  style={{
                    backgroundColor: input.trim() ? '#002147' : '#E8E6E1',
                    color: input.trim() ? '#D4AF37' : '#9CA3AF',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm" style={{ color: '#9CA3AF' }}>Select a conversation</p>
          </div>
        )}
      </div>
    </div>
  );
}
