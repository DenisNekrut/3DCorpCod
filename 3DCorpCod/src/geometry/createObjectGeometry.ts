import {
  BoxGeometry,
  BufferGeometry,
  CapsuleGeometry,
  CylinderGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  Float32BufferAttribute,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import droidSansFont from 'three/examples/fonts/droid/droid_sans_regular.typeface.json';
import type { ModelObject } from '../editor/types';

const positive = (value: number) => Math.max(0.1, Number.isFinite(value) ? value : 0.1);
const textFont = new FontLoader().parse(droidSansFont);

function createExtrudedText(object: ModelObject, width: number, height: number, depth: number): BufferGeometry {
  const size = positive(object.fontSize ?? height);
  const textDepth = positive(object.textDepth ?? depth);
  const bevelSize = Math.max(0, Math.min(object.textBevelSize ?? 0.3, textDepth * 0.4, size * 0.1));
  const geometry = new TextGeometry((object.textContent ?? 'Текст').slice(0, 120), {
    font: textFont,
    size,
    depth: textDepth,
    curveSegments: 8,
    bevelEnabled: Boolean(object.textBevel),
    bevelThickness: object.textBevel ? Math.min(bevelSize, textDepth * 0.35) : 0,
    bevelSize: object.textBevel ? bevelSize : 0,
    bevelSegments: 2,
  });
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (!bounds) return geometry;
  const rawWidth = Math.max(0.001, bounds.max.x - bounds.min.x);
  const rawHeight = Math.max(0.001, bounds.max.y - bounds.min.y);
  const rawDepth = Math.max(0.001, bounds.max.z - bounds.min.z);
  geometry.scale(width / rawWidth, height / rawHeight, depth / rawDepth);
  geometry.computeBoundingBox();
  geometry.translate(
    -(geometry.boundingBox!.min.x + geometry.boundingBox!.max.x) / 2,
    -(geometry.boundingBox!.min.y + geometry.boundingBox!.max.y) / 2,
    -(geometry.boundingBox!.min.z + geometry.boundingBox!.max.z) / 2,
  );
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Shared geometry for the viewport and STL export.
 * Chamfer and round treatments are supported on boxes; text is real extruded geometry.
 */
function createRawObjectGeometry(object: ModelObject): BufferGeometry {
  const [rawWidth, rawHeight, rawDepth] = object.dimensions;
  const width = positive(rawWidth);
  const height = positive(rawHeight);
  const depth = positive(rawDepth);

  if (object.type === 'text') return createExtrudedText(object, width, height, depth);

  if (object.type === 'mesh') {
    const positions = object.customGeometry?.positions;
    if (!positions || positions.length < 9 || positions.length % 3 !== 0) {
      throw new Error('Imported mesh has no valid triangle geometry');
    }
    const geometry = new BufferGeometry();
    const scaled = positions.map((value, index) => value * [width, height, depth][index % 3]);
    geometry.setAttribute('position', new Float32BufferAttribute(scaled, 3));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  }

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
      geometry.scale(width * (4 / 3), height, depth * (2 / Math.sqrt(3)));
      return geometry;
    }
    default: {
      const exhaustive: never = object.type;
      throw new Error(`Unsupported primitive: ${exhaustive}`);
    }
  }
}


/** Applies optional axis reflection after creating the source solid. */
export function createObjectGeometry(object: ModelObject): BufferGeometry {
  const geometry = createRawObjectGeometry(object);
  const mirror = object.mirror ?? [false, false, false];
  if (!mirror.some(Boolean)) return geometry;
  const signs: [number, number, number] = [mirror[0] ? -1 : 1, mirror[1] ? -1 : 1, mirror[2] ? -1 : 1];
  geometry.scale(...signs);
  // An odd number of reflections reverses triangle winding; flip it back so normals
  // remain outward-facing for the viewport and mesh exporters.
  if (mirror.filter(Boolean).length % 2 === 1) {
    if (!geometry.getIndex()) {
      const indices = Array.from({ length: geometry.getAttribute('position').count }, (_, index) => index);
      for (let i = 0; i + 2 < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
      geometry.setIndex(indices);
    } else {
      const index = geometry.getIndex()!;
      const values = Array.from({ length: index.count }, (_, i) => index.getX(i));
      for (let i = 0; i + 2 < values.length; i += 3) [values[i + 1], values[i + 2]] = [values[i + 2], values[i + 1]];
      geometry.setIndex(values);
    }
    geometry.computeVertexNormals();
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
