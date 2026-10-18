import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import type { Scene } from 'three';

/**
 * Экспортирует переданную сцену в бинарный STL.
 * Важно: STL не хранит единицы измерения; проект 3DCorpCod использует миллиметры.
 * Перед использованием для печати геометрию необходимо валидировать.
 */
export function exportSceneAsStl(scene: Scene, fileName = '3dcorpcod-model.stl'): void {
  const exporter = new STLExporter();
  const output = exporter.parse(scene, { binary: true });
  const blob = new Blob([output], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}