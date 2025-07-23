# ceramnote

**ceramnote** is a React + TypeScript single-page application for digitizing and annotating images of a physical ceramic tile database. It enables users to upload images, create and manage annotations, run AI-powered detection models, and export structured data for digital archiving or analysis.

---

## 🚀 Features

- **Image Upload & Navigation**
  - Upload one or multiple images of ceramic tiles.
  - Navigate between images using the custom scrollbar or keyboard shortcuts.
  - Visual indicator for annotation density per image.

- **Annotation Tools**
  - Draw, select, and edit bounding box annotations on images.
  - Inspector panel for editing annotation properties.
  - Copy/paste annotation fields for efficient data entry.

- **AI Model Integration**
  - Load ONNX models (e.g., YOLO) for automated detection of tiles or features.
  - Run inference on images to auto-generate annotations.
  - Support for custom user-uploaded ONNX models.

- **Annotation Management**
  - View, select, and delete annotations.
  - Keyboard navigation for rapid annotation review.
  - Annotation grid for spatial navigation.

- **Export Functionality**
  - Export all or current image annotations as a ZIP file.
  - ZIP includes cropped tile images and a JSON file with annotation data.

---

## 🖼️ Screenshots

<!--
Add screenshots here, e.g.:
![Main UI](docs/screenshot-main.png)
![Annotation Inspector](docs/screenshot-inspector.png)
-->

---

## 🛠️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

```bash
git clone https://github.com/yourusername/ceramnote.git
cd ceramnote
npm install
# or
yarn install
```

### Running the App

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📝 Usage Guide

### 1. Upload Images

- Click the **Filebar** at the top to upload one or more images of ceramic tiles.
- Use the **AnnotationScrollbar** (right panel) to navigate between images.

### 2. Annotate Tiles

- Use the **Toolbar** (left panel) to select annotation tools (rectangle, selector, etc.).
- Draw bounding boxes on the canvas to create annotations.
- Select an annotation to edit its properties in the **Inspector** (left panel).

### 3. AI-Assisted Annotation

- Load built-in or custom ONNX models via the Filebar.
- Click **Preprocess** or press <kbd>Space</kbd> to run detection models and auto-generate annotations.

### 4. Manage Annotations

- Use keyboard shortcuts for navigation:
  - <kbd>Ctrl</kbd> + <kbd>←</kbd>/<kbd>→</kbd>: Switch images
  - <kbd>←</kbd>/<kbd>→</kbd>/<kbd>↑</kbd>/<kbd>↓</kbd>: Navigate annotation grid
  - <kbd>Delete</kbd>: Delete selected annotation
- Copy/paste annotation fields using the Inspector.

### 5. Export Data

- Click **Export All** or **Export Current** in the Filebar.
- Progress is shown in a modal loading bar (with cancel option).
- Downloaded ZIP contains:
  - Cropped tile images (`images/`)
  - `annotations.json` with all annotation data

---

## ⚙️ Configuration

- Model files should be placed in the `/models` directory or uploaded via the UI.

---

## 🧩 Tech Stack

- **React** + **TypeScript**
- **Vite** (build tool)
- **TailwindCSS** (styling)
- **Radix UI** (UI primitives)
- **ONNX Runtime Web** (AI inference)
- **JSZip** (exporting ZIP files)
- **fast-average-color** (color analysis)
- Custom annotation and tool system

---

## 📦 Building for Production

```bash
npm run build
# or
yarn build
```
The output will be in the `dist/` directory.

## 📦 Usage with Docker

```bash
docker build -t ceramnote .
docker run -d --name ceramnote-container -p 80:80 ceramnote
```

---

## 📄 License

...TBA

---

## ✨ Acknowledgements

- [Radix UI](https://www.radix-ui.com/)
- [TailwindCSS](https://tailwindcss.com/)
- [ONNX Runtime](https://onnxruntime.ai/)
- [JSZip](https://stuk.github.io/jszip/)
- [fast-average-color](https://github.com/fast-average-color/fast-average-color)

---

**For questions or support, please open an issue on GitHub.**
