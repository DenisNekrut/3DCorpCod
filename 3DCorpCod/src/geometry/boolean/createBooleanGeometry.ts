import { MeshStandardMaterial, type BufferGeometry } from 'three';
import { Brush, Evaluator, ADDITION, INTERSECTION, SUBTRACTION } from 'three-bvh-csg';
import type { ModelObject } from '../../editor/types';
import { createObjectGeometry } from '../createObjectGeometry';

const evaluator = new Evaluator();
const makeBrush = (object: ModelObject) => {
  const brush = new Brush(createObjectGeometry(object), new MeshStandardMaterial());
  brush.position.set(...object.position);
  brush.rotation.set(
    object.rotation[0] * Math.PI / 180,
    object.rotation[1] * Math.PI / 180,
    object.rotation[2] * Math.PI / 180,
  );
  brush.updateMatrixWorld(true);
  return brush;
};

/**
 * Returns a solid's local-space geometry after subtracting every visible hole object.
 * The source document is kept parametric: each edit re-evaluates the boolean result.
 */
export function createBooleanGeometry(target: ModelObject, objects: ModelObject[]): BufferGeometry {
  const cutters = objects.filter((object) => object.visible && object.hole && object.id !== target.id);
  const operands = target.booleanOperation && target.groupId
    ? objects.filter((object) => object.visible && object.booleanSource && object.groupId === target.groupId && object.id !== target.id)
    : [];
  if (!cutters.length && !operands.length) return createObjectGeometry(target);

  let result = makeBrush(target);
  const ownedBrushes: Brush[] = [result];

  try {
    for (const operandObject of operands) {
      const operand = makeBrush(operandObject);
      ownedBrushes.push(operand);
      const operation = target.booleanOperation === 'union' ? ADDITION : target.booleanOperation === 'intersect' ? INTERSECTION : SUBTRACTION;
      const next = evaluator.evaluate(result, operand, operation);
      next.position.set(...target.position);
      next.rotation.set(
        target.rotation[0] * Math.PI / 180,
        target.rotation[1] * Math.PI / 180,
        target.rotation[2] * Math.PI / 180,
      );
      next.updateMatrixWorld(true);
      ownedBrushes.push(next);
      result = next;
    }
    for (const cutterObject of cutters) {
      const cutter = makeBrush(cutterObject);
      ownedBrushes.push(cutter);
      const next = evaluator.evaluate(result, cutter, SUBTRACTION);
      // Keep the evaluated mesh anchored to the target object's transform.
      next.position.set(...target.position);
      next.rotation.set(
        target.rotation[0] * Math.PI / 180,
        target.rotation[1] * Math.PI / 180,
        target.rotation[2] * Math.PI / 180,
      );
      next.updateMatrixWorld(true);
      ownedBrushes.push(next);
      result = next;
    }
    return result.geometry.clone();
  } catch (error) {
    console.error('Boolean subtraction failed; preserving original solid.', error);
    throw new Error('Не удалось вычислить отверстие. Попробуйте изменить пересечение фигур.');
  } finally {
    const uniqueGeometries = new Set(ownedBrushes.map((brush) => brush.geometry));
    uniqueGeometries.forEach((geometry) => geometry.dispose());
    ownedBrushes.forEach((brush) => {
      if (Array.isArray(brush.material)) brush.material.forEach((material) => material.dispose());
      else brush.material.dispose();
    });
  }
}
