import { useEditorStore } from '../editor/store';

export default function PropertiesPanel() {
  const selected = useEditorStore((state) => state.objects.find((item) => item.id === state.selectedId));
  const updateObject = useEditorStore((state) => state.updateObject);

  if (!selected) {
    return <aside className="properties panel"><div className="panel-heading">Свойства</div><p className="muted empty-hint">Выбери объект на сцене или в дереве объектов.</p></aside>;
  }

  const updateTuple = (key: 'position' | 'rotation' | 'dimensions', index: number, raw: string) => {
    const value = Number(raw);
    if (!Number.isFinite(value)) return;
    const tuple = [...selected[key]] as [number, number, number];
    tuple[index] = key === 'rotation' ? value : Math.round(value * 10) / 10;
    updateObject(selected.id, { [key]: tuple });
  };

  return (
    <aside className="properties panel">
      <div className="panel-heading">Свойства объекта</div>
      <label className="field-label">Название
        <input value={selected.name} onChange={(event) => updateObject(selected.id, { name: event.target.value })} />
      </label>
      <div className="section-label">Положение (мм)</div>
      <div className="triple-fields">
        {(['X', 'Y', 'Z'] as const).map((axis, index) => <label key={axis}>{axis}
          <input type="number" step="0.1" value={selected.position[index]} onChange={(event) => updateTuple('position', index, event.target.value)} />
        </label>)}
      </div>
      <div className="section-label">Размеры (мм)</div>
      <div className="triple-fields">
        {(['X', 'Y', 'Z'] as const).map((axis, index) => <label key={axis}>{axis}
          <input type="number" min="0.1" step="0.1" value={selected.dimensions[index]} onChange={(event) => updateTuple('dimensions', index, event.target.value)} />
        </label>)}
      </div>
      <div className="section-label">Поворот (°)</div>
      <div className="triple-fields">
        {(['X', 'Y', 'Z'] as const).map((axis, index) => <label key={axis}>{axis}
          <input type="number" step="1" value={selected.rotation[index]} onChange={(event) => updateTuple('rotation', index, event.target.value)} />
        </label>)}
      </div>
      <label className="visibility-row">
        <input type="checkbox" checked={selected.visible} onChange={(event) => updateObject(selected.id, { visible: event.target.checked })} />
        Объект видим
      </label>
      <p className="muted small-note">Шаг ввода линейных значений: 0,1 мм. Это прототип панели; проверки геометрии будут добавлены на следующих этапах.</p>
    </aside>
  );
}