# 3DCorpCod

Браузерный редактор 3D-моделей. Текущий этап — архитектурный каркас и первый прототип рабочей области.

## Требования

- Node.js 20.19+ или 22.12+
- npm

## Запуск

```bash
npm install
npm run dev
```

Для проверки production-сборки:

```bash
npm run build
npm run preview
```

## Текущая основа

- React + TypeScript + Vite
- Three.js + React Three Fiber + Drei
- Zustand для состояния редактора
- IndexedDB для локального сохранения проекта
- Отдельный модуль экспорта STL
- Светлая и тёмная темы
- Примитивы, базовые трансформации и панель свойств

## Архитектурные границы

- `src/app` — композиция приложения.
- `src/editor` — модель данных и состояние редактора.
- `src/geometry` — геометрические операции и проверки.
- `src/storage` — локальное хранилище проектов.
- `src/export` — экспортные форматы.
- `src/components` — интерфейсные компоненты.
- `src/styles` — темы и оформление.

## Важное ограничение прототипа

Это начальный каркас, а не законченный CAD-редактор. Булевы операции, полноценный объёмный текст, расширенная валидация сеток, экспорт выбранных объектов и интеграционные тесты будут добавляться отдельными этапами. Перед физической печатью экспортированные STL нужно проверять в слайсере.

## Windows portable application

The project is configured to package the desktop app as a Windows x64 portable executable (no installer):

```bash
npm install
npm run dist:win
```

The output is placed in `release/` as `3DCorpCod-Portable-0.1.0.exe`. On launch, Electron opens the bundled editor in its own window; no browser needs to be opened manually. The first build requires internet access to download npm packages and the Electron runtime. The executable itself is intended to run without a separate installation.

For local development after building the web interface:

```bash
npm run build
npm run desktop
```

Note: this packaging setup is a foundation, not a claim that all planned modeling features are implemented. Boolean operations, 3D text, connected STL export, and comprehensive mesh validation remain future implementation stages.
