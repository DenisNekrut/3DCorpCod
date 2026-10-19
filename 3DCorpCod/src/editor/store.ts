import { create } from 'zustand';
import { createPrimitive } from './defaults';
import type { ModelObject, PrimitiveType, ProjectDocument } from './types';

export type TransformMode = 'translate' | 'rotate' | 'scale';

interface EditorState {
  projectName: string;
  objects: ModelObject[];
  selectedId: string | null;
  transformMode: TransformMode;
  addPrimitive: (type: PrimitiveType) => void;
  selectObject: (id: string | null) => void;
  updateObject: (id: string, patch: Partial<ModelObject>) => void;
  setTransformMode: (mode: TransformMode) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  toggleLockSelected: () => void;
  toggleHoleSelected: () => void;
  loadProject: (project: ProjectDocument) => void;
  getProject: () => ProjectDocument;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  projectName: 'Безымянный проект',
  objects: [],
  selectedId: null,
  transformMode: 'translate',
  addPrimitive: (type) => set((state) => {
    const object = createPrimitive(type, state.objects.length);
    return { objects: [...state.objects, object], selectedId: object.id };
  }),
  selectObject: (id) => set({ selectedId: id }),
  updateObject: (id, patch) => set((state) => ({
    objects: state.objects.map((object) => {
      if (object.id !== id) return object;
      // Lock state itself may always be changed; all other changes are blocked.
      if (object.locked && Object.keys(patch).some((key) => key !== 'locked')) return object;
      return { ...object, ...patch };
    }),
  })),
  setTransformMode: (mode) => set({ transformMode: mode }),
  deleteSelected: () => set((state) => {
    const selected = state.objects.find((object) => object.id === state.selectedId);
    if (!selected || selected.locked) return state;
    return { objects: state.objects.filter((object) => object.id !== state.selectedId), selectedId: null };
  }),
  duplicateSelected: () => set((state) => {
    const source = state.objects.find((object) => object.id === state.selectedId);
    if (!source || source.locked) return state;
    const copy: ModelObject = {
      ...source,
      id: crypto.randomUUID(),
      name: `${source.name} — копия`,
      locked: false,
      position: [source.position[0] + 10, source.position[1], source.position[2] + 10],
    };
    return { objects: [...state.objects, copy], selectedId: copy.id };
  }),
  toggleLockSelected: () => set((state) => ({
    objects: state.objects.map((object) => object.id === state.selectedId ? { ...object, locked: !object.locked } : object),
  })),
  toggleHoleSelected: () => set((state) => {
    const selected = state.objects.find((object) => object.id === state.selectedId);
    if (!selected || selected.locked) return state;
    return { objects: state.objects.map((object) => object.id === selected.id ? { ...object, hole: !object.hole } : object) };
  }),
  loadProject: (project) => set({
    projectName: project.name,
    objects: project.objects.map((object) => ({
      ...object,
      position: [...object.position] as [number, number, number],
      rotation: [...object.rotation] as [number, number, number],
      dimensions: [...object.dimensions] as [number, number, number],
      locked: object.locked ?? false,
      hole: object.hole ?? false,
    })),
    selectedId: project.objects[0]?.id ?? null,
    transformMode: 'translate',
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
