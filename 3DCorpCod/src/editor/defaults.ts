import type { ModelObject, PrimitiveType } from './types';

const dimensionsByType: Record<PrimitiveType, [number, number, number]> = {
  box: [20, 20, 20],
  sphere: [20, 20, 20],
  cylinder: [20, 20, 20],
  cone: [20, 20, 20],
};

const names: Record<PrimitiveType, string> = {
  box: 'Куб',
  sphere: 'Сфера',
  cylinder: 'Цилиндр',
  cone: 'Конус',
};

export function createPrimitive(type: PrimitiveType, index: number): ModelObject {
  return {
    id: crypto.randomUUID(),
    name: `${names[type]} ${index + 1}`,
    type,
    position: [index * 5, dimensionsByType[type][1] / 2, 0],
    rotation: [0, 0, 0],
    dimensions: [...dimensionsByType[type]],
    visible: true,
  };
}