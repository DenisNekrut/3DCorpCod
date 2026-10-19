import { useEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { GizmoHelper, GizmoViewport, OrbitControls, TransformControls } from '@react-three/drei';
import { Mesh } from 'three';
import { useEditorStore } from '../editor/store';
import type { ModelObject } from '../editor/types';
import { createObjectGeometry } from '../geometry/createObjectGeometry';

function ModelMesh({ object }: { object: ModelObject }) {
  const selected = useEditorStore((state) => state.selectedId === object.id);
  const transformMode = useEditorStore((state) => state.transformMode);
  const selectObject = useEditorStore((state) => state.selectObject);
  const updateObject = useEditorStore((state) => state.updateObject);
  const meshRef = useRef<Mesh>(null);
  const geometry = useMemo(() => createObjectGeometry(object), [
    object.type,
    object.dimensions[0],
    object.dimensions[1],
    object.dimensions[2],
    object.edgeTreatment,
    object.edgeSize,
    object.edgeSegments,
  ]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const commitTransform = () => {
    const mesh = meshRef.current;
    if (!mesh) return;

    if (transformMode === 'scale') {
      const scale = mesh.scale.clone();
      const dimensions: [number, number, number] = [
        Math.max(0.1, Math.round(object.dimensions[0] * scale.x * 10) / 10),
        Math.max(0.1, Math.round(object.dimensions[1] * scale.y * 10) / 10),
        Math.max(0.1, Math.round(object.dimensions[2] * scale.z * 10) / 10),
      ];
      mesh.scale.set(1, 1, 1);
      updateObject(object.id, { dimensions });
      return;
    }

    if (transformMode === 'translate') {
      updateObject(object.id, {
        position: [
          Math.round(mesh.position.x * 10) / 10,
          Math.round(mesh.position.y * 10) / 10,
          Math.round(mesh.position.z * 10) / 10,
        ],
      });
    } else {
      updateObject(object.id, {
        rotation: [
          Math.round(mesh.rotation.x * 180 / Math.PI * 10) / 10,
          Math.round(mesh.rotation.y * 180 / Math.PI * 10) / 10,
          Math.round(mesh.rotation.z * 180 / Math.PI * 10) / 10,
        ],
      });
    }
  };

  const mesh = (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={object.position}
      rotation={object.rotation.map((angle) => angle * Math.PI / 180) as [number, number, number]}
      visible={object.visible}
      onClick={(event) => {
        event.stopPropagation();
        selectObject(object.id);
      }}
    >
      <meshStandardMaterial
        color={selected ? '#62a8ff' : '#8295b2'}
        roughness={0.55}
        metalness={0.12}
        emissive={selected ? '#173b65' : '#000000'}
      />
    </mesh>
  );

  return selected
    ? <TransformControls mode={transformMode} onMouseUp={commitTransform}>{mesh}</TransformControls>
    : mesh;
}

function SceneContents() {
  const objects = useEditorStore((state) => state.objects);

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
    </>
  );
}

export default function Viewport() {
  const selectObject = useEditorStore((state) => state.selectObject);

  return (
    <div className="viewport">
      <Canvas camera={{ position: [70, 65, 80], fov: 45 }} dpr={[1, 2]} onPointerMissed={() => selectObject(null)}>
        <SceneContents />
      </Canvas>
      <div className="viewport-label">РАБОЧАЯ ОБЛАСТЬ · ММ</div>
      <div className="viewport-help">Выбери объект → стрелки: перемещение, дуги: вращение, квадраты: масштаб. Ctrl+S — сохранить, Ctrl+O — открыть, Ctrl+D — дублировать, Delete — удалить. Пустой щелчок снимает выделение.</div>
    </div>
  );
}
