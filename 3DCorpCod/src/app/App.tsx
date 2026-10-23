import { useEffect, useRef, useState } from 'react';
import {
  Box, Circle, Cylinder, Cone, Donut, Pill, Triangle, Hexagon, Copy, Download, Ruler,
  FilePlus2, FolderOpen, Save, Trash2, Move, RotateCw, Scaling, LockKeyhole,
  Unlock, CircleSlash, Eye, Lock, Type, Undo2, Redo2, Magnet, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal, FlipHorizontal, Group, Ungroup, Github, Plus, ArrowRight, CloudUpload,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Vector3 } from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { useEditorStore } from '../editor/store';
import { inspectPrintability } from '../editor/printability';
import type { ModelObject, PrimitiveType, ProjectDocument } from '../editor/types';
import { loadProject, saveProject } from '../storage/projectStorage';
import { exportObjectsAsStl } from '../export/stlExport';
import { exportObjectsAs3mf } from '../export/threeMfExport';
import { exportObjectsAsObj } from '../export/objExport';
import Viewport from '../components/Viewport';
import PropertiesPanel from '../components/PropertiesPanel';
import PreviewWindow from '../components/PreviewWindow';
import '../styles/app.css';

const primitiveButtons: { type: PrimitiveType; label: string; hint: string; Icon: LucideIcon }[] = [
  { type: 'box', label: 'Бокс', hint: 'Прямоугольное тело', Icon: Box },
  { type: 'sphere', label: 'Сфера', hint: 'Округлое тело', Icon: Circle },
  { type: 'cylinder', label: 'Цилиндр', hint: 'Круглое тело с плоскими основаниями', Icon: Cylinder },
  { type: 'cone', label: 'Конус', hint: 'Круглое основание и вершина', Icon: Cone },
  { type: 'torus', label: 'Тор', hint: 'Кольцо с круглым сечением', Icon: Donut },
  { type: 'capsule', label: 'Капсула', hint: 'Цилиндр со скруглёнными концами', Icon: Pill },
  { type: 'pyramid', label: 'Пирамида', hint: 'Четыре боковые грани', Icon: Triangle },
  { type: 'prism', label: 'Треугольная призма', hint: 'Треугольные основания', Icon: Hexagon },
  { type: 'text', label: '3D-текст', hint: 'Объёмная надпись', Icon: Type },
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
  const copySelected = useEditorStore((state) => state.copySelected);
  const pasteCopied = useEditorStore((state) => state.pasteCopied);
  const setTransformMode = useEditorStore((state) => state.setTransformMode);
  const toggleLockSelected = useEditorStore((state) => state.toggleLockSelected);
  const toggleHoleSelected = useEditorStore((state) => state.toggleHoleSelected);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const undoStack = useEditorStore((state) => state.undoStack);
  const redoStack = useEditorStore((state) => state.redoStack);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const gridSnap = useEditorStore((state) => state.gridSnap);
  const toggleGridSnap = useEditorStore((state) => state.toggleGridSnap);
  const alignSelected = useEditorStore((state) => state.alignSelected);
  const mirrorSelected = useEditorStore((state) => state.mirrorSelected);
  const groupSelected = useEditorStore((state) => state.groupSelected);
  const ungroupSelected = useEditorStore((state) => state.ungroupSelected);
  const booleanSelected = useEditorStore((state) => state.booleanSelected);
  const toggleSelectObject = useEditorStore((state) => state.toggleSelectObject);
  const addObjectFromPreset = useEditorStore((state) => state.addObjectFromPreset);
  const getProject = useEditorStore((state) => state.getProject);
  const loadProjectIntoStore = useEditorStore((state) => state.loadProject);
  const [saveStatus, setSaveStatus] = useState('Локальный проект');
  const [screen, setScreen] = useState<'home' | 'editor'>('home');
  const [recentProjects, setRecentProjects] = useState<ProjectDocument[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [rulerEnabled, setRulerEnabled] = useState(false);
  const [customPresets, setCustomPresets] = useState<ModelObject[]>([]);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const selectedObject = objects.find((object) => object.id === selectedId);
  const selectedLocked = Boolean(selectedObject?.locked);
  const printWarnings = inspectPrintability(objects).map((warning) => `${warning.objectName}: ${warning.message}`);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('3dcc-recent-projects-v1');
      if (saved) setRecentProjects(JSON.parse(saved) as ProjectDocument[]);
    } catch { setRecentProjects([]); }
  }, []);

  useEffect(() => {
    if (screen !== 'editor') return;
    const timeout = window.setTimeout(() => {
      const project = getProject();
      try {
        const saved = localStorage.getItem('3dcc-recent-projects-v1');
        const previous = saved ? JSON.parse(saved) as ProjectDocument[] : [];
        const next = [project, ...previous.filter((item) => item.name !== project.name)].slice(0, 8);
        localStorage.setItem('3dcc-recent-projects-v1', JSON.stringify(next));
        setRecentProjects(next);
      } catch { /* recent-project list is optional */ }
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [objects, projectName, getProject, screen]);
  useEffect(() => {
    document.documentElement.dataset.theme = 'dark';
    try {
      const stored = localStorage.getItem('3dcc-shape-library-v1');
      if (stored) setCustomPresets(JSON.parse(stored) as ModelObject[]);
    } catch { setCustomPresets([]); }
    setLibraryLoaded(true);
  }, []);

  useEffect(() => {
    if (!libraryLoaded) return;
    try { localStorage.setItem('3dcc-shape-library-v1', JSON.stringify(customPresets)); } catch { /* browser storage may be unavailable */ }
  }, [customPresets, libraryLoaded]);

  const saveSelectedToLibrary = () => {
    if (!selectedObject) return;
    const name = window.prompt('Название фигуры в библиотеке:', selectedObject.name);
    if (!name?.trim()) return;
    setCustomPresets((items) => [...items, { ...selectedObject, id: crypto.randomUUID(), name: name.trim(), position: [0, selectedObject.dimensions[1] / 2, 0], locked: false, booleanSource: false, booleanOperation: undefined, groupId: undefined }]);
  };

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

  const downloadSelectedObject = () => {
    if (!selectedObject) {
      setSaveStatus('Сначала выбери объект');
      return;
    }
    const payload = {
      schemaVersion: 1,
      name: selectedObject.name,
      units: 'mm',
      object: selectedObject,
      author: 'Некрут Денис',
      updatedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = selectedObject.name.trim().replace(/[^a-z0-9а-яё_-]+/gi, '-') + '.3dobject.json';
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setSaveStatus('Объект сохранён в файл');
  };

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
      if (file.name.toLowerCase().endsWith('.stl')) {
        const loader = new STLLoader();
        const geometry = loader.parse(await file.arrayBuffer());
        geometry.computeBoundingBox();
        const bounds = geometry.boundingBox;
        const attribute = geometry.getAttribute('position');
        if (!bounds || attribute.count < 3 || attribute.count % 3 !== 0) {
          geometry.dispose();
          throw new Error('STL does not contain valid triangles');
        }
        const size = bounds.getSize(new Vector3());
        const dimensions: [number, number, number] = [
          Math.max(0.1, size.x), Math.max(0.1, size.y), Math.max(0.1, size.z),
        ];
        const center = bounds.getCenter(new Vector3());
        geometry.translate(-center.x, -center.y, -center.z);
        const positions: number[] = [];
        const centered = geometry.getAttribute('position');
        for (let index = 0; index < centered.count; index++) {
          positions.push(
            centered.getX(index) / dimensions[0],
            centered.getY(index) / dimensions[1],
            centered.getZ(index) / dimensions[2],
          );
        }
        geometry.dispose();
        const imported: ModelObject = {
          id: crypto.randomUUID(),
          name: file.name.replace(/\.stl$/i, '') || 'Импортированная модель',
          type: 'mesh',
          position: [0, dimensions[1] / 2, 0],
          rotation: [0, 0, 0],
          dimensions,
          customGeometry: { positions },
          visible: true,
          color: '#8295b2',
          layer: 'Импорт',
        };
        loadProjectIntoStore({
          schemaVersion: 1,
          name: file.name.replace(/\.stl$/i, '') || 'Импортированная модель',
          units: 'mm',
          objects: [imported],
          updatedAt: new Date().toISOString(),
        });
        setScreen('editor');
        setSaveStatus('STL импортирован; проверь масштаб и единицы исходной модели');
        return;
      }
      const project = JSON.parse(await file.text()) as ProjectDocument;
      if (project.schemaVersion !== 1 || project.units !== 'mm' || !Array.isArray(project.objects)) {
        throw new Error('Unsupported project schema');
      }
      loadProjectIntoStore(project);
      setScreen('editor');
      setSaveStatus('Проект открыт');
    } catch {
      setSaveStatus('Не удалось открыть проект или STL-файл');
    }
  };

  const safeName = projectName.trim().replace(/[^a-z0-9а-яё_-]+/gi, '-').replace(/^-+|-+$/g, '') || '3dcorpcod-model';

  const saveToGitHub = async () => {
    try {
      let tokenValue = sessionStorage.getItem('3dcc-github-token');
      if (!tokenValue) {
        const entered = window.prompt('Вставь GitHub Personal Access Token с правом Contents: Read and write. Токен хранится только в текущей сессии браузера:');
        if (!entered?.trim()) return;
        tokenValue = entered.trim();
        sessionStorage.setItem('3dcc-github-token', tokenValue);
      }
      const token = tokenValue;
      const repository = (window.prompt('Репозиторий GitHub в формате владелец/репозиторий:', 'DenisNekrut/3DCorpCod') ?? '').trim();
      if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
        setSaveStatus('Укажи репозиторий в формате владелец/репозиторий');
        return;
      }
      const path = 'projects/' + safeName + '.3dcc';
      const url = 'https://api.github.com/repos/' + repository + '/contents/' + path.split('/').map(encodeURIComponent).join('/');
      const headers = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
      const existing = await fetch(url, { headers });
      let sha: string | undefined;
      if (existing.ok) sha = ((await existing.json()) as { sha?: string }).sha;
      else if (existing.status !== 404) throw new Error('GitHub: ' + existing.status + ' — проверь токен и права доступа');
      const bytes = new TextEncoder().encode(JSON.stringify(getProject(), null, 2));
      let binary = '';
      for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      const response = await fetch(url, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Save 3DCorpCod project: ' + projectName, content: btoa(binary), ...(sha ? { sha } : {}) }),
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(detail.message ?? 'GitHub: ' + response.status);
      }
      setSaveStatus('Сохранено в GitHub: ' + repository + '/' + path);
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : 'Не удалось сохранить в GitHub');
    }
  };


  const handleExport = (format: 'stl' | '3mf' | 'obj') => {
    if (!objects.some((object) => object.visible && !object.hole && !object.booleanSource)) {
      setSaveStatus('Нет видимых тел для экспорта');
      return;
    }
    try {
      if (format === 'stl') exportObjectsAsStl(objects, `${safeName}.stl`);
      else if (format === '3mf') exportObjectsAs3mf(objects, `${safeName}.3mf`);
      else exportObjectsAsObj(objects, `${safeName}.obj`);
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
      } else if (command && event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault(); undo();
      } else if (command && (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey))) {
        event.preventDefault(); redo();
      } else if (command && event.key.toLowerCase() === 'c' && selectedId) {
        event.preventDefault(); copySelected();
      } else if (command && event.key.toLowerCase() === 'v') {
        event.preventDefault(); pasteCopied();
      } else if (command && event.key.toLowerCase() === 'd' && selectedId) {
        event.preventDefault();
        duplicateSelected();
      } else if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) {
        event.preventDefault();
        deleteSelected();
      } else if (event.key === '1') {
        setTransformMode('translate');
      } else if (event.key === '2') {
        setTransformMode('rotate');
      } else if (event.key === '3') {
        setTransformMode('scale');
      } else if (event.key.toLowerCase() === 'g' && !command) {
        toggleGridSnap();
      } else if (event.key === 'Escape' && previewOpen) {
        setPreviewOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [deleteSelected, downloadProject, duplicateSelected, copySelected, pasteCopied, selectedId, previewOpen, undo, redo, setTransformMode, toggleGridSnap]);

  const createNewProject = () => {
    const name = window.prompt('Название нового проекта:', 'Новый проект');
    if (!name?.trim()) return;
    loadProjectIntoStore({ schemaVersion: 1, name: name.trim(), units: 'mm', objects: [], updatedAt: new Date().toISOString() });
    setScreen('editor');
    setSaveStatus('Новый проект');
  };

  const deleteRecentProject = (project: ProjectDocument) => {
    const confirmed = window.confirm(`Удалить проект «${project.name}» из списка недавних проектов этого браузера? Скачанные файлы и копии в GitHub не будут удалены.`);
    if (!confirmed) return;
    setRecentProjects((current) => {
      const next = current.filter((item) => !(item.name === project.name && item.updatedAt === project.updatedAt));
      try { localStorage.setItem('3dcc-recent-projects-v1', JSON.stringify(next)); } catch { /* storage may be unavailable */ }
      return next;
    });
  };

  if (screen === 'home') {
    return (
      <main className="home-shell">
        <header className="home-topbar">
          <div className="brand-mark">3D</div>
          <div className="brand-copy"><strong>3DCorpCod</strong><span>3D MODELING STUDIO · АВТОР НЕКРУТ ДЕНИС</span></div>
          <span className="home-version">ПРОЕКТЫ · 3D-ПЕЧАТЬ · ММ</span>
        </header>
        <section className="home-hero">
          <div className="home-eyebrow">ПРОСТРАНСТВО ДЛЯ СОЗДАНИЯ</div>
          <h1>Твои модели.<br /><span>Точная геометрия.</span></h1>
          <p>Создавай 3D-модели, редактируй размеры с точностью 0,1 мм и экспортируй их для 3D-печати.</p>
          <div className="home-actions">
            <button className="home-primary" onClick={createNewProject}><Plus size={18} /> Новый проект</button>
            <button className="home-secondary" onClick={() => importRef.current?.click()}><FolderOpen size={17} /> Открыть файл</button>
            <button className="home-secondary" onClick={() => setScreen('editor')}><ArrowRight size={17} /> Продолжить работу</button>
          </div>
          <input ref={importRef} className="hidden-input" type="file" accept=".3dcc,.json,.stl,application/json,model/stl" onChange={(event) => { void openProject(event.target.files?.[0]); event.target.value = ''; }} />
        </section>
        <section className="home-projects">
          <div className="home-section-title"><div><span>ТВОЯ КОЛЛЕКЦИЯ</span><h2>Недавние проекты</h2></div><span className="home-project-count">{recentProjects.length} / 8</span></div>
          {recentProjects.length ? (
            <div className="home-project-grid">
              {recentProjects.map((project, index) => (
                <article className="home-project-card" key={project.name + project.updatedAt + index}>
                  <button className="home-project-open" onClick={() => { loadProjectIntoStore(project); setScreen('editor'); setSaveStatus('Проект открыт'); }} aria-label={`Открыть проект ${project.name}`}>
                    <div className="home-project-preview"><div className="preview-cube" /><span>{project.objects.length} объектов</span></div>
                    <div className="home-project-info"><strong>{project.name}</strong><span>Изменён: {new Date(project.updatedAt).toLocaleDateString()}</span></div>
                    <ArrowRight size={16} />
                  </button>
                  <button className="home-project-delete" onClick={() => deleteRecentProject(project)} title={`Удалить ${project.name} из недавних`} aria-label={`Удалить проект ${project.name}`}><Trash2 size={15} /><span>Удалить</span></button>
                </article>
              ))}
            </div>
          ) : <div className="home-empty"><Box size={28} /><strong>Пока нет сохранённых проектов</strong><span>Создай проект — он появится здесь автоматически.</span></div>}
          <div className="home-storage-note"><CloudUpload size={16} /> Проекты сохраняются в браузере. Из редактора их можно сохранить в GitHub или скачать файлом.</div>
        </section>
      </main>
    );
  }
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark">3D</div>
        <div className="brand-copy"><strong>3DCorpCod</strong><span>3D MODELING STUDIO · АВТОР НЕКРУТ ДЕНИС</span></div>
        <div className="top-divider" />
        <div className="project-title">{projectName}</div>
        <div className="top-actions">
          <button className="icon-button" title="Отменить (Ctrl+Z)" onClick={undo} disabled={!undoStack.length}><Undo2 size={17} /><span>Отменить</span></button>
          <button className="icon-button" title="Повторить (Ctrl+Y)" onClick={redo} disabled={!redoStack.length}><Redo2 size={17} /><span>Повторить</span></button>
          <button className="icon-button" title="Открыть проект" onClick={() => importRef.current?.click()}><FolderOpen size={17} /><span>Открыть</span></button>
          <button className="icon-button" title="Скачать проект" onClick={downloadProject}><Save size={17} /><span>Скачать</span></button>
          <button className="icon-button" title="Сохранить выбранный объект отдельным файлом" disabled={!selectedObject} onClick={downloadSelectedObject}><Download size={17} /><span>Объект</span></button>
          <button className="icon-button" title="Сохранить проект в GitHub" onClick={() => void saveToGitHub()}><Github size={17} /><span>GitHub</span></button>
          <button className="icon-button" title="На главную страницу проектов" onClick={() => setScreen('home')}><FolderOpen size={17} /><span>Главная</span></button>
          <button className="icon-button" title="Предпросмотр готовой модели" onClick={() => setPreviewOpen(true)}><Eye size={17} /><span>Предпросмотр</span></button>
          <button className="icon-button" title="Скачать STL" onClick={() => handleExport('stl')}><Download size={17} /><span>STL</span></button>
          <button className="icon-button" title="Скачать 3MF" onClick={() => handleExport('3mf')}><Download size={17} /><span>3MF</span></button>
          <button className="icon-button" title="Экспортировать модель в OBJ" onClick={() => handleExport('obj')}><Download size={17} /><span>OBJ</span></button>
          <input ref={importRef} className="hidden-input" type="file" accept=".3dcc,.json,.stl,application/json,model/stl" onChange={(event) => { void openProject(event.target.files?.[0]); event.target.value = ''; }} />
        </div>
      </header>

      <div className="workspace">
        <aside className="leftbar panel">
          <div className="panel-heading">Фигуры <span className="count">9</span></div>
          <div className="primitive-grid">
            {primitiveButtons.map(({ type, label, hint, Icon }) => (
              <button key={type} className="primitive-button" onClick={() => addPrimitive(type)} title={hint} aria-label={`Добавить: ${hint}`}>
                <Icon size={24} strokeWidth={1.6} /><span>{label}</span>
              </button>
            ))}
          </div>
          <div className="panel-heading object-heading">Моя библиотека <span className="count">{customPresets.length}</span></div>
          {customPresets.map((preset) => (
            <button key={preset.id} className="object-row" onClick={() => addObjectFromPreset(preset)} title="Добавить копию в сцену">
              <span className="object-dot" style={{ background: preset.color ?? '#8295b2' }} />
              <span className="object-name">{preset.name}</span><span className="muted">+</span>
            </button>
          ))}
          <div className="object-actions"><button className="small-action" disabled={!selectedId || selectedLocked} onClick={saveSelectedToLibrary}>Сохранить выбранное в библиотеку</button></div>
          <div className="panel-heading object-heading">Объекты сцены <span className="count">{objects.length}</span></div>
          <div className="object-list">
            {objects.map((object) => (
              <button key={object.id} className={`object-row ${selectedId === object.id ? 'selected' : ''}`} onClick={(event) => event.shiftKey ? toggleSelectObject(object.id) : selectObject(object.id)} title={object.groupId ? 'Группа объектов' : undefined}>
                <span className={`object-dot ${object.hole ? 'hole-dot' : ''}`} style={{ background: object.hole ? undefined : object.color ?? '#8295b2' }} />
                <span className="object-name">{object.name}{object.hole ? ' · отверстие' : ''}</span>
                {object.locked && <Lock size={13} className="row-lock" aria-label="Заблокирован" />}
              </button>
            ))}
            {objects.length === 0 && <p className="muted empty-hint">Сцена пуста. Добавь фигуру, чтобы начать.</p>}
          </div>
          <div className="object-actions">
            <button className="small-action" disabled={!selectedId || selectedLocked} onClick={duplicateSelected}><Copy size={15} /> Дублировать</button>
            <button className="small-action" disabled={selectedIds.length < 2} onClick={groupSelected}><Group size={15} /> Группа</button>
            <button className="small-action" disabled={!selectedIds.length || !objects.some((object) => selectedIds.includes(object.id) && object.groupId)} onClick={ungroupSelected}><Ungroup size={15} /> Разгрупп.</button>
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
              {selectedLocked ? <Unlock size={15} /> : <LockKeyhole size={15} />}{selectedLocked ? 'Разблокировать' : 'Заблокировать'}
            </button>
            <button className={`tool-button ${selectedObject?.hole ? 'active' : ''}`} onClick={toggleHoleSelected} disabled={!selectedId || selectedLocked} aria-pressed={Boolean(selectedObject?.hole)} title="Вычитать этот объект из пересекающихся тел">
              <CircleSlash size={15} />{selectedObject?.hole ? 'Режим отверстия' : 'Сделать отверстием'}
            </button>
            <button className={`tool-button ${gridSnap ? 'active' : ''}`} onClick={toggleGridSnap} aria-pressed={gridSnap} title="Шаг привязки 0,1 мм"><Magnet size={15} /> Привязка {gridSnap ? 'вкл.' : 'выкл.'}</button>
            <button className={`tool-button ${rulerEnabled ? 'active' : ''}`} onClick={() => setRulerEnabled((enabled) => !enabled)} aria-pressed={rulerEnabled} title="Измерить расстояние между двумя точками на рабочей плоскости"><Ruler size={15} /> Линейка {rulerEnabled ? 'вкл.' : 'выкл.'}</button>
            <button className="tool-button" disabled={selectedIds.length < 2} onClick={() => alignSelected(0, 'min')} title="Выровнять по краю X"><AlignStartHorizontal size={15} /> X min</button>
            <button className="tool-button" disabled={selectedIds.length < 2} onClick={() => alignSelected(0, 'center')} title="Выровнять по центру X"><AlignCenterHorizontal size={15} /> X центр</button>
            <button className="tool-button" disabled={selectedIds.length < 2} onClick={() => alignSelected(1, 'center')} title="Выровнять по центру Y"><AlignCenterHorizontal size={15} /> Y центр</button>
            <button className="tool-button" disabled={selectedIds.length < 2} onClick={() => alignSelected(2, 'center')} title="Выровнять по центру Z"><AlignCenterHorizontal size={15} /> Z центр</button>
            <button className="tool-button" disabled={selectedIds.length < 2} onClick={() => alignSelected(0, 'max')} title="Выровнять по краю X"><AlignEndHorizontal size={15} /> X max</button>
            <button className="tool-button" disabled={!selectedIds.length} onClick={() => mirrorSelected(0)} title="Отразить относительно центра выбора по X"><FlipHorizontal size={15} /> Отразить X</button>
            <button className="tool-button" disabled={!selectedIds.length} onClick={() => mirrorSelected(1)} title="Отразить относительно центра выбора по Y"><FlipHorizontal size={15} /> Отразить Y</button>
            <button className="tool-button" disabled={!selectedIds.length} onClick={() => mirrorSelected(2)} title="Отразить относительно центра выбора по Z"><FlipHorizontal size={15} /> Отразить Z</button>
            <button className="tool-button" disabled={selectedIds.length < 2} onClick={() => booleanSelected('union')} title="Объединить выбранные тела"><span aria-hidden="true">∪</span> Объединить</button>
            <button className="tool-button" disabled={selectedIds.length < 2} onClick={() => booleanSelected('subtract')} title="Вычесть остальные выбранные тела из активного"><span aria-hidden="true">−</span> Вычесть</button>
            <button className="tool-button" disabled={selectedIds.length < 2} onClick={() => booleanSelected('intersect')} title="Оставить только общую часть выбранных тел"><span aria-hidden="true">∩</span> Пересечение</button>
            <button className="tool-button" onClick={() => setPreviewOpen(true)}><Eye size={15} /> Предпросмотр</button>
          </div>
          <Viewport rulerEnabled={rulerEnabled} />
          <footer className="statusbar"><span><i className="status-indicator" /> {saveStatus}</span><span>{objects.length} объектов</span><span title={printWarnings.join('\n')}>{printWarnings.length ? `⚠ Проверка печати: ${printWarnings.length}` : '✓ Геометрия: базовая проверка пройдена'}</span><span>Единицы: мм</span></footer>
        </section>

        <PropertiesPanel />
      </div>
      {previewOpen && <PreviewWindow objects={objects} onClose={() => setPreviewOpen(false)} />}
    </main>
  );
}
