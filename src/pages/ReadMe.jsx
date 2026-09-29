import { useState } from 'react';

const SECTIONS = [
  {
    id: 'welcome',
    title: 'Welcome to Orozco Homes',
    roles: ['Admin', 'Designer', 'Client'],
    roleColors: [
      { label: 'Admin',    bg: '#D4AF37', color: '#002147' },
      { label: 'Designer', bg: '#7C3AED', color: '#fff' },
      { label: 'Client',   bg: '#1B4F6B', color: '#fff' },
    ],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5 L12 3 L21 9.5 V20 Q21 21 20 21 H4 Q3 21 3 20 Z" />
        <line x1="9" y1="21" x2="9" y2="13" /><line x1="15" y1="21" x2="15" y2="13" /><line x1="9" y1="13" x2="15" y2="13" />
      </svg>
    ),
    content: [
      {
        heading: 'What is the Orozco Homes Remodel Planner?',
        body: 'The Orozco Homes app is a private project management portal designed specifically for residential remodeling clients, interior designers, and the Orozco Homes administrative team. Every project gets its own secure workspace where all parties can communicate, track progress, review selections, and manage budgets — in real time.',
      },
      {
        heading: 'Three Roles, One Platform',
        body: null,
        list: [
          { term: 'Admin', desc: 'Full access. Creates clients and projects, manages budgets, publishes weekly progress updates, reviews approvals, and has complete visibility into every tool.' },
          { term: 'Designer', desc: 'Accesses the Designer Workspace exclusively. Curates material and finish selections per room, writes spec notes, and submits cards to clients for approval.' },
          { term: 'Client', desc: 'Views their own project via a secure PIN or personal login. Sees the Designer Workspace to approve or decline selections, plus Photo Log and Messages.' },
        ],
      },
      {
        heading: 'Getting Started',
        body: null,
        steps: [
          'An Admin creates your client account under Manage Clients.',
          'A project is created and a 4-digit PIN is assigned.',
          'You log in at the PIN screen or with your email and password.',
          'Your private portal loads — only your project data is visible.',
        ],
      },
    ],
  },
  {
    id: 'designer',
    title: 'Designer Workspace',
    roles: ['Designer', 'Client'],
    roleColors: [
      { label: 'Designer', bg: '#7C3AED', color: '#fff' },
      { label: 'Client',   bg: '#1B4F6B', color: '#fff' },
    ],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
        <line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/>
        <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
        <line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/>
      </svg>
    ),
    content: [
      {
        heading: 'What the Designer Workspace Does',
        body: 'The Designer Workspace is the live collaboration hub between the interior designer and the client. Designers build material and finish specifications organized by room (Kitchen, Master Bath, Living Room, etc.). Each spec card includes a title, finish or material detail, product links, and notes.',
      },
      {
        heading: 'For Designers — Curating Specs',
        body: null,
        steps: [
          'Select a project from the dropdown at the top of the workspace.',
          'Click "Add Spec" to create a new material card and assign it to a room.',
          'Fill in the title, specification detail, and any notes or product links.',
          'Once ready, the card is submitted to the client with a "Pending Review" status.',
          'Edit or delete any spec before it has been acted on by the client.',
        ],
      },
      {
        heading: 'For Clients — Reviewing Selections',
        body: 'When you log in, your Designer Workspace automatically loads your project. Specs are grouped by room using the filter tabs at the top. Each card shows the spec title, material detail, and designer notes.',
        list: [
          { term: 'Approve', desc: 'Tap the green Approve button to confirm the selection. The designer is notified and the card is marked Approved.' },
          { term: 'Decline + Feedback', desc: 'Tap Decline to open a feedback prompt. Describe what you\'d like changed — color preference, budget concern, alternative texture. Your message is saved directly on the card for the designer to review.' },
        ],
      },
      {
        heading: 'Status Badges',
        body: null,
        list: [
          { term: 'Pending Review', desc: 'The spec has been submitted and is awaiting your response.' },
          { term: 'Approved',       desc: 'You have confirmed this selection. It will be ordered or scheduled.' },
          { term: 'Declined',       desc: 'You requested a revision. Your feedback note is visible to the designer.' },
        ],
      },
    ],
  },
  {
    id: 'budget',
    title: 'Remodel Budget Calculator',
    roles: ['Admin'],
    roleColors: [
      { label: 'Admin', bg: '#D4AF37', color: '#002147' },
    ],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21 L16 21" /><line x1="12" y1="17" x2="12" y2="21" />
        <line x1="7" y1="8" x2="17" y2="8" /><line x1="7" y1="12" x2="13" y2="12" />
      </svg>
    ),
    content: [
      {
        heading: 'What the Budget Calculator Does',
        body: 'The Remodel Budget Calculator generates detailed cost estimates for renovation projects in the Virginia Beach / Hampton Roads region. All labor and material rates are indexed to 2026 regional standards. It covers Bathroom Renovations, Kitchen Renovations, Room Additions, Porticos, Garage Conversions, and Attic Conversions.',
      },
      {
        heading: 'How to Build an Estimate',
        body: null,
        steps: [
          'Navigate to Remodel Budget from the sidebar.',
          'Select the project type and fill in the scope parameters (dimensions, fixture counts, finish tier, etc.).',
          'The calculator populates a Work Breakdown Structure (WBS) with line items across all trade divisions.',
          'Adjust any line item by entering a manual override — overridden rows are highlighted for easy identification.',
          'The totals block automatically computes Direct Costs, 18% Overhead, 12% Profit, 5% Contingency, and Grand Total.',
          'Click "Export Contract" in the header to generate a print-ready PDF with signature blocks.',
        ],
      },
      {
        heading: 'Export to Contract PDF',
        body: 'The Export Contract feature opens a formatted, print-ready document in a new tab. It includes the Orozco Homes brand header, project parameters, all WBS line items with unit costs, the full cost summary, and a client authorization signature block. Use your browser\'s Print dialog (Ctrl+P / Cmd+P) to save as PDF and share with the client.',
      },
      {
        heading: 'Resetting Overrides',
        body: 'If you have manually adjusted any line items and want to return to the system-calculated values, click "Reset all overrides" in the header. This restores every row to its formula-driven default instantly.',
      },
    ],
  },
  {
    id: 'messages',
    title: 'Live Messages & Photo Log',
    roles: ['Admin', 'Client'],
    roleColors: [
      { label: 'Admin',  bg: '#D4AF37', color: '#002147' },
      { label: 'Client', bg: '#1B4F6B', color: '#fff' },
    ],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    content: [
      {
        heading: 'Message Center',
        body: 'The Message Center is a real-time project chat between the client and the Orozco Homes team. Every message is timestamped and attributed to the sender. A red badge on the Messages link in the sidebar shows the count of unread messages since your last visit.',
      },
      {
        heading: 'Sending Messages',
        body: null,
        steps: [
          'Navigate to Messages from the sidebar.',
          'Type your message in the input field at the bottom of the screen.',
          'Press Enter or tap Send. Your message appears immediately.',
          'The other party receives your message in real time — no page refresh needed.',
        ],
      },
      {
        heading: 'Photo Log',
        body: 'The Photo Log is a visual timeline of your project\'s construction progress. The admin uploads site photos organized by date and phase. Clients can browse the full archive to follow along as work progresses on their home.',
        list: [
          { term: 'Viewing Photos', desc: 'Scroll through the chronological photo feed. Tap any photo to expand it to full screen.' },
          { term: 'Admin Uploads',  desc: 'Admins can upload new photos directly from the Photo Log page. Supported formats: JPG, PNG, HEIC.' },
        ],
      },
      {
        heading: 'Weekly Updates',
        body: 'Admins publish structured weekly progress reports from the Weekly Updates section. Each update includes a date, summary narrative, percentage complete, and next-step milestones. Clients see these updates in their Client Portal as a project status timeline.',
      },
    ],
  },
  {
    id: 'pin',
    title: 'Secure PIN Access',
    roles: ['Admin', 'Client'],
    roleColors: [
      { label: 'Admin',  bg: '#D4AF37', color: '#002147' },
      { label: 'Client', bg: '#1B4F6B', color: '#fff' },
    ],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    content: [
      {
        heading: 'How PIN Access Works',
        body: 'Each project is assigned a unique 4-digit PIN at creation. Clients can enter this PIN on the login screen to access their project portal instantly — no email or password required. The PIN portal loads only the data for that specific project.',
      },
      {
        heading: 'For Admins — Managing PINs',
        body: null,
        steps: [
          'PINs are auto-generated when you create a new project under Create New Project.',
          'The PIN is displayed on the success screen immediately after creation — copy it to your clipboard with one click.',
          'You can also find all PINs on the Manage Clients page, listed next to each project under each client.',
          'Click the eye icon next to a PIN to reveal it. Click again to hide.',
          'Share the PIN with your client via text or email so they can log in immediately.',
        ],
      },
      {
        heading: 'For Clients — Using Your PIN',
        body: null,
        steps: [
          'Go to the Orozco Homes app URL provided by your project manager.',
          'On the login screen, select "Enter with Project PIN."',
          'Type in your 4-digit PIN.',
          'Your private project portal loads — only your project is visible.',
          'To exit the PIN session, tap "Exit" or close the browser tab.',
        ],
      },
      {
        heading: 'Security Notes',
        body: null,
        list: [
          { term: 'Private by Default', desc: 'Each PIN is unique and tied to a single project. Entering a PIN cannot expose any other client\'s data.' },
          { term: 'No Account Needed',  desc: 'PIN access requires no email registration — it is designed for quick, easy client access during the build.' },
          { term: 'Full Account Login', desc: 'Clients can also create a full account with email and password. This provides the same access as a PIN, plus the ability to change preferences.' },
        ],
      },
    ],
  },
];

