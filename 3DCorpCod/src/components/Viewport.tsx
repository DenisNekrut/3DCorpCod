import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { GizmoHelper, GizmoViewport, Html, Line, OrbitControls, TransformControls } from '@react-three/drei';
import { Mesh } from 'three';
import type { BufferGeometry } from 'three';
import { useEditorStore } from '../editor/store';
import type { ModelObject } from '../editor/types';
import { createObjectGeometry } from '../geometry/createObjectGeometry';
import { createBooleanGeometry } from '../geometry/boolean/createBooleanGeometry';

function DimensionLines({ object }: { object: ModelObject }) {
  const [width, height, depth] = object.dimensions;
  const [x, y, z] = object.position;
  const hx = width / 2;
  const hy = height / 2;
  const hz = depth / 2;
  const offset = 3;
  return (
    <group>
      <Line points={[[x - hx, y - hy - offset, z + hz + offset], [x + hx, y - hy - offset, z + hz + offset]]} color="#72b7ff" lineWidth={1} />
      <Line points={[[x - hx, y - hy - offset, z - hz - offset], [x - hx, y - hy - offset, z + hz + offset]]} color="#72b7ff" lineWidth={1} />
      <Line points={[[x + hx + offset, y - hy, z + hz + offset], [x + hx + offset, y + hy, z + hz + offset]]} color="#72b7ff" lineWidth={1} />
      <Html position={[x, y - hy - offset, z + hz + offset]} center distanceFactor={100} style={{ pointerEvents: 'none' }}>
        <span className="dimension-label">{width.toFixed(1)} мм</span>
      </Html>
      <Html position={[x - hx, y - hy - offset, z]} center distanceFactor={100} style={{ pointerEvents: 'none' }}>
        <span className="dimension-label">{depth.toFixed(1)} мм</span>
      </Html>
      <Html position={[x + hx + offset, y, z + hz + offset]} center distanceFactor={100} style={{ pointerEvents: 'none' }}>
        <span className="dimension-label">{height.toFixed(1)} мм</span>
      </Html>
    </group>
  );
}

function WorkspaceRulers() {
  const ticks = useMemo(() => Array.from({ length: 41 }, (_, index) => index * 5 - 100), []);
  return (
    <group>
      {ticks.map((value) => (
        <group key={value}>
          <Line points={[[value, 0.08, -1.5], [value, 0.08, 1.5]]} color={value % 20 === 0 ? '#8ca2bf' : '#526178'} lineWidth={value % 20 === 0 ? 1.5 : 1} />
          <Line points={[[-1.5, 0.08, value], [1.5, 0.08, value]]} color={value % 20 === 0 ? '#8ca2bf' : '#526178'} lineWidth={value % 20 === 0 ? 1.5 : 1} />
          {value % 20 === 0 && (
            <>
              <Html position={[value, 0.15, 3.5]} center distanceFactor={90} style={{ pointerEvents: 'none' }}><span className="ruler-label">{value}</span></Html>
              <Html position={[3.5, 0.15, value]} center distanceFactor={90} style={{ pointerEvents: 'none' }}><span className="ruler-label">{value}</span></Html>
            </>
          )}
        </group>
      ))}
    </group>
  );
}

function ModelMesh({
  object,
  evaluatedGeometry,
  hoveredId,
  setHoveredId,
}: {
  object: ModelObject;
  evaluatedGeometry?: BufferGeometry;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
}) {
  const selected = useEditorStore((state) => state.selectedId === object.id);
  const transformMode = useEditorStore((state) => state.transformMode);
  const selectObject = useEditorStore((state) => state.selectObject);
  const updateObject = useEditorStore((state) => state.updateObject);
  const meshRef = useRef<Mesh>(null);
  const geometry = useMemo(() => evaluatedGeometry ?? createObjectGeometry(object), [
    evaluatedGeometry,
    object.type,
    object.dimensions[0],
    object.dimensions[1],
    object.dimensions[2],
    object.edgeTreatment,
    object.edgeSize,
    object.edgeSegments,
  ]);

  useEffect(() => () => {
    if (!evaluatedGeometry) geometry.dispose();
  }, [geometry, evaluatedGeometry]);

  const commitTransform = () => {
    const mesh = meshRef.current;
    if (!mesh || object.locked) return;

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
      onPointerOver={(event) => { event.stopPropagation(); setHoveredId(object.id); }}
      onPointerOut={() => setHoveredId(null)}
      onClick={(event) => {
        event.stopPropagation();
        selectObject(object.id);
      }}
    >
      <meshStandardMaterial
        color={object.hole ? '#f59e55' : selected ? '#62a8ff' : '#8295b2'}
        roughness={0.55}
        metalness={0.12}
        transparent={Boolean(object.hole)}
        opacity={object.hole ? 0.35 : 1}
        emissive={selected ? '#173b65' : '#000000'}
      />
    </mesh>
  );

  const showDimensions = selected || hoveredId === object.id;
  const renderedMesh = selected && !object.locked
    ? <TransformControls mode={transformMode} onMouseUp={commitTransform}>{mesh}</TransformControls>
    : mesh;

  return (
    <>
      {renderedMesh}
      {showDimensions && object.visible && <DimensionLines object={object} />}
    </>
  );
}

function SceneContents() {
  const objects = useEditorStore((state) => state.objects);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const evaluatedGeometries = useMemo(() => {
    if (!objects.some((object) => object.visible && object.hole)) return new Map<string, BufferGeometry>();
    const geometries = new Map<string, BufferGeometry>();
    for (const object of objects) {
      if (!object.visible || object.hole) continue;
      try {
        geometries.set(object.id, createBooleanGeometry(object, objects));
      } catch (error) {
        console.error(error);
      }
    }
    return geometries;
  }, [objects]);

  useEffect(() => () => evaluatedGeometries.forEach((geometry) => geometry.dispose()), [evaluatedGeometries]);

  return (
    <>
      <color attach="background" args={['#171c26']} />
      <ambientLight intensity={1.5} />
      <directionalLight position={[40, 60, 30]} intensity={2.2} />
      <gridHelper args={[200, 40, '#66758c', '#303949']} position={[0, 0, 0]} />
      <WorkspaceRulers />
      <axesHelper args={[30]} />
      {objects.map((object) => (
        <ModelMesh
          key={object.id}
          object={object}
          evaluatedGeometry={evaluatedGeometries.get(object.id)}
          hoveredId={hoveredId}
          setHoveredId={setHoveredId}
        />
      ))}
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
      <div className="viewport-help">Линейки в мм · размеры при выборе/наведении. Замок блокирует объект. Ctrl+S — сохранить, Ctrl+O — открыть, Ctrl+D — дублировать, Delete — удалить.</div>
    </div>
  );
}
