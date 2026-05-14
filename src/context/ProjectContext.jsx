import { createContext, useContext, useReducer } from 'react';

const ProjectContext = createContext(null);

const initialState = {
  activeProject: null,    // PROJECT_TYPE (material catalog browsing)
  activeDbProject: null,  // real Supabase projects row
  activePage: 'home',
  selections: {},
  dimensions: { floor_sqft: '', wall_sqft: '', linear_feet: '' },
  wasteFactor: 15,        // percentage, 0–100
  isLocked: false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_PROJECT':
      return {
        ...state,
        activeProject: action.project,
        activePage: action.project ? 'project' : 'home',
      };
    case 'SET_DB_PROJECT':
      return {
        ...state,
        activeDbProject: action.project,
        activePage: action.project ? 'client-portal' : 'home',
      };
    case 'SET_PAGE':
      return { ...state, activePage: action.page };
    case 'SET_MATERIAL_STATUS': {
      if (state.isLocked) return state;
      const { materialId, status } = action;
      const current = state.selections[materialId];
      if (current?.status === status) {
        const next = { ...state.selections };
        delete next[materialId];
        return { ...state, selections: next };
      }
      return {
        ...state,
        selections: {
          ...state.selections,
          [materialId]: { status, price: action.price, name: action.name, category: action.category },
        },
      };
    }
    case 'CLEAR_DB_PROJECT':
      return { ...state, activeDbProject: null };
    case 'CLEAR_SELECTIONS':
      return { ...state, selections: {}, isLocked: false };
    case 'SET_DIMENSIONS':
      return { ...state, dimensions: { ...state.dimensions, ...action.dimensions } };
    case 'SET_WASTE_FACTOR':
      return { ...state, wasteFactor: Math.min(100, Math.max(0, Number(action.value) || 0)) };
    case 'LOCK_ESTIMATE':
      return { ...state, isLocked: true };
    case 'UNLOCK_ESTIMATE':
      return { ...state, isLocked: false };
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
