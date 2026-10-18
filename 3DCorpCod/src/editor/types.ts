export type PrimitiveType =
  | 'box'
  | 'sphere'
  | 'cylinder'
  | 'cone'
  | 'torus'
  | 'capsule'
  | 'pyramid'
  | 'prism';

export type EdgeTreatment = 'none' | 'round' | 'chamfer';

export interface ModelObject {
  id: string;
  name: string;
  type: PrimitiveType;
  position: [number, number, number];
  rotation: [number, number, number];
  dimensions: [number, number, number];
  visible: boolean;
  /** Edge processing is currently supported for boxes. Optional for old projects. */
  edgeTreatment?: EdgeTreatment;
  /** Edge radius/chamfer width in millimetres. */
  edgeSize?: number;
  /** Segment count used by rounded edges. */
  edgeSegments?: number;
}

export interface ProjectDocument {
  schemaVersion: 1;
  name: string;
  units: 'mm';
  objects: ModelObject[];
  updatedAt: string;
}
