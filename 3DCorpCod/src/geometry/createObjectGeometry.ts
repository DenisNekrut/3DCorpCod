import {
  BoxGeometry,
  CapsuleGeometry,
  CylinderGeometry,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
  Shape,
  ExtrudeGeometry,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { ModelObject } from '../editor/types';

const positive = (value: number) => Math.max(0.1, Number.isFinite(value) ? value : 0.1);

/**
 * Creates the same millimetre-sized geometry for both the viewport and STL export.
 * Rounded/chamfered edges are supported on boxes; other primitives keep their native edges.
 */
export function createObjectGeometry(object: ModelObject): BufferGeometry {
  const [rawWidth, rawHeight, rawDepth] = object.dimensions;
  const width = positive(rawWidth);
  const height = positive(rawHeight);
  const depth = positive(rawDepth);

  if (object.type === 'box') {
    const treatment = object.edgeTreatment ?? 'none';
    const limit = Math.max(0.05, Math.min(width, height, depth) * 0.45);
    const edgeSize = Math.min(Math.max(0, object.edgeSize ?? 1), limit);

    if (treatment === 'round' && edgeSize > 0) {
      return new RoundedBoxGeometry(
        width,
        height,
        depth,
        Math.max(1, Math.min(8, Math.round(object.edgeSegments ?? 4))),
        edgeSize,
      );
    }

    if (treatment === 'chamfer' && edgeSize > 0) {
      const insetX = Math.max(0.05, width / 2 - edgeSize);
      const insetY = Math.max(0.05, height / 2 - edgeSize);
      const innerDepth = Math.max(0.1, depth - edgeSize * 2);
      const shape = new Shape();
      shape.moveTo(-insetX, -insetY);
      shape.lineTo(insetX, -insetY);
      shape.lineTo(insetX, insetY);
      shape.lineTo(-insetX, insetY);
      shape.closePath();
      const geometry = new ExtrudeGeometry(shape, {
        depth: innerDepth,
        bevelEnabled: true,
        bevelSegments: 1,
        bevelSize: edgeSize,
        bevelThickness: edgeSize,
        curveSegments: 1,
      });
      geometry.translate(0, 0, -innerDepth / 2);
      geometry.computeVertexNormals();
      return geometry;
    }

    return new BoxGeometry(width, height, depth);
  }

  switch (object.type) {
    case 'sphere': {
      const geometry = new SphereGeometry(0.5, 40, 28);
      geometry.scale(width, height, depth);
      return geometry;
    }
    case 'cylinder': {
      const geometry = new CylinderGeometry(0.5, 0.5, 1, 48, 1);
      geometry.scale(width, height, depth);
      return geometry;
    }
    case 'cone': {
      const geometry = new CylinderGeometry(0, 0.5, 1, 48, 1);
      geometry.scale(width, height, depth);
      return geometry;
    }
    case 'torus': {
      const tube = Math.max(0.2, Math.min(height, width, depth) * 0.2);
      const diameter = Math.max(0.4, Math.min(width, depth));
      const geometry = new TorusGeometry(Math.max(0.1, diameter / 2 - tube / 2), tube / 2, 16, 48);
      geometry.scale(width / diameter, height / tube, depth / diameter);
      return geometry;
    }
    case 'capsule': {
      const diameter = Math.min(width, depth);
      const straightLength = Math.max(0.01, height / diameter - 1);
      const geometry = new CapsuleGeometry(0.5, straightLength, 8, 24);
      geometry.scale(width, height / (straightLength + 1), depth);
      return geometry;
    }
    case 'pyramid': {
      const geometry = new CylinderGeometry(0, 0.5, 1, 4, 1);
      geometry.rotateY(Math.PI / 4);
      geometry.scale(width * Math.SQRT2, height, depth * Math.SQRT2);
      return geometry;
    }
    case 'prism': {
      const geometry = new CylinderGeometry(0.5, 0.5, 1, 3, 1);
      geometry.scale(width * 1.15, height, depth * 1.15);
      return geometry;
    }
    default: {
      const exhaustive: never = object.type;
      throw new Error(`Unsupported primitive: ${exhaustive}`);
    }
  }
}
