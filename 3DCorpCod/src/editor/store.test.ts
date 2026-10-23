import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useEditorStore } from './store';
import type { ModelObject, ProjectDocument } from './types';

const testObject: ModelObject = {
  id: 'anchor-box',
  name: 'Anchor box',
  type: 'box',
  position: [0, 10, 0],
  rotation: [0, 0, 0],
  dimensions: [20, 20, 20],
  visible: true,
};

function resetStore(objects: ModelObject[] = [testObject]) {
  const project: ProjectDocument = {
    schemaVersion: 1,
    name: 'Anchor test',
    units: 'mm',
    objects,
    updatedAt: new Date(0).toISOString(),
  };
  useEditorStore.getState().loadProject(project);
}

describe('object bottom anchors', () => {
  beforeEach(() => resetStore());
  afterEach(() => resetStore([]));

  it('keeps a ground-placed object on the workplane when its height changes', () => {
    useEditorStore.getState().updateObject('anchor-box', { dimensions: [20, 34, 20] });
    const object = useEditorStore.getState().objects[0];
    expect(object.position[1]).toBeCloseTo(17);
    expect(object.position[1] - object.dimensions[1] / 2).toBeCloseTo(0);
  });

  it('preserves an elevated bottom anchor when its height changes', () => {
    useEditorStore.getState().updateObject('anchor-box', { position: [0, 25, 0] });
    useEditorStore.getState().updateObject('anchor-box', { dimensions: [20, 12, 20] });
    const object = useEditorStore.getState().objects[0];
    expect(object.position[1]).toBeCloseTo(21);
    expect(object.position[1] - object.dimensions[1] / 2).toBeCloseTo(15);
  });

  it('respects an explicit position supplied with new dimensions', () => {
    useEditorStore.getState().updateObject('anchor-box', {
      dimensions: [20, 30, 20],
      position: [4, 50, 6],
    });
    expect(useEditorStore.getState().objects[0].position).toEqual([4, 50, 6]);
  });
});
