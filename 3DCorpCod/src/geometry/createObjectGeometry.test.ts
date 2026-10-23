import { describe, expect, it } from 'vitest';
import { createObjectGeometry } from './createObjectGeometry';
import type { ModelObject } from '../editor/types';

const base: ModelObject = {
  id: 'mesh-1',
  name: 'Imported STL',
  type: 'mesh',
  position: [0, 10, 0],
  rotation: [0, 0, 0],
  dimensions: [10, 20, 30],
  customGeometry: {
    // One triangle normalized around the object's origin.
    positions: [-0.5, -0.5, 0, 0.5, -0.5, 0, 0, 0.5, 0],
  },
  visible: true,
};

describe('createObjectGeometry', () => {
  it('scales imported normalized mesh coordinates to millimetre dimensions', () => {
    const geometry = createObjectGeometry(base);
    geometry.computeBoundingBox();
    expect(geometry.boundingBox?.min.x).toBeCloseTo(-5);
    expect(geometry.boundingBox?.max.x).toBeCloseTo(5);
    expect(geometry.boundingBox?.min.y).toBeCloseTo(-10);
    expect(geometry.boundingBox?.max.y).toBeCloseTo(10);
    expect(geometry.getAttribute('position').count).toBe(3);
    geometry.dispose();
  });

  it('rejects malformed imported mesh geometry', () => {
    expect(() => createObjectGeometry({ ...base, customGeometry: { positions: [0, 1, 2] } })).toThrow();
  });
});

const box: ModelObject = {
  id: 'box-1',
  name: 'Test box',
  type: 'box',
  position: [0, 8, 0],
  rotation: [0, 0, 0],
  dimensions: [20, 16, 12],
  visible: true,
  edgeTreatment: 'none',
  edgeSize: 1.5,
  edgeSegments: 4,
};

describe('box edge treatments', () => {
  it.each(['round', 'chamfer'] as const)('creates finite geometry for %s edges', (edgeTreatment) => {
    const geometry = createObjectGeometry({ ...box, edgeTreatment });
    try {
      const positions = geometry.getAttribute('position');
      expect(positions.count).toBeGreaterThan(0);
      expect(positions.count % 3).toBe(0);
      for (let index = 0; index < positions.count; index++) {
        expect(Number.isFinite(positions.getX(index))).toBe(true);
        expect(Number.isFinite(positions.getY(index))).toBe(true);
        expect(Number.isFinite(positions.getZ(index))).toBe(true);
      }
      geometry.computeBoundingBox();
      expect(geometry.boundingBox?.min.x).toBeCloseTo(-10, 4);
      expect(geometry.boundingBox?.max.x).toBeCloseTo(10, 4);
      expect(geometry.boundingBox?.min.y).toBeCloseTo(-8, 4);
      expect(geometry.boundingBox?.max.y).toBeCloseTo(8, 4);
      expect(geometry.boundingBox?.min.z).toBeCloseTo(-6, 4);
      expect(geometry.boundingBox?.max.z).toBeCloseTo(6, 4);
    } finally {
      geometry.dispose();
    }
  });

  it('uses a plain box when edge processing is disabled', () => {
    const geometry = createObjectGeometry({ ...box, edgeTreatment: 'none' });
    try {
      expect(geometry.getAttribute('position').count).toBe(24);
      geometry.computeBoundingBox();
      expect(geometry.boundingBox?.min.x).toBeCloseTo(-10);
      expect(geometry.boundingBox?.max.x).toBeCloseTo(10);
    } finally {
      geometry.dispose();
    }
  });
});
