import { create } from 'zustand';
import { createPrimitive } from './defaults';
import type { ModelObject, PrimitiveType, ProjectDocument } from './types';

interface EditorState {
  projectName: string;
  objects: ModelObject[];
  selectedId: string | null;
  theme: 'dark' | 'light';
  addPrimitive: (type: PrimitiveType) => void;
  selectObject: (id: string | null) => void;
  updateObject: (id: string, patch: Partial<ModelObject>) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  toggleTheme: () => void;
  loadProject: (project: ProjectDocument) => void;
  getProject: () => ProjectDocument;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  projectName: 'Безымянный проект',
  objects: [],
  selectedId: null,
  theme: 'dark',
  addPrimitive: (type) => set((state) => {
    const object = createPrimitive(type, state.objects.length);
    return { objects: [...state.objects, object], selectedId: object.id };
  }),
  selectObject: (id) => set({ selectedId: id }),
  updateObject: (id, patch) => set((state) => ({
    objects: state.objects.map((object) => object.id === id ? { ...object, ...patch } : object),
  })),
  deleteSelected: () => set((state) => ({
    objects: state.objects.filter((object) => object.id !== state.selectedId),
    selectedId: null,
  })),
  duplicateSelected: () => set((state) => {
    const source = state.objects.find((object) => object.id === state.selectedId);
    if (!source) return state;
    const copy: ModelObject = {
      ...source,
      id: crypto.randomUUID(),
      name: `${source.name} — копия`,
      position: [source.position[0] + 10, source.position[1], source.position[2] + 10],
    };
    return { objects: [...state.objects, copy], selectedId: copy.id };
  }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
  loadProject: (project) => set({
    projectName: project.name,
    objects: project.objects,
    selectedId: project.objects[0]?.id ?? null,
  }),
  getProject: () => {
    const state = get();
    return {
      schemaVersion: 1,
      name: state.projectName,
      units: 'mm',
      objects: state.objects,
      updatedAt: new Date().toISOString(),
    };
  },
}));