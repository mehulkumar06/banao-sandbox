# ⚡ Banao Sandbox

A browser-based coding environment built with the MERN stack. Write, run, and preview code entirely from the browser — no local setup required.

🔗 **Live Demo:** https://banao-sandbox.vercel.app  
🔗 **Backend API:** https://banao-sandbox-api.onrender.com

---

## 📸 Features

- **File Explorer** — Create, edit, and delete files and folders
- **Live Preview** — Sandpack-powered in-browser execution with real-time updates
- **Project Persistence** — All files and packages saved to MongoDB, restored on reload
- **npm Package Installer** — Add any npm package to your sandbox instantly
- **Real-time Sync** — Socket.io broadcasts file changes across browser tabs
- **Shareable URLs** — Every project has a unique URL you can share

---

## 🏗️ Architecture

### Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React + Vite | Fast dev server, modern tooling |
| Code Execution | Sandpack by CodeSandbox | Full in-browser bundler, no server needed |
| Backend | Node.js + Express | Lightweight REST API |
| Database | MongoDB Atlas | Document model fits file tree structure |
| Real-time | Socket.io | WebSocket rooms per project |
| Deployment | Vercel (FE) + Render (BE) | Free tier, zero DevOps |

### System Design
Browser (React)
│
├── Sandpack (in-browser bundler)
│       └── Runs code entirely client-side
│
├── REST API (Express)
│       ├── POST   /api/projects        → create project
│       ├── GET    /api/projects        → list all projects
│       ├── GET    /api/projects/:id    → load project
│       ├── PUT    /api/projects/:id    → full save
│       ├── PATCH  /api/projects/:id/files → auto-save
│       └── DELETE /api/projects/:id   → delete project
│
└── Socket.io
└── Rooms per projectId
├── file-change  → broadcast edits
├── package-change → broadcast installs
└── user-count  → presence tracking

### MongoDB Schema

```javascript
Project {
  name: String,
  description: String,
  files: [{ name, content, language }],  // stored as array in document
  packages: [String],                     // ["lodash", "dayjs"]
  activeFile: String,                     // last open file
  createdAt: Date,
  updatedAt: Date
}
```

**Why files as array inside document?**  
Simpler reads — one DB query loads the entire project. Tradeoff: document grows with large files, but for a code sandbox with small files this is the right call.

---

## 🤖 AI Usage Strategy

This project was built using Claude as a primary development accelerator. Here's how AI was used at each phase:

### Where AI accelerated delivery

| Phase | AI Contribution |
|---|---|
| Architecture | Selected Sandpack over building a custom WebContainer (saved days of work) |
| Boilerplate | Generated Express server, Mongoose models, and API routes from spec |
| Debugging | Identified the `pre("save")` hook bug on subdocuments instantly |
| CORS issues | Diagnosed trailing slash mismatch in production |
| React patterns | Suggested `cancelled` flag pattern for async useEffect cleanup |

### Where I reasoned myself

| Decision | My Reasoning |
|---|---|
| Sandpack `key` prop pattern | Understood that remounting Sandpack is the only clean way to update files/packages without editor state conflicts |
| Split auto-save endpoints | Chose `PATCH /files` for frequent saves vs `PUT` for full updates — deliberate performance decision |
| Socket room isolation | Designed per-project rooms so 100 users on different projects never interfere |
| `initialFiles` vs live `files` | Understood that passing live React state as Sandpack `files` prop caused editor resets on every keystroke |


## ⚖️ Technical Trade-offs

### Sandpack vs Custom WebContainer
**Chose Sandpack** — CodeSandbox's open source in-browser bundler.  
✅ Works immediately, supports npm packages, no server-side execution needed.  
❌ Limited to client-side JS/HTML/CSS. Cannot run Node.js, Python, or server-side code.

### MongoDB Document Model vs Relational
**Chose document model** — files stored as array inside project document.  
✅ Single query loads entire project. Simple to implement.  
❌ Not ideal for projects with hundreds of large files (document size limit: 16MB).

### Free Tier Deployment
**Render free tier** spins down after 15 minutes of inactivity.  
✅ Zero cost for demo/evaluation purposes.  
❌ First request after sleep takes ~30 seconds (cold start).

### In-Memory Socket Presence
User count tracked in server memory (`projectUsers` Map).  
✅ No DB queries needed for presence.  
❌ Resets on server restart. Not suitable for multi-server horizontal scaling.

---

## ⚠️ Known Limitations

1. **No Node.js execution** — Sandpack runs only client-side code (HTML/CSS/JS). Server-side frameworks like Express cannot be previewed.

2. **Cold starts on Render** — Free tier backend sleeps after inactivity. First load may take 20-30 seconds.

3. **No authentication** — Projects are public by URL. Anyone with the project ID can view and edit.

4. **No version history** — Auto-save overwrites previous state. No undo history across sessions.

5. **File size limit** — MongoDB document limit is 16MB. Very large files could hit this ceiling.

6. **Single server Socket.io** — Real-time sync works only when all users hit the same server instance. Horizontal scaling would require Redis adapter.

---

## 🚀 Running Locally

### Prerequisites
- Node.js 18+
- MongoDB Atlas account

### Setup

```bash
# Clone the repo
git clone https://github.com/YOURUSERNAME/banao-sandbox.git
cd banao-sandbox

# Backend
cd backend
cp .env.example .env   # add your MONGODB_URI
npm install
npm run dev

# Frontend (new terminal)
cd frontend
cp .env.example .env   # add VITE_BACKEND_URL=http://localhost:5000
npm install
npm run dev
```

Open `http://localhost:5173`

---

## 📁 Project Structure
banao-sandbox/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── HomePage.jsx      # Project list + create
│   │   │   └── SandboxPage.jsx   # Main IDE interface
│   │   ├── services/
│   │   │   ├── api.js            # Axios API calls
│   │   │   └── socket.js         # Socket.io client
│   │   ├── App.jsx               # Router
│   │   └── index.css             # Global styles
│   └── vite.config.js
│
└── backend/
├── models/
│   └── Project.js            # Mongoose schema
├── routes/
│   └── projectRoutes.js      # REST endpoints
└── server.js                 # Express + Socket.io

---

## 👤 Author

Built by Mehul as part of a MERN stack developer assessment.  
AI tools used: Claude (Anthropic) for architecture, code generation, and debugging.

Now push this to GitHub:
bashcd banao-sandbox
git add README.md
git commit -m "Add README with architecture and AI usage docs"
git push