function ContentBlock({ block }) {
  if (block.steps) {
    return (
      <div className="mb-4">
        {block.heading && (
          <p className="text-sm font-bold mb-2" style={{ color: '#002147' }}>{block.heading}</p>
        )}
        <ol className="space-y-2">
          {block.steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                style={{ backgroundColor: '#002147', color: '#D4AF37' }}
              >
                {i + 1}
              </span>
              <span className="text-sm" style={{ color: '#374151' }}>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (block.list) {
    return (
      <div className="mb-4">
        {block.heading && (
          <p className="text-sm font-bold mb-2" style={{ color: '#002147' }}>{block.heading}</p>
        )}
        <div className="space-y-2">
          {block.list.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span
                className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: '#D4AF37' }}
              />
              <span className="text-sm" style={{ color: '#374151' }}>
                <span className="font-semibold" style={{ color: '#002147' }}>{item.term}: </span>
                {item.desc}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      {block.heading && (
        <p className="text-sm font-bold mb-1" style={{ color: '#002147' }}>{block.heading}</p>
      )}
      {block.body && (
        <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>{block.body}</p>
      )}
    </div>
  );
}

function AccordionSection({ section, isOpen, onToggle }) {
  return (
    <div
      className="rounded-2xl overflow-hidden transition-shadow duration-200"
      style={{
        border: isOpen ? '1.5px solid #D4AF37' : '1.5px solid #E8E6E1',
        backgroundColor: '#fff',
        boxShadow: isOpen ? '0 4px 20px rgba(212,175,55,0.12)' : '0 1px 4px rgba(0,33,71,0.04)',
      }}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left focus:outline-none"
        style={{ minHeight: '64px' }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            backgroundColor: isOpen ? 'rgba(212,175,55,0.15)' : 'rgba(0,33,71,0.06)',
            color: isOpen ? '#D4AF37' : '#6B7280',
          }}
        >
          {section.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <p className="text-sm font-bold" style={{ color: '#002147' }}>{section.title}</p>
            <div className="flex items-center gap-1.5">
              {section.roleColors.map((r) => (
                <span
                  key={r.label}
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: r.bg, color: r.color, fontSize: '0.6rem' }}
                >
                  {r.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div
          className="shrink-0 transition-transform duration-200"
          style={{
            color: isOpen ? '#D4AF37' : '#9CA3AF',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* Body */}
      {isOpen && (
        <div
          className="px-5 pb-5 pt-1"
          style={{ borderTop: '1px solid #F3F2EF' }}
        >
          <div className="space-y-1 mt-3">
            {section.content.map((block, i) => (
              <ContentBlock key={i} block={block} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReadMe() {
  const [openSections, setOpenSections] = useState(new Set(['welcome']));

  function toggleSection(id) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setOpenSections(new Set(SECTIONS.map((s) => s.id)));
  }

  function collapseAll() {
    setOpenSections(new Set());
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-bold tracking-[0.18em] uppercase mb-1" style={{ color: '#D4AF37' }}>
          Documentation
        </p>
        <h2 className="text-2xl font-bold mb-1" style={{ color: '#002147' }}>User Guide</h2>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          Everything you need to know about your Orozco Homes project portal.
        </p>
      </div>

      {/* Quick-expand controls */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={expandAll}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors duration-150 focus:outline-none"
          style={{ backgroundColor: 'rgba(0,33,71,0.07)', color: '#002147' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,33,71,0.13)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,33,71,0.07)'; }}
        >
          Expand all
        </button>
        <button
          onClick={collapseAll}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors duration-150 focus:outline-none"
          style={{ backgroundColor: 'rgba(0,33,71,0.07)', color: '#002147' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,33,71,0.13)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,33,71,0.07)'; }}
        >
          Collapse all
        </button>
        <span className="text-xs ml-auto" style={{ color: '#9CA3AF' }}>
          {openSections.size} of {SECTIONS.length} open
        </span>
      </div>

      {/* Accordion */}
      <div className="space-y-3">
        {SECTIONS.map((section) => (
          <AccordionSection
            key={section.id}
            section={section}
            isOpen={openSections.has(section.id)}
            onToggle={() => toggleSection(section.id)}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-10 text-center">
        <p className="text-xs" style={{ color: '#9CA3AF' }}>
          Orozco Homes · Virginia Beach, VA · 2026
        </p>
      </div>
    </div>
  );
}
