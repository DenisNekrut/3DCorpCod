import { useEditorStore } from '../editor/store';
import type { EdgeTreatment } from '../editor/types';

const edgeLabels: Record<EdgeTreatment, string> = {
  none: 'Без обработки',
  round: 'Скругление',
  chamfer: 'Фаска',
};

export default function PropertiesPanel() {
  const selected = useEditorStore((state) => state.objects.find((item) => item.id === state.selectedId));
  const updateObject = useEditorStore((state) => state.updateObject);

  if (!selected) {
    return <aside className="properties panel"><div className="panel-heading">Свойства</div><p className="muted empty-hint">Выбери объект на сцене или в дереве объектов.</p></aside>;
  }

  const updateTuple = (key: 'position' | 'rotation' | 'dimensions', index: number, raw: string) => {
    const value = Number(raw);
    if (!Number.isFinite(value) || selected.locked) return;
    const tuple = [...selected[key]] as [number, number, number];
    tuple[index] = key === 'rotation' ? value : key === 'dimensions' ? Math.max(0.1, Math.round(value * 10) / 10) : Math.round(value * 10) / 10;
    updateObject(selected.id, { [key]: tuple });
  };

  const edgeTreatment = selected.edgeTreatment ?? 'none';
  const disabled = Boolean(selected.locked);

  return (
    <aside className="properties panel">
      <div className="panel-heading">Свойства объекта {selected.locked ? '· ЗАБЛОКИРОВАН' : ''}</div>
      <label className="field-label">Название
        <input disabled={disabled} value={selected.name} onChange={(event) => updateObject(selected.id, { name: event.target.value })} />
      </label>
      <div className="section-label">Положение (мм)</div>
      <div className="triple-fields">
        {(['X', 'Y', 'Z'] as const).map((axis, index) => <label key={axis}>{axis}
          <input disabled={disabled} type="number" step="0.1" value={selected.position[index]} onChange={(event) => updateTuple('position', index, event.target.value)} />
        </label>)}
      </div>
      <div className="section-label">Размеры (мм)</div>
      <div className="triple-fields">
        {(['X', 'Y', 'Z'] as const).map((axis, index) => <label key={axis}>{axis}
          <input disabled={disabled} type="number" min="0.1" step="0.1" value={selected.dimensions[index]} onChange={(event) => updateTuple('dimensions', index, event.target.value)} />
        </label>)}
      </div>
      <div className="section-label">Поворот (°)</div>
      <div className="triple-fields">
        {(['X', 'Y', 'Z'] as const).map((axis, index) => <label key={axis}>{axis}
          <input disabled={disabled} type="number" step="1" value={selected.rotation[index]} onChange={(event) => updateTuple('rotation', index, event.target.value)} />
        </label>)}
      </div>

      {selected.type === 'box' && (
        <>
          <div className="section-label">Обработка рёбер</div>
          <label className="field-label">Тип обработки
            <select disabled={disabled} value={edgeTreatment} onChange={(event) => updateObject(selected.id, { edgeTreatment: event.target.value as EdgeTreatment })}>
              {Object.entries(edgeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          {edgeTreatment !== 'none' && (
            <label className="field-label">{edgeTreatment === 'round' ? 'Радиус скругления (мм)' : 'Размер фаски (мм)'}
              <input disabled={disabled} type="number" min="0.1" max={Math.min(...selected.dimensions) * 0.45} step="0.1" value={selected.edgeSize ?? 1}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isFinite(value)) updateObject(selected.id, { edgeSize: Math.max(0.1, value) });
                }} />
            </label>
          )}
          {edgeTreatment === 'round' && (
            <label className="field-label">Сегменты скругления
              <input disabled={disabled} type="number" min="1" max="8" step="1" value={selected.edgeSegments ?? 4}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isFinite(value)) updateObject(selected.id, { edgeSegments: Math.max(1, Math.min(8, Math.round(value))) });
                }} />
            </label>
          )}
          <p className="muted small-note">Фаска и скругление пока доступны для куба. Параметры учитываются при экспорте.</p>
        </>
      )}

      <label className="visibility-row">
        <input type="checkbox" disabled={disabled} checked={selected.visible} onChange={(event) => updateObject(selected.id, { visible: event.target.checked })} />
        Объект видим
      </label>
      {selected.hole && <p className="muted small-note">Этот объект работает как вырезатель: его объём вычитается из пересекающихся тел и сам он не включается в STL/3MF.</p>}
      <p className="muted small-note">Размеры и координаты указаны в миллиметрах с шагом 0,1 мм.</p>
    </aside>
  );
}
