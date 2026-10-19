import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { strToU8, zipSync } from 'fflate';
import type { ModelObject } from '../editor/types';
import { createObjectGeometry } from '../geometry/createObjectGeometry';

const xmlEscape = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

function objectMeshXml(object: ModelObject, objectId: number): string {
  const geometry = createObjectGeometry(object);
  const position = geometry.getAttribute('position');
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

  const vertices: string[] = [];
  for (let i = 0; i < position.count; i++) {
    const vertex = new Vector3().fromBufferAttribute(position, i).applyMatrix4(matrix);
    vertices.push(`<vertex x="${vertex.x.toFixed(5)}" y="${vertex.y.toFixed(5)}" z="${vertex.z.toFixed(5)}"/>`);
  }

  const triangles: string[] = [];
  const count = index ? index.count : position.count;
  for (let i = 0; i + 2 < count; i += 3) {
    const a = index ? index.getX(i) : i;
    const b = index ? index.getX(i + 1) : i + 1;
    const c = index ? index.getX(i + 2) : i + 2;
    triangles.push(`<triangle v1="${a}" v2="${b}" v3="${c}"/>`);
  }

  geometry.dispose();
  return `<object id="${objectId}" type="model" name="${xmlEscape(object.name)}"><mesh><vertices>${vertices.join('')}</vertices><triangles>${triangles.join('')}</triangles></mesh></object>`;
}

export function exportObjectsAs3mf(objects: ModelObject[], fileName = '3dcorpcod-model.3mf'): void {
  const visibleObjects = objects.filter((object) => object.visible);
  if (!visibleObjects.length) throw new Error('Нет видимых объектов для экспорта');

  const resources = visibleObjects.map((object, index) => objectMeshXml(object, index + 1)).join('');
  const buildItems = visibleObjects.map((_, index) => `<item objectid="${index + 1}"/>`).join('');
  const model = `<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="ru-RU" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><metadata name="Title">3DCorpCod model</metadata><resources>${resources}</resources><build>${buildItems}</build></model>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>`;
  const relationships = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>`;
  const archive = zipSync({
    '[Content_Types].xml': strToU8(contentTypes),
    '_rels/.rels': strToU8(relationships),
    '3D/3dmodel.model': strToU8(model),
  });
  const arrayBuffer = archive.buffer.slice(archive.byteOffset, archive.byteOffset + archive.byteLength) as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: 'application/vnd.ms-package.3dmanufacturing-3dmodel' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
