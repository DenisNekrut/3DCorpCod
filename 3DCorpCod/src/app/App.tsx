import { useEffect, useRef, useState } from 'react';
import { Box, Circle, Cylinder, Cone, Copy, Download, FilePlus2, FolderOpen, Moon, Save, Sun, Trash2 } from 'lucide-react';
import { useEditorStore } from '../editor/store';
import type { PrimitiveType, ProjectDocument } from '../editor/types';
import { loadProject, saveProject } from '../storage/projectStorage';
import Viewport from '../components/Viewport';
import PropertiesPanel from '../components/PropertiesPanel';
import '../styles/app.css';

const primitiveButtons: { type: PrimitiveType; label: string; Icon: typeof Box }[] = [
  { type: 'box', label: 'Куб', Icon: Box },
  { type: 'sphere', label: 'Сфера', Icon: Circle },
  { type: 'cylinder', label: 'Цилиндр', Icon: Cylinder },
  { type: 'cone', label: 'Конус', Icon: Cone },
];

export default function App() {
  const projectName = useEditorStore((state) => state.projectName);
  const objects = useEditorStore((state) => state.objects);
  const selectedId = useEditorStore((state) => state.selectedId);
  const theme = useEditorStore((state) => state.theme);
  const addPrimitive = useEditorStore((state) => state.addPrimitive);
  const selectObject = useEditorStore((state) => state.selectObject);
  const deleteSelected = useEditorStore((state) => state.deleteSelected);
  const duplicateSelected = useEditorStore((state) => state.duplicateSelected);
  const toggleTheme = useEditorStore((state) => state.toggleTheme);
  const getProject = useEditorStore((state) => state.getProject);
  const loadProjectIntoStore = useEditorStore((state) => state.loadProject);
  const [saveStatus, setSaveStatus] = useState('Локальный проект');
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

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
    URL.revokeObjectURL(url);
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

  const exportScene = () => {
    setSaveStatus('Экспорт STL подключается на следующем этапе');
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark">3D</div>
        <div className="brand-copy"><strong>3DCorpCod</strong><span>3D MODELING STUDIO</span></div>
        <div className="top-divider" />
        <div className="project-title">{projectName}</div>
        <div className="top-actions">
          <button className="icon-button" title="Открыть проект" onClick={() => importRef.current?.click()}><FolderOpen size={17} /><span>Открыть</span></button>
          <button className="icon-button" title="Сохранить проект" onClick={downloadProject}><Save size={17} /><span>Сохранить</span></button>
          <button className="icon-button" title="Экспорт STL" onClick={exportScene}><Download size={17} /><span>Экспорт STL</span></button>
          <button className="icon-button theme-button" title="Переключить тему" onClick={toggleTheme}>{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</button>
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
                <span className="object-dot" /><span className="object-name">{object.name}</span>
              </button>
            ))}
            {objects.length === 0 && <p className="muted empty-hint">Сцена пуста. Добавь фигуру, чтобы начать.</p>}
          </div>
          <div className="object-actions">
            <button className="small-action" disabled={!selectedId} onClick={duplicateSelected}><Copy size={15} /> Дублировать</button>
            <button className="small-action danger-action" disabled={!selectedId} onClick={deleteSelected}><Trash2 size={15} /> Удалить</button>
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
          <Viewport />
          <footer className="statusbar"><span><i className="status-indicator" /> {saveStatus}</span><span>{objects.length} объектов</span><span>Единицы: мм</span></footer>
        </section>

        <PropertiesPanel />
      </div>
    </main>
  );
}