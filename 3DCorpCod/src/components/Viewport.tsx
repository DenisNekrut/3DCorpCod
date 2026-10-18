import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { GizmoHelper, GizmoViewport, OrbitControls } from '@react-three/drei';
import type { Mesh } from 'three';
import { useEditorStore } from '../editor/store';
import type { ModelObject } from '../editor/types';

function ModelMesh({ object }: { object: ModelObject }) {
  const meshRef = useRef<Mesh>(null);
  const selected = useEditorStore((state) => state.selectedId === object.id);
  const selectObject = useEditorStore((state) => state.selectObject);

  const geometry = (() => {
    switch (object.type) {
      case 'sphere': return <sphereGeometry args={[0.5, 32, 24]} />;
      case 'cylinder': return <cylinderGeometry args={[0.5, 0.5, 1, 32]} />;
      case 'cone': return <coneGeometry args={[0.5, 1, 32]} />;
      default: return <boxGeometry args={[1, 1, 1]} />;
    }
  })();

  return (
    <mesh
      ref={meshRef}
      position={object.position}
      rotation={object.rotation.map((angle) => angle * Math.PI / 180) as [number, number, number]}
      scale={object.dimensions}
      visible={object.visible}
      onClick={(event) => {
        event.stopPropagation();
        selectObject(object.id);
      }}
    >
      {geometry}
      <meshStandardMaterial
        color={selected ? '#62a8ff' : '#8295b2'}
        roughness={0.55}
        metalness={0.12}
        emissive={selected ? '#173b65' : '#000000'}
      />
    </mesh>
  );
}

function SceneContents() {
  const objects = useEditorStore((state) => state.objects);
  const selectObject = useEditorStore((state) => state.selectObject);

  return (
    <>
      <color attach="background" args={['#171c26']} />
      <ambientLight intensity={1.5} />
      <directionalLight position={[40, 60, 30]} intensity={2.2} />
      <gridHelper args={[200, 40, '#66758c', '#303949']} position={[0, 0, 0]} />
      <axesHelper args={[30]} />
      {objects.map((object) => <ModelMesh key={object.id} object={object} />)}
      <OrbitControls makeDefault />
      <GizmoHelper alignment="bottom-right" margin={[70, 70]}>
        <GizmoViewport />
      </GizmoHelper>
      <mesh visible={false} onClick={() => selectObject(null)}>
        <sphereGeometry args={[0.001]} />
        <meshBasicMaterial />
      </mesh>
    </>
  );
}

export default function Viewport() {
  return (
    <div className="viewport">
      <Canvas camera={{ position: [70, 65, 80], fov: 45 }} dpr={[1, 2]}>
        <SceneContents />
      </Canvas>
      <div className="viewport-label">РАБОЧАЯ ОБЛАСТЬ · ММ</div>
      <div className="viewport-help">ЛКМ — выбор · перетаскивание — вращение камеры · колесо — масштаб</div>
    </div>
  );
}