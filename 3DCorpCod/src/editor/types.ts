export type PrimitiveType =
  | 'box'
  | 'sphere'
  | 'cylinder'
  | 'cone'
  | 'torus'
  | 'capsule'
  | 'pyramid'
  | 'prism'
  | 'text';

export type EdgeTreatment = 'none' | 'round' | 'chamfer';

export interface ModelObject {
  id: string;
  name: string;
  type: PrimitiveType;
  position: [number, number, number];
  rotation: [number, number, number];
  dimensions: [number, number, number];
  visible: boolean;
  /** Display color for viewport and preview; STL remains monochrome. */
  color?: string;
  /** Text-only settings used by extruded text objects. */
  textContent?: string;
  fontSize?: number;
  textDepth?: number;
  textBevel?: boolean;
  textBevelSize?: number;
  /** Locked objects remain selectable but cannot be edited or deleted. */
  locked?: boolean;
  /** Hole objects are boolean cutters and are not exported as visible solids. */
  hole?: boolean;
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
