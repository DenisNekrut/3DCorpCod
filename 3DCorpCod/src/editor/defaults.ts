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
  text: [30, 10, 2],
  mesh: [20, 20, 20],
};

const names: Record<PrimitiveType, string> = {
  box: 'Бокс',
  sphere: 'Сфера',
  cylinder: 'Цилиндр',
  cone: 'Конус',
  torus: 'Тор',
  capsule: 'Капсула',
  pyramid: 'Четырёхгранная пирамида',
  prism: 'Треугольная призма',
  text: '3D-текст',
  mesh: 'Импортированная модель',
};

const colors: Record<PrimitiveType, string> = {
  box: '#48b9ff',
  sphere: '#ff806b',
  cylinder: '#f4c95d',
  cone: '#a78bfa',
  torus: '#49dcb1',
  capsule: '#ff9fca',
  pyramid: '#ffb86b',
  prism: '#6bd7ff',
  text: '#e5e7eb',
  mesh: '#8295b2',
};

export function createPrimitive(type: PrimitiveType, index: number): ModelObject {
  const dimensions = [...dimensionsByType[type]] as [number, number, number];
  return {
    id: crypto.randomUUID(),
    name: `${names[type]} ${index + 1}`,
    type,
    // Every primitive uses a centered local origin and is placed on the Y=0 workplane.
    position: [index * 5, dimensions[1] / 2, 0],
    rotation: [0, 0, 0],
    dimensions,
    visible: true,
    color: colors[type],
    layer: 'Основной',
    ...(type === 'text' ? { textContent: 'Текст', fontSize: 10, textDepth: 2, textBevel: false, textBevelSize: 0.3 } : {}),
    edgeTreatment: 'none',
    edgeSize: 1,
    edgeSegments: 4,
  };
}
