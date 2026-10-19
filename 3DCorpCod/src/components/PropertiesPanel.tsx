import { useEffect, useState } from 'react';
import { useEditorStore } from '../editor/store';
import type { EdgeTreatment } from '../editor/types';

const edgeLabels: Record<EdgeTreatment, string> = {
  none: 'Без обработки',
  round: 'Скругление',
  chamfer: 'Фаска',
};

function NumberField({ value, disabled, min, step, onCommit }: {
  value: number;
  disabled: boolean;
  min?: number;
  step: number;
  onCommit: (raw: string) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return <input
    disabled={disabled}
    type="number"
    min={min}
    step={step}
    value={draft}
    onChange={(event) => setDraft(event.target.value)}
    onBlur={() => onCommit(draft)}
    onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
  />;
}

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
      <label className="field-label">Слой
        <input disabled={disabled} maxLength={40} value={selected.layer ?? 'Основной'} onChange={(event) => updateObject(selected.id, { layer: event.target.value.trim() || 'Основной' })} />
      </label>
      <label className="field-label color-field">Цвет объекта
        <div className="color-control">
          <input disabled={disabled} type="color" value={selected.color ?? '#8295b2'} onChange={(event) => updateObject(selected.id, { color: event.target.value })} />
          <span>{selected.color ?? '#8295b2'}</span>
        </div>
      </label>
      {selected.type === 'text' && (
        <>
          <div className="section-label">Параметры 3D-текста</div>
          <label className="field-label">Содержимое
            <textarea disabled={disabled} rows={3} maxLength={120} value={selected.textContent ?? 'Текст'} onChange={(event) => {
              const textContent = event.target.value;
              const fontSize = selected.fontSize ?? 10;
              const dimensions: [number, number, number] = [Math.max(2, textContent.length * fontSize * 0.62), Math.max(2, fontSize * 1.2), selected.textDepth ?? selected.dimensions[2]];
              updateObject(selected.id, { textContent, dimensions });
            }} />
          </label>
          <label className="field-label">Размер шрифта (мм)
            <input disabled={disabled} type="number" min="1" max="100" step="0.5" value={selected.fontSize ?? 10} onChange={(event) => {
              const value = Math.max(1, Math.min(100, Number(event.target.value) || 1));
              const oldSize = selected.fontSize ?? 10;
              const ratio = value / oldSize;
              updateObject(selected.id, { fontSize: value, dimensions: [Math.max(2, selected.dimensions[0] * ratio), Math.max(2, selected.dimensions[1] * ratio), selected.dimensions[2]] });
            }} />
          </label>
          <label className="field-label">Толщина выдавливания (мм)
            <input disabled={disabled} type="number" min="0.5" max="30" step="0.1" value={selected.textDepth ?? selected.dimensions[2]} onChange={(event) => {
              const value = Math.max(0.5, Math.min(30, Number(event.target.value) || 0.5));
              updateObject(selected.id, { textDepth: value, dimensions: [selected.dimensions[0], selected.dimensions[1], value] });
            }} />
          </label>
          <label className="visibility-row">
            <input disabled={disabled} type="checkbox" checked={Boolean(selected.textBevel)} onChange={(event) => updateObject(selected.id, { textBevel: event.target.checked })} />
            Скруглить кромки текста
          </label>
          {selected.textBevel && <label className="field-label">Размер скругления (мм)
            <input disabled={disabled} type="number" min="0.1" max="2" step="0.1" value={selected.textBevelSize ?? 0.3} onChange={(event) => updateObject(selected.id, { textBevelSize: Math.max(0.1, Math.min(2, Number(event.target.value) || 0.1)) })} />
          </label>}
          <p className="muted small-note">Текст создаётся как объёмная геометрия и попадает в экспорт STL/3MF.</p>
        </>
      )}
      <div className="section-label">Положение (мм)</div>
      <div className="triple-fields">
        {(['X', 'Y', 'Z'] as const).map((axis, index) => <label key={axis}>{axis}
          <NumberField disabled={disabled} step={0.1} value={selected.position[index]} onCommit={(raw) => updateTuple('position', index, raw)} />
        </label>)}
      </div>
      <div className="section-label">Размеры (мм)</div>
      <div className="triple-fields">
        {(['X', 'Y', 'Z'] as const).map((axis, index) => <label key={axis}>{axis}
          <NumberField disabled={disabled} min={0.1} step={0.1} value={selected.dimensions[index]} onCommit={(raw) => updateTuple('dimensions', index, raw)} />
        </label>)}
      </div>
      <div className="section-label">Поворот (°)</div>
      <div className="triple-fields">
        {(['X', 'Y', 'Z'] as const).map((axis, index) => <label key={axis}>{axis}
          <NumberField disabled={disabled} step={1} value={selected.rotation[index]} onCommit={(raw) => updateTuple('rotation', index, raw)} />
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
