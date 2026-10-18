import {
  BoxGeometry,
  CapsuleGeometry,
  CylinderGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type BufferGeometry,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
import type { ModelObject } from '../editor/types';

const positive = (value: number) => Math.max(0.1, Number.isFinite(value) ? value : 0.1);

/**
 * Shared geometry for the viewport and STL export.
 * Chamfer and round treatments are supported on boxes; other primitives keep native edges.
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
      // Three points are created near each original corner. Their convex hull
      // produces planar chamfers along all 12 edges and clips the 8 corners.
      const hx = width / 2;
      const hy = height / 2;
      const hz = depth / 2;
      const points: Vector3[] = [];
      for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
          for (const sz of [-1, 1]) {
            points.push(
              new Vector3(sx * (hx - edgeSize), sy * hy, sz * hz),
              new Vector3(sx * hx, sy * (hy - edgeSize), sz * hz),
              new Vector3(sx * hx, sy * hy, sz * (hz - edgeSize)),
            );
          }
        }
      }
      const geometry = new ConvexGeometry(points);
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
