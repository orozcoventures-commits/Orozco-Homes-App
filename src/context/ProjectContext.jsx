import { createContext, useContext, useReducer } from 'react';

const ProjectContext = createContext(null);

const initialState = {
  activeProject: null,
  selections: {},
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_PROJECT':
      return { ...state, activeProject: action.project };
    case 'SET_MATERIAL_STATUS': {
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
    case 'CLEAR_SELECTIONS':
      return { ...state, selections: {} };
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
