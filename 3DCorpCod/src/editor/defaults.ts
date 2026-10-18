import type { ModelObject, PrimitiveType } from './types';

const dimensionsByType: Record<PrimitiveType, [number, number, number]> = {
  box: [20, 20, 20],
  sphere: [20, 20, 20],
  cylinder: [20, 20, 20],
  cone: [20, 20, 20],
  torus: [24, 8, 24],
  capsule: [16, 30, 16],
  pyramid: [20, 20, 20],
  prism: [20, 20, 20],
};

const names: Record<PrimitiveType, string> = {
  box: 'Куб',
  sphere: 'Сфера',
  cylinder: 'Цилиндр',
  cone: 'Конус',
  torus: 'Тор',
  capsule: 'Капсула',
  pyramid: 'Пирамида',
  prism: 'Треугольная призма',
};

export function createPrimitive(type: PrimitiveType, index: number): ModelObject {
  const dimensions = dimensionsByType[type];
  return {
    id: crypto.randomUUID(),
    name: `${names[type]} ${index + 1}`,
    type,
    position: [index * 5, dimensions[1] / 2, 0],
    rotation: [0, 0, 0],
    dimensions: [...dimensions],
    visible: true,
    edgeTreatment: 'none',
    edgeSize: 1,
    edgeSegments: 4,
  };
}
