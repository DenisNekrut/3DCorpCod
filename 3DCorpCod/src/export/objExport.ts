import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import type { ModelObject } from '../editor/types';
import { createBooleanGeometry } from '../geometry/boolean/createBooleanGeometry';

/** Export visible evaluated solids to Wavefront OBJ in millimetres. */
export function exportObjectsAsObj(objects: ModelObject[], fileName = '3dcorpcod-model.obj'): void {
  const lines = ['# 3DCorpCod', '# Автор: Некрут Денис'];
  let vertexOffset = 1;
  for (const object of objects) {
    if (!object.visible || object.hole || object.booleanSource) continue;
    const geometry = createBooleanGeometry(object, objects);
    const positions = geometry.getAttribute('position');
    const index = geometry.getIndex();
    const matrix = new Matrix4().compose(
      new Vector3(...object.position),
      new Quaternion().setFromEuler(new Euler(
        object.rotation[0] * Math.PI / 180,
        object.rotation[1] * Math.PI / 180,
        object.rotation[2] * Math.PI / 180,
      )),
      new Vector3(1, 1, 1),
    );
    lines.push('o ' + object.name.replace(/[\\r\\n]/g, '_').replace(/\\s+/g, '_'));
    for (let i = 0; i < positions.count; i++) {
      const vertex = new Vector3().fromBufferAttribute(positions, i).applyMatrix4(matrix);
      lines.push(`v ${vertex.x.toFixed(5)} ${vertex.y.toFixed(5)} ${vertex.z.toFixed(5)}`);
    }
    const count = index ? index.count : positions.count;
    for (let i = 0; i + 2 < count; i += 3) {
      const a = (index ? index.getX(i) : i) + vertexOffset;
      const b = (index ? index.getX(i + 1) : i + 1) + vertexOffset;
      const c = (index ? index.getX(i + 2) : i + 2) + vertexOffset;
      lines.push(`f ${a} ${b} ${c}`);
    }
    vertexOffset += positions.count;
    geometry.dispose();
  }
  if (vertexOffset === 1) throw new Error('Нет видимых тел для экспорта');
  const blob = new Blob([lines.join('\\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
