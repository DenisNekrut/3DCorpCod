import { useEffect, useRef, useState } from 'react';
import {
  Box, Circle, Cylinder, Cone, Donut, Pill, Triangle, Hexagon, Copy, Download,
  FilePlus2, FolderOpen, Save, Trash2, Move, RotateCw, Scaling, LockKeyhole,
  UnlockKeyhole, CircleSlash, Eye, Lock,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEditorStore } from '../editor/store';
import type { PrimitiveType, ProjectDocument } from '../editor/types';
import { loadProject, saveProject } from '../storage/projectStorage';
import { exportObjectsAsStl } from '../export/stlExport';
import { exportObjectsAs3mf } from '../export/threeMfExport';
import Viewport from '../components/Viewport';
import PropertiesPanel from '../components/PropertiesPanel';
import PreviewWindow from '../components/PreviewWindow';
import '../styles/app.css';

const primitiveButtons: { type: PrimitiveType; label: string; Icon: LucideIcon }[] = [
  { type: 'box', label: 'Куб', Icon: Box },
  { type: 'sphere', label: 'Сфера', Icon: Circle },
  { type: 'cylinder', label: 'Цилиндр', Icon: Cylinder },
  { type: 'cone', label: 'Конус', Icon: Cone },
  { type: 'torus', label: 'Тор', Icon: Donut },
  { type: 'capsule', label: 'Капсула', Icon: Pill },
  { type: 'pyramid', label: 'Пирамида', Icon: Triangle },
  { type: 'prism', label: 'Призма', Icon: Hexagon },
];

