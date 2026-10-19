import { create } from 'zustand';
import { createPrimitive } from './defaults';
import type { ModelObject, PrimitiveType, ProjectDocument } from './types';

export type TransformMode = 'translate' | 'rotate' | 'scale';
type Axis = 0 | 1 | 2;
type Snapshot = { objects: ModelObject[]; projectName: string };
const cloneObjects = (objects: ModelObject[]) => objects.map((object) => ({
  ...object,
  position: [...object.position] as [number, number, number],
  rotation: [...object.rotation] as [number, number, number],
  dimensions: [...object.dimensions] as [number, number, number],
  mirror: object.mirror ? [...object.mirror] as [boolean, boolean, boolean] : [false, false, false] as [boolean, boolean, boolean],
}));
const snapshot = (state: Pick<EditorState, 'objects' | 'projectName'>): Snapshot => ({
  objects: cloneObjects(state.objects),
  projectName: state.projectName,
});
const record = (state: EditorState) => ({
  undoStack: [...state.undoStack, snapshot(state)].slice(-60),
  redoStack: [],
});

interface EditorState {
  projectName: string;
  objects: ModelObject[];
  selectedId: string | null;
  selectedIds: string[];
  transformMode: TransformMode;
  gridSnap: boolean;
  undoStack: Snapshot[];
  redoStack: Snapshot[];
  lastHistoryAt?: number;
  addPrimitive: (type: PrimitiveType) => void;
  addObjectFromPreset: (preset: ModelObject) => void;
  selectObject: (id: string | null) => void;
  toggleSelectObject: (id: string) => void;
  updateObject: (id: string, patch: Partial<ModelObject>) => void;
  setTransformMode: (mode: TransformMode) => void;
  toggleGridSnap: () => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  toggleLockSelected: () => void;
  toggleHoleSelected: () => void;
  undo: () => void;
  redo: () => void;
  alignSelected: (axis: Axis, alignment: 'min' | 'center' | 'max') => void;
  mirrorSelected: (axis: Axis) => void;
  groupSelected: () => void;
  ungroupSelected: () => void;
  booleanSelected: (operation: 'union' | 'subtract' | 'intersect') => void;
  loadProject: (project: ProjectDocument) => void;
  getProject: () => ProjectDocument;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  projectName: 'Безымянный проект',
  objects: [],
  selectedId: null,
  selectedIds: [],
  transformMode: 'translate',
  gridSnap: false,
  undoStack: [],
  redoStack: [],
  addPrimitive: (type) => set((state) => {
    const object = createPrimitive(type, state.objects.length);
    return { ...record(state), objects: [...state.objects, object], selectedId: object.id, selectedIds: [object.id] };
  }),
  addObjectFromPreset: (preset) => set((state) => {
    const object: ModelObject = {
      ...preset, id: crypto.randomUUID(), name: preset.name || 'Пользовательская фигура',
      position: [preset.position[0], Math.max(preset.dimensions[1] / 2, 0), preset.position[2]],
      rotation: [...preset.rotation], dimensions: [...preset.dimensions],
      mirror: preset.mirror ? [...preset.mirror] as [boolean, boolean, boolean] : [false, false, false],
      locked: false, booleanSource: false, groupId: undefined,
    };
    return { ...record(state), objects: [...state.objects, object], selectedId: object.id, selectedIds: [object.id] };
  }),
  selectObject: (id) => set({ selectedId: id, selectedIds: id ? [id] : [] }),
  toggleSelectObject: (id) => set((state) => {
    const selectedIds = state.selectedIds.includes(id)
      ? state.selectedIds.filter((item) => item !== id)
      : [...state.selectedIds, id];
    return { selectedIds, selectedId: selectedIds[selectedIds.length - 1] ?? null };
  }),
  updateObject: (id, patch) => set((state) => {
    const target = state.objects.find((object) => object.id === id);
    if (!target || (target.locked && !(Object.keys(patch).length === 1 && 'locked' in patch))) return state;
    const nextObjects = state.objects.map((object) => object.id === id ? { ...object, ...patch } : object);
    // Coalesce rapid gizmo updates into a single undo step while preserving normal edits.
    const now = Date.now();
    const coalesce = now - (state.lastHistoryAt ?? 0) < 350;
    return {
      ...(coalesce ? {} : record(state)),
      objects: nextObjects,
      lastHistoryAt: now,
    };
  }),
  setTransformMode: (mode) => set({ transformMode: mode }),
  toggleGridSnap: () => set((state) => ({ gridSnap: !state.gridSnap })),
  deleteSelected: () => set((state) => {
    const ids = new Set(state.selectedIds.length ? state.selectedIds : state.selectedId ? [state.selectedId] : []);
    if (!ids.size || !state.objects.some((object) => ids.has(object.id) && !object.locked)) return state;
    const deletable = new Set(state.objects.filter((object) => ids.has(object.id) && !object.locked).map((object) => object.id));
    const objects = state.objects.filter((object) => !deletable.has(object.id));
    return { ...record(state), objects, selectedId: null, selectedIds: [] };
  }),
  duplicateSelected: () => set((state) => {
    const ids = new Set(state.selectedIds.length ? state.selectedIds : state.selectedId ? [state.selectedId] : []);
    const sources = state.objects.filter((object) => ids.has(object.id) && !object.locked);
    if (!sources.length) return state;
    const copies = sources.map((source) => ({
      ...source,
      id: crypto.randomUUID(),
      name: `${source.name} — копия`,
      locked: false,
      position: [source.position[0] + 10, source.position[1], source.position[2] + 10] as [number, number, number],
    }));
    return { ...record(state), objects: [...state.objects, ...copies], selectedId: copies[copies.length - 1].id, selectedIds: copies.map((item) => item.id) };
  }),
  toggleLockSelected: () => set((state) => {
    const ids = new Set(state.selectedIds.length ? state.selectedIds : state.selectedId ? [state.selectedId] : []);
    if (!ids.size) return state;
    return { ...record(state), objects: state.objects.map((object) => ids.has(object.id) ? { ...object, locked: !object.locked } : object) };
  }),
  toggleHoleSelected: () => set((state) => {
    const ids = new Set(state.selectedIds.length ? state.selectedIds : state.selectedId ? [state.selectedId] : []);
    if (!ids.size) return state;
    const first = state.objects.find((object) => ids.has(object.id));
    if (!first || first.locked) return state;
    return { ...record(state), objects: state.objects.map((object) => ids.has(object.id) && !object.locked ? { ...object, hole: !first.hole } : object) };
  }),
  undo: () => set((state) => {
    const previous = state.undoStack[state.undoStack.length - 1];
    if (!previous) return state;
    return {
      objects: cloneObjects(previous.objects), projectName: previous.projectName,
      undoStack: state.undoStack.slice(0, -1), redoStack: [...state.redoStack, snapshot(state)],
      selectedId: null, selectedIds: [], lastHistoryAt: 0,
    };
  }),
  redo: () => set((state) => {
    const next = state.redoStack[state.redoStack.length - 1];
    if (!next) return state;
    return {
      objects: cloneObjects(next.objects), projectName: next.projectName,
      redoStack: state.redoStack.slice(0, -1), undoStack: [...state.undoStack, snapshot(state)].slice(-60),
      selectedId: null, selectedIds: [], lastHistoryAt: 0,
    };
  }),
  alignSelected: (axis, alignment) => set((state) => {
    const ids = new Set(state.selectedIds.length ? state.selectedIds : state.selectedId ? [state.selectedId] : []);
    const selected = state.objects.filter((object) => ids.has(object.id) && !object.locked);
    if (selected.length < 2) return state;
    const bounds = selected.map((object) => ({ object, min: object.position[axis] - object.dimensions[axis] / 2, max: object.position[axis] + object.dimensions[axis] / 2 }));
    const target = alignment === 'min' ? Math.min(...bounds.map((item) => item.min)) : alignment === 'max' ? Math.max(...bounds.map((item) => item.max)) : (Math.min(...bounds.map((item) => item.min)) + Math.max(...bounds.map((item) => item.max))) / 2;
    return { ...record(state), objects: state.objects.map((object) => {
      const item = bounds.find((entry) => entry.object.id === object.id);
      if (!item) return object;
      const position = [...object.position] as [number, number, number];
      position[axis] = target + (alignment === 'min' ? object.dimensions[axis] / 2 : alignment === 'max' ? -object.dimensions[axis] / 2 : 0);
      return { ...object, position };
    }) };
  }),
  mirrorSelected: (axis) => set((state) => {
    const ids = new Set(state.selectedIds.length ? state.selectedIds : state.selectedId ? [state.selectedId] : []);
    const selected = state.objects.filter((object) => ids.has(object.id) && !object.locked);
    if (!selected.length) return state;
    const center = selected.reduce((sum, object) => sum + object.position[axis], 0) / selected.length;
    return { ...record(state), objects: state.objects.map((object) => {
      if (!ids.has(object.id) || object.locked) return object;
      const position = [...object.position] as [number, number, number];
      position[axis] = Math.round((2 * center - position[axis]) * 10) / 10;
      const mirror = [...(object.mirror ?? [false, false, false])] as [boolean, boolean, boolean];
      mirror[axis] = !mirror[axis];
      return { ...object, position, mirror };
    }) };
  }),
  groupSelected: () => set((state) => {
    const ids = new Set(state.selectedIds.length ? state.selectedIds : state.selectedId ? [state.selectedId] : []);
    if (ids.size < 2) return state;
    const groupId = crypto.randomUUID();
    return { ...record(state), objects: state.objects.map((object) => ids.has(object.id) && !object.locked ? { ...object, groupId } : object) };
  }),
  booleanSelected: (operation) => set((state) => {
    const ids = new Set(state.selectedIds.length ? state.selectedIds : state.selectedId ? [state.selectedId] : []);
    const selected = state.objects.filter((object) => ids.has(object.id) && !object.locked && !object.hole);
    if (selected.length < 2) return state;
    const resultId = state.selectedId && ids.has(state.selectedId) ? state.selectedId : selected[0].id;
    const groupId = crypto.randomUUID();
    return {
      ...record(state),
      objects: state.objects.map((object) => {
        if (!ids.has(object.id)) return object;
        if (object.id === resultId) return { ...object, groupId, booleanOperation: operation, booleanSource: false };
        return { ...object, groupId, booleanSource: true, booleanOperation: undefined };
      }),
      selectedId: resultId,
      selectedIds: [resultId],
    };
  }),
  ungroupSelected: () => set((state) => {
    const ids = new Set(state.selectedIds.length ? state.selectedIds : state.selectedId ? [state.selectedId] : []);
    if (!state.objects.some((object) => ids.has(object.id) && object.groupId)) return state;
    return { ...record(state), objects: state.objects.map((object) => ids.has(object.id) ? { ...object, groupId: undefined } : object) };
  }),
  loadProject: (project) => set({
    projectName: project.name,
    objects: cloneObjects(project.objects.map((object) => ({
      ...object,
      locked: object.locked ?? false,
      hole: object.hole ?? false,
      color: object.color ?? '#8295b2',
      layer: object.layer ?? 'Основной',
      mirror: object.mirror ?? [false, false, false],
      ...(object.type === 'text' ? { textContent: object.textContent ?? 'Текст', fontSize: object.fontSize ?? 10, textDepth: object.textDepth ?? object.dimensions[2], textBevel: object.textBevel ?? false, textBevelSize: object.textBevelSize ?? 0.3 } : {}),
    }))),
    selectedId: project.objects[0]?.id ?? null,
    selectedIds: project.objects[0]?.id ? [project.objects[0].id] : [],
    transformMode: 'translate', undoStack: [], redoStack: [], lastHistoryAt: 0,
  }),
  getProject: () => {
    const state = get();
    return { schemaVersion: 1, name: state.projectName, units: 'mm', objects: state.objects, updatedAt: new Date().toISOString() };
  },
}));
