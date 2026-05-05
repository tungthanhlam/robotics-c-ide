# 🤖 Robotics C IDE

A **VEXcode Go-style** visual block programming IDE that generates real C code for robotics projects.

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 🧩 Block palette | 30+ blocks across 6 categories |
| 🖱 Drag-and-drop | Drop blocks from palette onto canvas |
| ⚡ Real-time C code | Watch C code appear as you build |
| 🎨 Syntax highlighting | Color-coded C output |
| 💾 Project save/load | Persistent projects (backend or localStorage) |
| ↩↪ Undo/Redo | Full undo history |
| 📋 Copy/Download | Copy code or save as `.c` file |
| 📱 Responsive | Works on tablets and smaller screens |

---

## 🚀 Quick Start

### Option A – Open directly in browser (no backend)

```bash
open frontend/index.html
```

All features work without a backend. Projects are saved to `localStorage`.

### Option B – Run with backend server

```bash
cd backend
npm install
npm start
# Open http://localhost:3000
```

The backend enables:
- Project storage in a JSON file
- C code compilation via `gcc`

---

## 🗂 Project Structure

```
robotics-c-ide/
├── frontend/
│   ├── index.html           # Main IDE page
│   ├── css/
│   │   ├── style.css        # Global styles, layout, modals
│   │   ├── sidebar.css      # Block palette + code preview
│   │   ├── blocks.css       # Block elements
│   │   └── workspace.css    # Canvas area
│   └── js/
│       ├── utils.js         # Helper utilities
│       ├── api-client.js    # Backend API calls
│       ├── block-system.js  # Block definitions & palette
│       ├── code-generator.js# C code generation & highlighting
│       ├── workspace.js     # Drag/drop, undo/redo
│       ├── project-manager.js # Save/load projects
│       ├── ui-controller.js # Modals, buttons, shortcuts
│       ├── editor.js        # Editor orchestration
│       └── main.js          # Entry point
├── backend/
│   ├── server.js            # Express API server
│   ├── package.json
│   └── data/
│       └── blocks.json      # Block definitions (JSON)
├── examples/
│   └── hello_world.c
└── docs/
    └── API.md
```

---

## 🧩 Block Categories

| Category | Color | Description |
|----------|-------|-------------|
| Control  | 🟠 Orange | `if`, `for`, `while`, `break`, `return`, delay |
| Variables| 🔵 Blue   | `int`, `float`, `string`, `bool`, assign, array |
| Functions| 🟣 Purple | define function, call function, `main()` |
| I/O      | 🟢 Green  | `printf`, `scanf`, `#include` |
| Robotics | 🔴 Red    | motor, sensor, drive, turn, LED |
| Logic    | 🟡 Yellow | AND, OR, NOT, compare |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save project |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+N` | New project |
| `Ctrl+O` | Open project |
| `Esc`    | Close modal |

---

## 🔌 REST API (backend)

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/health`        | Server health check |
| GET    | `/api/blocks`        | Block definitions |
| GET    | `/api/projects`      | List projects |
| POST   | `/api/projects`      | Create project |
| GET    | `/api/projects/:id`  | Get project |
| PUT    | `/api/projects/:id`  | Update project |
| DELETE | `/api/projects/:id`  | Delete project |
| POST   | `/api/compile`       | Compile C code (requires `gcc`) |

---

## 📄 License

MIT – Use freely for educational and robotics projects.