export default function App() {
  const projectName = useEditorStore((state) => state.projectName);
  const objects = useEditorStore((state) => state.objects);
  const selectedId = useEditorStore((state) => state.selectedId);
  const transformMode = useEditorStore((state) => state.transformMode);
  const addPrimitive = useEditorStore((state) => state.addPrimitive);
  const selectObject = useEditorStore((state) => state.selectObject);
  const deleteSelected = useEditorStore((state) => state.deleteSelected);
  const duplicateSelected = useEditorStore((state) => state.duplicateSelected);
  const setTransformMode = useEditorStore((state) => state.setTransformMode);
  const toggleLockSelected = useEditorStore((state) => state.toggleLockSelected);
  const toggleHoleSelected = useEditorStore((state) => state.toggleHoleSelected);
  const getProject = useEditorStore((state) => state.getProject);
  const loadProjectIntoStore = useEditorStore((state) => state.loadProject);
  const [saveStatus, setSaveStatus] = useState('Локальный проект');
  const [previewOpen, setPreviewOpen] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const selectedObject = objects.find((object) => object.id === selectedId);
  const selectedLocked = Boolean(selectedObject?.locked);

  useEffect(() => {
    document.documentElement.dataset.theme = 'dark';
  }, []);

  useEffect(() => {
    let active = true;
    loadProject().then((project) => {
      if (active && project) loadProjectIntoStore(project);
    }).catch(() => setSaveStatus('Локальное хранилище недоступно'));
    return () => { active = false; };
  }, [loadProjectIntoStore]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      saveProject(getProject())
        .then(() => setSaveStatus('Автосохранение выполнено'))
        .catch(() => setSaveStatus('Не удалось сохранить локально'));
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [objects, getProject]);

  const downloadProject = () => {
    const data = JSON.stringify(getProject(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'project.3dcc';
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const openProject = async (file?: File) => {
    if (!file) return;
    try {
      const project = JSON.parse(await file.text()) as ProjectDocument;
      if (project.schemaVersion !== 1 || project.units !== 'mm' || !Array.isArray(project.objects)) {
        throw new Error('Unsupported project schema');
      }
      loadProjectIntoStore(project);
      setSaveStatus('Проект открыт');
    } catch {
      setSaveStatus('Не удалось открыть файл проекта');
    }
  };

  const safeName = projectName.trim().replace(/[^a-z0-9а-яё_-]+/gi, '-').replace(/^-+|-+$/g, '') || '3dcorpcod-model';

  const handleExport = (format: 'stl' | '3mf') => {
    if (!objects.some((object) => object.visible && !object.hole)) {
      setSaveStatus('Нет видимых тел для экспорта');
      return;
    }
    try {
      if (format === 'stl') exportObjectsAsStl(objects, `${safeName}.stl`);
      else exportObjectsAs3mf(objects, `${safeName}.3mf`);
      setSaveStatus(`Экспорт ${format.toUpperCase()} выполнен`);
    } catch (error) {
      console.error(`Export ${format} failed`, error);
      setSaveStatus(error instanceof Error ? error.message : `Ошибка экспорта ${format.toUpperCase()}`);
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')) return;

      const command = event.ctrlKey || event.metaKey;
      if (command && event.key.toLowerCase() === 's') {
        event.preventDefault();
        downloadProject();
      } else if (command && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        importRef.current?.click();
      } else if (command && event.key.toLowerCase() === 'd' && selectedId) {
        event.preventDefault();
        duplicateSelected();
      } else if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) {
        event.preventDefault();
        deleteSelected();
      } else if (event.key === 'Escape' && previewOpen) {
        setPreviewOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [deleteSelected, downloadProject, duplicateSelected, selectedId, previewOpen]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark">3D</div>
        <div className="brand-copy"><strong>3DCorpCod</strong><span>3D MODELING STUDIO</span></div>
        <div className="top-divider" />
        <div className="project-title">{projectName}</div>
        <div className="top-actions">
          <button className="icon-button" title="Открыть проект" onClick={() => importRef.current?.click()}><FolderOpen size={17} /><span>Открыть</span></button>
          <button className="icon-button" title="Сохранить проект" onClick={downloadProject}><Save size={17} /><span>Проект</span></button>
          <button className="icon-button" title="Предпросмотр готовой модели" onClick={() => setPreviewOpen(true)}><Eye size={17} /><span>Предпросмотр</span></button>
          <button className="icon-button" title="Скачать STL" onClick={() => handleExport('stl')}><Download size={17} /><span>STL</span></button>
          <button className="icon-button" title="Скачать 3MF" onClick={() => handleExport('3mf')}><Download size={17} /><span>3MF</span></button>
          <input ref={importRef} className="hidden-input" type="file" accept=".3dcc,.json,application/json" onChange={(event) => { void openProject(event.target.files?.[0]); event.target.value = ''; }} />
        </div>
      </header>

      <div className="workspace">
        <aside className="leftbar panel">
          <div className="panel-heading">Создать объект</div>
          <div className="primitive-grid">
            {primitiveButtons.map(({ type, label, Icon }) => (
              <button key={type} className="primitive-button" onClick={() => addPrimitive(type)}>
                <Icon size={22} strokeWidth={1.6} /><span>{label}</span>
              </button>
            ))}
          </div>
          <div className="panel-heading object-heading">Объекты сцены <span className="count">{objects.length}</span></div>
          <div className="object-list">
            {objects.map((object) => (
              <button key={object.id} className={`object-row ${selectedId === object.id ? 'selected' : ''}`} onClick={() => selectObject(object.id)}>
                <span className={`object-dot ${object.hole ? 'hole-dot' : ''}`} />
                <span className="object-name">{object.name}{object.hole ? ' · отверстие' : ''}</span>
                {object.locked && <Lock size={13} className="row-lock" aria-label="Заблокирован" />}
              </button>
            ))}
            {objects.length === 0 && <p className="muted empty-hint">Сцена пуста. Добавь фигуру, чтобы начать.</p>}
          </div>
          <div className="object-actions">
            <button className="small-action" disabled={!selectedId || selectedLocked} onClick={duplicateSelected}><Copy size={15} /> Дублировать</button>
            <button className="small-action danger-action" disabled={!selectedId || selectedLocked} onClick={deleteSelected}><Trash2 size={15} /> Удалить</button>
          </div>
          <div className="leftbar-bottom">
            <button className="new-project-button" onClick={() => {
              if (window.confirm('Создать пустую сцену? Убедись, что текущий проект сохранён.')) {
                loadProjectIntoStore({ schemaVersion: 1, name: 'Безымянный проект', units: 'mm', objects: [], updatedAt: new Date().toISOString() });
              }
            }}><FilePlus2 size={16} /> Новая сцена</button>
          </div>
        </aside>

        <section className="center-stage">
          <div className="transform-toolbar" role="toolbar" aria-label="Инструменты трансформации">
            <span className="toolbar-caption">ИНСТРУМЕНТ</span>
            <button className={`tool-button ${transformMode === 'translate' ? 'active' : ''}`} onClick={() => setTransformMode('translate')} disabled={!selectedId || selectedLocked} aria-pressed={transformMode === 'translate'}><Move size={15} /> Перемещение</button>
            <button className={`tool-button ${transformMode === 'rotate' ? 'active' : ''}`} onClick={() => setTransformMode('rotate')} disabled={!selectedId || selectedLocked} aria-pressed={transformMode === 'rotate'}><RotateCw size={15} /> Вращение</button>
            <button className={`tool-button ${transformMode === 'scale' ? 'active' : ''}`} onClick={() => setTransformMode('scale')} disabled={!selectedId || selectedLocked} aria-pressed={transformMode === 'scale'}><Scaling size={15} /> Масштаб</button>
            <button className={`tool-button ${selectedLocked ? 'active' : ''}`} onClick={toggleLockSelected} disabled={!selectedId} aria-pressed={selectedLocked} title={selectedLocked ? 'Разблокировать объект' : 'Заблокировать все изменения'}>
              {selectedLocked ? <UnlockKeyhole size={15} /> : <LockKeyhole size={15} />}{selectedLocked ? 'Разблокировать' : 'Заблокировать'}
            </button>
            <button className={`tool-button ${selectedObject?.hole ? 'active' : ''}`} onClick={toggleHoleSelected} disabled={!selectedId || selectedLocked} aria-pressed={Boolean(selectedObject?.hole)} title="Вычитать этот объект из пересекающихся тел">
              <CircleSlash size={15} />{selectedObject?.hole ? 'Режим отверстия' : 'Сделать отверстием'}
            </button>
            <button className="tool-button" onClick={() => setPreviewOpen(true)}><Eye size={15} /> Предпросмотр</button>
          </div>
          <Viewport />
          <footer className="statusbar"><span><i className="status-indicator" /> {saveStatus}</span><span>{objects.length} объектов</span><span>Единицы: мм</span></footer>
        </section>

        <PropertiesPanel />
      </div>
      {previewOpen && <PreviewWindow objects={objects} onClose={() => setPreviewOpen(false)} />}
    </main>
  );
}
