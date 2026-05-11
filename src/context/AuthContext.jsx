import { createContext, useContext, useReducer } from 'react';

export const MOCK_USERS = [
  {
    id: 'admin-001',
    name: 'Carlos Orozco',
    email: 'carlos@orozcohomes.com',
    role: 'admin',
    initials: 'CO',
    color: '#002147',
    project: null,
  },
  {
    id: 'client-sjohnson',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@email.com',
    role: 'client',
    initials: 'SJ',
    color: '#3B82F6',
    project: 'Master Bath Remodel',
  },
  {
    id: 'client-mrodriguez',
    name: 'Maria Rodriguez',
    email: 'maria.rodriguez@email.com',
    role: 'client',
    initials: 'MR',
    color: '#7C3AED',
    project: 'Full Kitchen Remodel',
  },
  {
    id: 'client-dlee',
    name: 'David Lee',
    email: 'david.lee@email.com',
    role: 'client',
    initials: 'DL',
    color: '#059669',
    project: 'Master Suite Addition',
  },
  {
    id: 'client-lnguyen',
    name: 'Linh Nguyen',
    email: 'linh.nguyen@email.com',
    role: 'client',
    initials: 'LN',
    color: '#DC2626',
    project: 'Front Entry Portico',
  },
  {
    id: 'client-rpatel',
    name: 'Raj Patel',
    email: 'raj.patel@email.com',
    role: 'client',
    initials: 'RP',
    color: '#D97706',
    project: 'Garage ADU Conversion',
  },
];

const AuthContext = createContext(null);

function reducer(state, action) {
  switch (action.type) {
    case 'LOGIN':  return { user: action.user, isAuthenticated: true };
    case 'LOGOUT': return { user: null,        isAuthenticated: false };
    default: return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { user: null, isAuthenticated: false });

  function login(userId) {
    const user = MOCK_USERS.find((u) => u.id === userId);
    if (user) dispatch({ type: 'LOGIN', user });
  }

  function logout() {
    dispatch({ type: 'LOGOUT' });
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
