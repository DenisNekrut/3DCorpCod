import type { ModelObject } from './types';

export interface PrintabilityWarning {
  objectId: string;
  objectName: string;
  code: 'thin-feature' | 'below-workplane' | 'open-hole';
  message: string;
}

/** Fast, conservative checks before export; not a substitute for slicer mesh analysis. */
export function inspectPrintability(objects: ModelObject[], minimumFeatureMm = 0.8): PrintabilityWarning[] {
  const warnings: PrintabilityWarning[] = [];
  for (const object of objects) {
    if (!object.visible || object.hole || object.booleanSource) continue;
    if (Math.min(...object.dimensions) < minimumFeatureMm) {
      warnings.push({ objectId: object.id, objectName: object.name, code: 'thin-feature', message: `Small feature below ${minimumFeatureMm} mm; verify nozzle and material settings.` });
    }
    if (object.position[1] - object.dimensions[1] / 2 < -0.05) {
      warnings.push({ objectId: object.id, objectName: object.name, code: 'below-workplane', message: 'Part extends below the Y=0 workplane.' });
    }
  }
  const visibleSolids = objects.filter((object) => object.visible && !object.hole && !object.booleanSource);
  for (const hole of objects.filter((object) => object.visible && object.hole)) {
    const intersects = visibleSolids.some((solid) => {
      return [0, 1, 2].every((axis) => {
        const distance = Math.abs(solid.position[axis] - hole.position[axis]);
        return distance < (solid.dimensions[axis] + hole.dimensions[axis]) / 2;
      });
    });
    if (!intersects) warnings.push({ objectId: hole.id, objectName: hole.name, code: 'open-hole', message: 'Hole cutter does not overlap a visible solid.' });
  }
  return warnings;
}
