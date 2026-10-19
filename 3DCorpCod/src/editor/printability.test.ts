import { describe, expect, it } from 'vitest';
import type { ModelObject } from './types';
import { inspectPrintability } from './printability';

const model = (overrides: Partial<ModelObject> = {}): ModelObject => ({
  id: 'test-object',
  name: 'Test',
  type: 'box',
  position: [0, 10, 0],
  rotation: [0, 0, 0],
  dimensions: [20, 20, 20],
  visible: true,
  ...overrides,
});

describe('inspectPrintability', () => {
  it('reports objects extending below the workplane', () => {
    const warnings = inspectPrintability([model({ position: [0, 2, 0], dimensions: [20, 10, 20] })]);
    expect(warnings.some((warning) => warning.code === 'below-workplane')).toBe(true);
  });

  it('reports small features and ignores hidden objects', () => {
    const thin = model({ dimensions: [0.4, 20, 20] });
    const hidden = model({ id: 'hidden', visible: false, dimensions: [0.1, 0.1, 0.1] });
    const warnings = inspectPrintability([thin, hidden]);
    expect(warnings.filter((warning) => warning.code === 'thin-feature')).toHaveLength(1);
    expect(warnings.some((warning) => warning.objectId === 'hidden')).toBe(false);
  });

  it('warns when a hole cutter does not overlap a solid', () => {
    const solid = model();
    const hole = model({ id: 'hole', name: 'Hole', hole: true, position: [100, 10, 100] });
    expect(inspectPrintability([solid, hole]).some((warning) => warning.code === 'open-hole')).toBe(true);
  });
});
