import { Mesh, MeshStandardMaterial, Scene } from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import type { ModelObject } from '../editor/types';
import { createObjectGeometry } from '../geometry/createObjectGeometry';

/**
 * Exports the visible objects as binary STL. STL does not store units; this editor uses mm.
 * The geometry factory is shared with the viewport so edge treatments are exported too.
 */
export function exportObjectsAsStl(objects: ModelObject[], fileName = '3dcorpcod-model.stl'): void {
  const scene = new Scene();
  const geometries = [];
  const material = new MeshStandardMaterial({ color: '#b0b0b0' });

  for (const object of objects) {
    if (!object.visible) continue;
    const geometry = createObjectGeometry(object);
    geometries.push(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.position.set(...object.position);
    mesh.rotation.set(
      object.rotation[0] * Math.PI / 180,
      object.rotation[1] * Math.PI / 180,
      object.rotation[2] * Math.PI / 180,
    );
    scene.add(mesh);
  }

  scene.updateMatrixWorld(true);
  const exporter = new STLExporter();
  const output = exporter.parse(scene, { binary: true });
  const blob = new Blob([output], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
  geometries.forEach((geometry) => geometry.dispose());
  material.dispose();
}

/** Legacy scene-based export helper retained for callers that already have a Three.js scene. */
export function exportSceneAsStl(scene: Scene, fileName = '3dcorpcod-model.stl'): void {
  const exporter = new STLExporter();
  scene.updateMatrixWorld(true);
  const output = exporter.parse(scene, { binary: true });
  const blob = new Blob([output], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
