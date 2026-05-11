import { MOCK_USERS, useAuth } from '../context/AuthContext';

function Avatar({ user, size = 'lg' }) {
  const dim = size === 'lg' ? '48px' : '36px';
  const font = size === 'lg' ? '1rem' : '0.75rem';
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
      style={{ width: dim, height: dim, backgroundColor: user.color, fontSize: font }}
    >
      {user.initials}
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();

  const admin   = MOCK_USERS.filter((u) => u.role === 'admin');
  const clients = MOCK_USERS.filter((u) => u.role === 'client');

  return (
    <div className="min-h-full flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="text-center mb-10">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
            style={{ backgroundColor: '#D4AF37' }}
          >
            <span className="font-extrabold text-lg" style={{ color: '#002147' }}>OH</span>
          </div>
          <h2 className="text-2xl font-bold mb-1" style={{ color: '#002147' }}>
            Weekly Updates Portal
          </h2>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            Sign in to view your project updates
          </p>

          {/* Demo mode badge */}
          <div
            className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ backgroundColor: '#FFFBEB', color: '#92400E', border: '1px solid #FCD34D' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Demo Mode — Click any profile to sign in instantly
          </div>
        </div>

        {/* Admin card */}
        <div className="mb-4">
          <p className="text-xs font-bold tracking-[0.14em] uppercase mb-2 px-1" style={{ color: '#9CA3AF' }}>
            Contractor Account
          </p>
          {admin.map((user) => (
            <button
              key={user.id}
              onClick={() => login(user.id)}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all duration-150 focus:outline-none group"
              style={{
                backgroundColor: '#002147',
                border: '1.5px solid #002147',
                boxShadow: '0 4px 16px rgba(0,33,71,0.2)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,33,71,0.3)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,33,71,0.2)'; e.currentTarget.style.transform = 'none'; }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center font-bold shrink-0"
                style={{ backgroundColor: '#D4AF37', color: '#002147', fontSize: '1rem' }}
              >
                {user.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-bold text-white">{user.name}</p>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ backgroundColor: '#D4AF37', color: '#002147' }}
                  >
                    Admin — Full Access
                  </span>
                </div>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>{user.email}</p>
              </div>
              <svg
                width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>

        {/* Client cards */}
        <div>
          <p className="text-xs font-bold tracking-[0.14em] uppercase mb-2 px-1" style={{ color: '#9CA3AF' }}>
            Client Accounts
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {clients.map((user) => (
              <button
                key={user.id}
                onClick={() => login(user.id)}
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all duration-150 focus:outline-none group"
                style={{
                  backgroundColor: '#fff',
                  border: '1.5px solid #E8E6E1',
                  boxShadow: '0 2px 8px rgba(0,33,71,0.06)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = user.color;
                  e.currentTarget.style.boxShadow = `0 8px 24px ${user.color}25`;
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E8E6E1';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,33,71,0.06)';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0"
                  style={{ backgroundColor: user.color, fontSize: '0.8rem' }}
                >
                  {user.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: '#002147' }}>{user.name}</p>
                  <p className="text-xs truncate" style={{ color: '#9CA3AF' }}>{user.project}</p>
                </div>
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke={user.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                  className="shrink-0 opacity-40 group-hover:opacity-100 transition-opacity"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-center mt-8" style={{ color: '#D1D5DB' }}>
          Orozco Homes · Secure Client Portal · All data is simulated for demonstration
        </p>
      </div>
    </div>
  );
}
