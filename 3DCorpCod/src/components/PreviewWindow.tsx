import { useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import type { BufferGeometry } from 'three';
import { useEditorStore } from '../editor/store';
import type { ModelObject } from '../editor/types';
import { createObjectGeometry } from '../geometry/createObjectGeometry';
import { createBooleanGeometry } from '../geometry/boolean/createBooleanGeometry';

function PreviewMesh({ object, geometry }: { object: ModelObject; geometry?: BufferGeometry }) {
  const fallback = useMemo(() => geometry ?? createObjectGeometry(object), [geometry, object]);
  useEffect(() => () => { if (!geometry) fallback.dispose(); }, [fallback, geometry]);
  return (
    <mesh
      geometry={fallback}
      position={object.position}
      rotation={object.rotation.map((angle) => angle * Math.PI / 180) as [number, number, number]}
    >
      <meshStandardMaterial color="#8caed8" roughness={0.48} metalness={0.12} />
    </mesh>
  );
}

function PreviewScene({ objects }: { objects: ModelObject[] }) {
  const evaluated = useMemo(() => {
    const result = new Map<string, BufferGeometry>();
    for (const object of objects) {
      if (!object.visible || object.hole) continue;
      result.set(object.id, createBooleanGeometry(object, objects));
    }
    return result;
  }, [objects]);
  useEffect(() => () => evaluated.forEach((geometry) => geometry.dispose()), [evaluated]);
  const solids = objects.filter((object) => object.visible && !object.hole);

  return (
    <>
      <color attach="background" args={['#111720']} />
      <ambientLight intensity={1.8} />
      <directionalLight position={[40, 50, 35]} intensity={2.4} />
      <gridHelper args={[200, 40, '#53647a', '#263142']} />
      {solids.map((object) => <PreviewMesh key={object.id} object={object} geometry={evaluated.get(object.id)} />)}
      {solids.length === 0 && <Html center><div className="preview-empty">Нет видимых тел для предпросмотра</div></Html>}
      <OrbitControls makeDefault />
    </>
  );
}

export default function PreviewWindow({ objects, onClose }: { objects: ModelObject[]; onClose: () => void }) {
  return (
    <div className="preview-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="preview-window" role="dialog" aria-modal="true" aria-label="Предпросмотр модели">
        <header className="preview-header">
          <div><strong>Предпросмотр модели</strong><span>Итоговая геометрия · без манипуляторов</span></div>
          <button className="preview-close" onClick={onClose} aria-label="Закрыть предпросмотр">×</button>
        </header>
        <div className="preview-canvas">
          <Canvas camera={{ position: [70, 65, 80], fov: 45 }} dpr={[1, 2]}>
            <PreviewScene objects={objects} />
          </Canvas>
          <div className="preview-tip">Перетаскивай мышью для вращения · колесо — масштаб</div>
        </div>
      </section>
    </div>
  );
}
