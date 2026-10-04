import { createContext, useContext, useReducer } from 'react';

const ProjectContext = createContext(null);

const initialState = {
  activeDbProject: null,  // real Supabase projects row
  activePage:      'home',
  contractDraft:   null,  // client-safe values handed from Remodel Budget to Contracts
  proposalDraft:   null,  // client-safe values handed from Remodel Budget to Proposals
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_DB_PROJECT':
      return {
        ...state,
        activeDbProject: action.project,
        activePage: action.project ? 'client-portal' : 'home',
      };
    case 'SET_PAGE':
      return { ...state, activePage: action.page };
    case 'OPEN_CONTRACT_DRAFT':
      return { ...state, contractDraft: action.draft, activePage: 'contracts' };
    case 'CLEAR_CONTRACT_DRAFT':
      return { ...state, contractDraft: null };
    case 'OPEN_PROPOSAL_DRAFT':
      return { ...state, proposalDraft: action.draft, activePage: 'proposals' };
    case 'CLEAR_PROPOSAL_DRAFT':
      return { ...state, proposalDraft: null };
    case 'CLEAR_DB_PROJECT':
      return { ...state, activeDbProject: null };
    default:
      return state;
  }
}

export function ProjectProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <ProjectContext.Provider value={{ state, dispatch }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  return useContext(ProjectContext);
}
