import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { GizmoHelper, GizmoViewport, Html, Line, OrbitControls, TransformControls } from '@react-three/drei';
import { Mesh } from 'three';
import type { BufferGeometry } from 'three';
import { TransformControls as TransformControlsImpl } from 'three-stdlib';
import { useEditorStore } from '../editor/store';
import type { ModelObject } from '../editor/types';
import { createObjectGeometry } from '../geometry/createObjectGeometry';
import { createBooleanGeometry } from '../geometry/boolean/createBooleanGeometry';

function DimensionLines({ object, editable, onDimensionChange }: {
  object: ModelObject;
  editable: boolean;
  onDimensionChange: (axis: 0 | 1 | 2, value: number) => void;
}) {
  const [width, height, depth] = object.dimensions;
  const [x, y, z] = object.position;
  const [drafts, setDrafts] = useState<[string, string, string]>(object.dimensions.map((value) => value.toFixed(1)) as [string, string, string]);
  useEffect(() => {
    setDrafts(object.dimensions.map((value) => value.toFixed(1)) as [string, string, string]);
  }, [object.dimensions[0], object.dimensions[1], object.dimensions[2]]);
  const hx = width / 2;
  const hy = height / 2;
  const hz = depth / 2;
  const offset = 3;
  const input = (axis: 0 | 1 | 2, value: number) => (
    <input
      className="dimension-input"
      aria-label={['Ширина', 'Высота', 'Глубина'][axis]}
      type="number"
      min="0.1"
      step="0.1"
      value={drafts[axis]}
      readOnly={!editable}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => setDrafts((current) => current.map((draft, index) => index === axis ? event.target.value : draft) as [string, string, string])}
      onBlur={() => {
        const next = Number(drafts[axis]);
        if (editable && Number.isFinite(next) && next >= 0.1) onDimensionChange(axis, Math.round(next * 10) / 10);
        else setDrafts((current) => current.map((draft, index) => index === axis ? value.toFixed(1) : draft) as [string, string, string]);
      }}
      onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
    />
  );
  return (
    <group>
      <Line points={[[x - hx, y - hy - offset, z + hz + offset], [x + hx, y - hy - offset, z + hz + offset]]} color="#72b7ff" lineWidth={1} />
      <Line points={[[x - hx, y - hy - offset, z - hz - offset], [x - hx, y - hy - offset, z + hz + offset]]} color="#72b7ff" lineWidth={1} />
      <Line points={[[x + hx + offset, y - hy, z + hz + offset], [x + hx + offset, y + hy, z + hz + offset]]} color="#72b7ff" lineWidth={1} />
      <Html position={[x, y - hy - offset, z + hz + offset]} center distanceFactor={100} style={{ pointerEvents: editable ? 'auto' : 'none' }}>
        <span className="dimension-label"><span>Ш</span>{input(0, width)}</span>
      </Html>
      <Html position={[x - hx, y - hy - offset, z]} center distanceFactor={100} style={{ pointerEvents: editable ? 'auto' : 'none' }}>
        <span className="dimension-label"><span>Г</span>{input(2, depth)}</span>
      </Html>
      <Html position={[x + hx + offset, y, z + hz + offset]} center distanceFactor={100} style={{ pointerEvents: editable ? 'auto' : 'none' }}>
        <span className="dimension-label"><span>В</span>{input(1, height)}</span>
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
  const toggleSelectObject = useEditorStore((state) => state.toggleSelectObject);
  const gridSnap = useEditorStore((state) => state.gridSnap);
  const updateObject = useEditorStore((state) => state.updateObject);
  const meshRef = useRef<Mesh>(null);
  const controlsRef = useRef<TransformControlsImpl | null>(null);
  const commitTransformRef = useRef<() => void>(() => {});
  const draggingRef = useRef(false);
  const shiftHeldRef = useRef(false);
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

  useEffect(() => {
    const down = (event: KeyboardEvent) => { if (event.key === 'Shift') shiftHeldRef.current = true; };
    const up = (event: KeyboardEvent) => { if (event.key === 'Shift') shiftHeldRef.current = false; };
    const blur = () => { shiftHeldRef.current = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  // Keep the scene and store synchronized while dragging; controlled mesh props
  // otherwise re-apply stale coordinates and make the object jump back.
  const syncTransform = () => {
    const mesh = meshRef.current;
    if (!mesh || object.locked) return;
    if (transformMode === 'translate') {
      const position: [number, number, number] = [
        Math.round(mesh.position.x * 10) / 10,
        Math.round(mesh.position.y * 10) / 10,
        Math.round(mesh.position.z * 10) / 10,
      ];
      updateObject(object.id, { position });
      return;
    }
    if (transformMode === 'rotate') {
      updateObject(object.id, {
        rotation: [
          Math.round(mesh.rotation.x * 180 / Math.PI * 10) / 10,
          Math.round(mesh.rotation.y * 180 / Math.PI * 10) / 10,
          Math.round(mesh.rotation.z * 180 / Math.PI * 10) / 10,
        ],
      });
      return;
    }
    if (transformMode === 'scale' && shiftHeldRef.current) {
      const dimensions = object.dimensions;
      const values = [mesh.scale.x, mesh.scale.y, mesh.scale.z];
      values.forEach((scale, axis) => {
        const base = dimensions[axis];
        if (Math.abs(scale - 1) < 0.0001) return;
        values[axis] = Math.max(0.1, base + Math.round(base * scale - base)) / base;
      });
      mesh.scale.set(values[0], values[1], values[2]);
    }
  };

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

  commitTransformRef.current = commitTransform;

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const eventTarget = controls as unknown as {
      addEventListener: (type: string, listener: (event: { value?: boolean }) => void) => void;
      removeEventListener: (type: string, listener: (event: { value?: boolean }) => void) => void;
    };
    const handleDraggingChanged = (event: { value?: boolean }) => {
      if (event.value === true) {
        draggingRef.current = true;
        return;
      }
      if (draggingRef.current) {
        draggingRef.current = false;
        commitTransformRef.current();
      }
    };
    const handlePointerUpCapture = () => {
      // Commit before React Three Fiber's pointer-missed handler clears selection.
      if (!draggingRef.current) return;
      draggingRef.current = false;
      commitTransformRef.current();
    };
    eventTarget.addEventListener('dragging-changed', handleDraggingChanged);
    window.addEventListener('pointerup', handlePointerUpCapture, true);
    window.addEventListener('pointercancel', handlePointerUpCapture, true);
    return () => {
      eventTarget.removeEventListener('dragging-changed', handleDraggingChanged);
      window.removeEventListener('pointerup', handlePointerUpCapture, true);
      window.removeEventListener('pointercancel', handlePointerUpCapture, true);
    };
  }, [selected, transformMode]);

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
        if (event.nativeEvent.shiftKey) toggleSelectObject(object.id); else selectObject(object.id);
      }}
    >
      <meshStandardMaterial
        color={object.hole ? '#f59e55' : object.color ?? '#8295b2'}
        roughness={0.55}
        metalness={0.12}
        transparent={Boolean(object.hole)}
        opacity={object.hole ? 0.35 : 1}
        emissive={selected ? '#173b65' : '#000000'}
      />
      {selected && object.visible && <axesHelper args={[Math.max(8, Math.min(...object.dimensions) * 0.8)]} />}
    </mesh>
  );

  const showDimensions = selected || hoveredId === object.id;
  const renderedMesh = selected && !object.locked
    ? <TransformControls ref={controlsRef} mode={transformMode} translationSnap={gridSnap ? 0.1 : null} rotationSnap={gridSnap ? Math.PI / 12 : null} onObjectChange={syncTransform}>{mesh}</TransformControls>
    : mesh;

  return (
    <>
      {renderedMesh}
      {showDimensions && object.visible && <DimensionLines object={object} editable={selected && !object.locked} onDimensionChange={(axis, value) => {
        const dimensions = [...object.dimensions] as [number, number, number];
        dimensions[axis] = value;
        updateObject(object.id, { dimensions });
      }} />}
    </>
  );
}

