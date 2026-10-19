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
