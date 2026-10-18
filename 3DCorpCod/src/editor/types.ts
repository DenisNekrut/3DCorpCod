export type PrimitiveType = 'box' | 'sphere' | 'cylinder' | 'cone';

export interface ModelObject {
  id: string;
  name: string;
  type: PrimitiveType;
  position: [number, number, number];
  rotation: [number, number, number];
  dimensions: [number, number, number];
  visible: boolean;
}

export interface ProjectDocument {
  schemaVersion: 1;
  name: string;
  units: 'mm';
  objects: ModelObject[];
  updatedAt: string;
}