function SceneContents({ rulerEnabled, rulerPoints, setRulerPoints }: { rulerEnabled: boolean; rulerPoints: [number, number, number][]; setRulerPoints: (points: [number, number, number][]) => void }) {
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
      <gridHelper args={[200, 200, '#526780', '#263244']} position={[0, 0, 0]} />
      <WorkspaceRulers />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.02, 0]}
        onClick={(event) => {
          if (!rulerEnabled) return;
          event.stopPropagation();
          const point: [number, number, number] = [
            Math.round(event.point.x * 10) / 10,
            0,
            Math.round(event.point.z * 10) / 10,
          ];
          setRulerPoints(rulerPoints.length >= 2 ? [point] : [...rulerPoints, point]);
        }}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={2} />
      </mesh>
      {rulerEnabled && rulerPoints.length > 0 && (
        <group>
          <mesh position={rulerPoints[0]}><sphereGeometry args={[0.7, 12, 8]} /><meshBasicMaterial color="#ffd166" depthTest={false} /></mesh>
          {rulerPoints.length === 2 && (
            <>
              <mesh position={rulerPoints[1]}><sphereGeometry args={[0.7, 12, 8]} /><meshBasicMaterial color="#ffd166" depthTest={false} /></mesh>
              <Line points={[rulerPoints[0], rulerPoints[1]]} color="#ffd166" lineWidth={2} />
              <Html position={[(rulerPoints[0][0] + rulerPoints[1][0]) / 2, 0.5, (rulerPoints[0][2] + rulerPoints[1][2]) / 2]} center style={{ pointerEvents: 'none' }}>
                <span className="virtual-ruler-readout">
                  ΔX {(rulerPoints[1][0] - rulerPoints[0][0]).toFixed(1)} мм · ΔZ {(rulerPoints[1][2] - rulerPoints[0][2]).toFixed(1)} мм ·
                  <strong> {Math.hypot(rulerPoints[1][0] - rulerPoints[0][0], rulerPoints[1][2] - rulerPoints[0][2]).toFixed(1)} мм</strong>
                </span>
              </Html>
            </>
          )}
        </group>
      )}

      {objects.filter((object) => !object.booleanSource).map((object) => (
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

export default function Viewport({ rulerEnabled = false }: { rulerEnabled?: boolean }) {
  const [rulerPoints, setRulerPoints] = useState<[number, number, number][]>([]);
  useEffect(() => { setRulerPoints([]); }, [rulerEnabled]);
  const selectObject = useEditorStore((state) => state.selectObject);

  return (
    <div className="viewport">
      <Canvas camera={{ position: [70, 65, 80], fov: 45 }} dpr={[1, 2]} onPointerMissed={() => selectObject(null)}>
        <SceneContents rulerEnabled={rulerEnabled} rulerPoints={rulerPoints} setRulerPoints={setRulerPoints} />
      </Canvas>
      <div className="viewport-label">РАБОЧАЯ ОБЛАСТЬ · СЕТКА 1 ММ</div>
      <div className="viewport-watermark" aria-hidden="true"><span>3DCorpCod</span><small>Автор: Некрут Денис</small></div>
      <div className="viewport-help">{rulerEnabled ? 'Линейка: щёлкни две точки на сетке. Esc — выключить инструмент.' : 'Размеры при выборе/наведении.'} Замок блокирует объект. Ctrl+S — сохранить, Ctrl+O — открыть, Ctrl+D — дублировать, Delete — удалить.</div>
    </div>
  );
}
