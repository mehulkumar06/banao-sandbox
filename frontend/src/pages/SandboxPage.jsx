import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  useSandpack,
} from "@codesandbox/sandpack-react";
import { getProject, autoSaveFiles, saveProject } from "../services/api";
import socket from "../services/socket";

// ─── Auto-save + Socket bridge ────────────────────────────────────────
function SandpackBridge({ projectId, activeFile }) {
  const { sandpack } = useSandpack();
  const saveTimer = useRef(null);
  const lastSaved = useRef(null);
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }

    const currentFiles = sandpack.files;
    const filesArray = Object.entries(currentFiles).map(([name, file]) => ({
      name: name.replace(/^\//, ""),
      content: file.code,
      language: getLanguage(name),
    }));

    const serialized = JSON.stringify(filesArray);
    if (serialized === lastSaved.current) return;
    lastSaved.current = serialized;

    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await autoSaveFiles(projectId, filesArray, activeFile);
        socket.emit("file-change", { projectId, files: filesArray, activeFile });
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    }, 2000);

    return () => clearTimeout(saveTimer.current);
  }, [sandpack.files, projectId, activeFile]);

  return null;
}

function getLanguage(filename) {
  const ext = filename.split(".").pop();
  const map = {
    js: "javascript", jsx: "javascript",
    ts: "typescript", tsx: "typescript",
    css: "css", html: "html", json: "json", md: "markdown",
  };
  return map[ext] || "javascript";
}

function dbFilesToSandpack(files) {
  const result = {};
  files.forEach((f) => {
    if (f.name === "package.json") return; // Sandpack manages this internally
    const key = f.name.startsWith("/") ? f.name : `/${f.name}`;
    result[key] = { code: f.content };
  });
  return result;
}

function sandpackFilesToDb(sandpackFiles) {
  return Object.entries(sandpackFiles).map(([name, file]) => ({
    name: name.replace(/^\//, ""),
    content: file.code,
    language: getLanguage(name),
  }));
}

function getFileIcon(filename) {
  const ext = filename.split(".").pop();
  const icons = {
    js: "🟨", jsx: "⚛️", ts: "🔷", tsx: "⚛️",
    css: "🎨", html: "🌐", json: "📋", md: "📝",
  };
  return icons[ext] || "📄";
}

// ─── Main Component ───────────────────────────────────────────────────
function SandboxPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFile, setActiveFile] = useState("index.js");
  const [initialFiles, setInitialFiles] = useState(null);
  const [fileKeys, setFileKeys] = useState([]);
  const [packages, setPackages] = useState([]);
  const [newPackage, setNewPackage] = useState("");
  const [userCount, setUserCount] = useState(1);
  const [saveStatus] = useState("saved");
  const [showPackagePanel, setShowPackagePanel] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [showNewFile, setShowNewFile] = useState(false);
  const [sandpackKey, setSandpackKey] = useState(0);

  // ─── Load project ONCE ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const res = await getProject(id);
        const proj = res.data.project;
        const files = dbFilesToSandpack(proj.files);

        if (!cancelled) {
          setProject(proj);
          setActiveFile(proj.activeFile || "index.js");
          setPackages(proj.packages || []);
          setInitialFiles(files);
          setFileKeys(Object.keys(files));
        }
      } catch {
        if (!cancelled) setError("Failed to load project.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [id]);

  // ─── Socket setup ────────────────────────────────────────────────
  useEffect(() => {
    if (!socket.connected) socket.connect();

    socket.emit("join-project", id);

    socket.on("package-update", ({ packages: pkgs }) => setPackages(pkgs));
    socket.on("user-count", ({ count }) => setUserCount(count));

    return () => {
      socket.off("package-update");
      socket.off("user-count");
      socket.disconnect();
    };
  }, [id]);

  // ─── Add new file ────────────────────────────────────────────────
  const handleAddFile = async () => {
    if (!newFileName.trim()) return;
    const name = newFileName.trim();
    const key = name.startsWith("/") ? name : `/${name}`;

    setFileKeys((prev) => [...prev, key]);
    setActiveFile(name);
    setShowNewFile(false);
    setNewFileName("");

    setInitialFiles((prev) => ({
      ...prev,
      [key]: { code: `// ${name}\n` },
    }));
    setSandpackKey((k) => k + 1);

    try {
      const allFiles = sandpackFilesToDb({ ...initialFiles, [key]: { code: `// ${name}\n` } });
      await autoSaveFiles(id, allFiles, name);
    } catch {
      setError("Failed to save new file.");
    }
  };

  // ─── Delete file ─────────────────────────────────────────────────
  const handleDeleteFile = async (filename) => {
    if (fileKeys.length <= 1) {
      setError("Cannot delete the last file.");
      return;
    }
    if (!window.confirm(`Delete ${filename}?`)) return;

    const key = filename.startsWith("/") ? filename : `/${filename}`;
    const updatedFiles = { ...initialFiles };
    delete updatedFiles[key];

    const remaining = Object.keys(updatedFiles)[0].replace(/^\//, "");
    setInitialFiles(updatedFiles);
    setFileKeys(Object.keys(updatedFiles));
    setActiveFile(remaining);
    setSandpackKey((k) => k + 1);

    try {
      await autoSaveFiles(id, sandpackFilesToDb(updatedFiles), remaining);
    } catch {
      setError("Failed to delete file.");
    }
  };

  // ─── Add package ─────────────────────────────────────────────────
  const handleAddPackage = async () => {
    if (!newPackage.trim()) return;
    const pkg = newPackage.trim().toLowerCase();
    if (packages.includes(pkg)) { setNewPackage(""); return; }

    const updated = [...packages, pkg];
    setPackages(updated);
    setNewPackage("");
    setSandpackKey((k) => k + 1);

    try {
      await saveProject(id, { packages: updated });
      socket.emit("package-change", { projectId: id, packages: updated });
    } catch {
      setError("Failed to save package.");
    }
  };

  const handleRemovePackage = async (pkg) => {
    const updated = packages.filter((p) => p !== pkg);
    setPackages(updated);
    setSandpackKey((k) => k + 1);

    try {
      await saveProject(id, { packages: updated });
      socket.emit("package-change", { projectId: id, packages: updated });
    } catch {
      setError("Failed to remove package.");
    }
  };

  const sandpackDependencies = packages.reduce((acc, pkg) => {
    acc[pkg] = "latest";
    return acc;
  }, {});

  // ─── Build folder tree for sidebar ───────────────────────────────
  const renderFileTree = () => {
    const folders = {};
    const rootFiles = [];

    fileKeys.forEach((filepath) => {
      const clean = filepath.replace(/^\//, "");
      const parts = clean.split("/");
      if (parts.length > 1) {
        const folder = parts[0];
        if (!folders[folder]) folders[folder] = [];
        folders[folder].push({
          filepath,
          filename: clean,
          basename: parts.slice(1).join("/"),
        });
      } else {
        rootFiles.push({ filepath, filename: clean });
      }
    });

    return (
      <>
        {/* Folders first */}
        {Object.entries(folders).map(([folder, files]) => (
          <div key={folder}>
            <div style={styles.folderItem}>
              <span style={styles.fileIcon}>📂</span>
              <span style={styles.fileName}>{folder}/</span>
            </div>
            {files.map(({ filepath, filename, basename }) => {
              const isActive = activeFile === filename;
              return (
                <div
                  key={filepath}
                  className="file-item"
                  style={{
                    ...styles.fileItem,
                    paddingLeft: "28px",
                    backgroundColor: isActive ? "#37373d" : "transparent",
                    color: isActive ? "#ffffff" : "#cccccc",
                  }}
                  onClick={() => setActiveFile(filename)}
                >
                  <span style={styles.fileIcon}>{getFileIcon(basename)}</span>
                  <span style={styles.fileName}>{basename}</span>
                  <button
                    className="delete-file-btn"
                    style={styles.deleteFileBtn}
                    onClick={(e) => { e.stopPropagation(); handleDeleteFile(filename); }}
                    title="Delete file"
                  >✕</button>
                </div>
              );
            })}
          </div>
        ))}

        {/* Root files */}
        {rootFiles.map(({ filepath, filename }) => {
          const isActive = activeFile === filename;
          return (
            <div
              key={filepath}
              className="file-item"
              style={{
                ...styles.fileItem,
                backgroundColor: isActive ? "#37373d" : "transparent",
                color: isActive ? "#ffffff" : "#cccccc",
              }}
              onClick={() => setActiveFile(filename)}
            >
              <span style={styles.fileIcon}>{getFileIcon(filename)}</span>
              <span style={styles.fileName}>{filename}</span>
              <button
                className="delete-file-btn"
                style={styles.deleteFileBtn}
                onClick={(e) => { e.stopPropagation(); handleDeleteFile(filename); }}
                title="Delete file"
              >✕</button>
            </div>
          );
        })}
      </>
    );
  };

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <p style={{ color: "#d4d4d4" }}>Loading project...</p>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div style={styles.loadingScreen}>
        <p style={{ color: "#f48771" }}>{error}</p>
        <button style={styles.backBtn} onClick={() => navigate("/")}>← Back</button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Top Bar */}
      <div style={styles.topBar}>
        <div style={styles.topLeft}>
          <button style={styles.backBtn} onClick={() => navigate("/")}>← Home</button>
          <span style={styles.projectName}>{project?.name}</span>
        </div>
        <div style={styles.topRight}>
          {userCount > 1 && <span style={styles.userCount}>👥 {userCount} active</span>}
          <span style={{ ...styles.saveStatus, color: saveStatus === "saving" ? "#cca700" : "#4ec9b0" }}>
            {saveStatus === "saving" ? "⏳ Saving..." : "✓ Saved"}
          </span>
          <button style={styles.packageBtn} onClick={() => setShowPackagePanel(!showPackagePanel)}>
            📦 Packages {packages.length > 0 && `(${packages.length})`}
          </button>
        </div>
      </div>

      {/* Error bar */}
      {error && (
        <div style={styles.errorBar}>
          {error}
          <button onClick={() => setError("")} style={styles.closeErr}>✕</button>
        </div>
      )}

      {/* Package Panel */}
      {showPackagePanel && (
        <div style={styles.packagePanel}>
          <p style={styles.packageTitle}>📦 npm Packages</p>
          <div style={styles.packageInput}>
            <input
              style={styles.pkgInput}
              type="text"
              placeholder="e.g. lodash, dayjs, uuid"
              value={newPackage}
              onChange={(e) => setNewPackage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddPackage()}
            />
            <button style={styles.addPkgBtn} onClick={handleAddPackage}>Add</button>
          </div>
          <div style={styles.packageList}>
            {packages.length === 0 ? (
              <p style={styles.muted}>No packages added yet</p>
            ) : (
              packages.map((pkg) => (
                <div key={pkg} style={styles.packageTag}>
                  <span>{pkg}</span>
                  <button style={styles.removePkg} onClick={() => handleRemovePackage(pkg)}>✕</button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* IDE */}
      <div style={styles.ideContainer}>
        {initialFiles && (
          <SandpackProvider
            key={sandpackKey}
            files={initialFiles}
            theme="dark"
            template="static"
            customSetup={{ dependencies: sandpackDependencies }}
            options={{
              activeFile: activeFile.startsWith("/") ? activeFile : `/${activeFile}`,
              visibleFiles: fileKeys,
            }}
          >
            <SandpackBridge
              projectId={id}
              activeFile={activeFile}
            />

            <div style={styles.ideLayout}>
              {/* Sidebar */}
              <div style={styles.sidebar}>
                <div style={styles.sidebarHeader}>
                  <span style={styles.sidebarTitle}>FILES</span>
                  <button
                    style={styles.addFileBtn}
                    onClick={() => setShowNewFile(!showNewFile)}
                    title="New file"
                  >+</button>
                </div>

                {showNewFile && (
                  <div style={styles.newFileInput}>
                    <input
                      style={styles.fileInput}
                      type="text"
                      placeholder="file.js or src/file.js"
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddFile();
                        if (e.key === "Escape") setShowNewFile(false);
                      }}
                      autoFocus
                    />
                  </div>
                )}

                {/* File tree with folder support */}
                {renderFileTree()}
              </div>

              {/* Editor + Preview */}
              <div style={styles.editorArea}>
                <SandpackLayout style={{ height: "100%", border: "none" }}>
                  <SandpackCodeEditor
                    style={{ height: "100%" }}
                    showTabs={true}
                    showLineNumbers={true}
                    showInlineErrors={true}
                    wrapContent={false}
                    closableTabs={false}
                    readOnly={false}
                    initMode="immediate"
                  />
                  <SandpackPreview
                    style={{ height: "100%" }}
                    showNavigator={true}
                    showRefreshButton={true}
                  />
                </SandpackLayout>
              </div>
            </div>
          </SandpackProvider>
        )}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────
const styles = {
  container: { height: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#1e1e1e", overflow: "hidden" },
  loadingScreen: { height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#1e1e1e", gap: "16px" },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px", backgroundColor: "#323233", borderBottom: "1px solid #3c3c3c", height: "44px", flexShrink: 0 },
  topLeft: { display: "flex", alignItems: "center", gap: "12px" },
  topRight: { display: "flex", alignItems: "center", gap: "16px" },
  backBtn: { backgroundColor: "transparent", color: "#858585", border: "1px solid #3c3c3c", borderRadius: "4px", padding: "4px 10px", fontSize: "12px", cursor: "pointer" },
  projectName: { fontSize: "14px", fontWeight: "600", color: "#ffffff" },
  userCount: { fontSize: "12px", color: "#4ec9b0" },
  saveStatus: { fontSize: "12px" },
  packageBtn: { backgroundColor: "#2d2d2d", color: "#d4d4d4", border: "1px solid #3c3c3c", borderRadius: "4px", padding: "4px 10px", fontSize: "12px", cursor: "pointer" },
  errorBar: { backgroundColor: "#5a1d1d", color: "#f48771", padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", flexShrink: 0 },
  closeErr: { background: "none", border: "none", color: "#f48771", cursor: "pointer" },
  packagePanel: { backgroundColor: "#252526", borderBottom: "1px solid #3c3c3c", padding: "12px 16px", flexShrink: 0 },
  packageTitle: { fontSize: "12px", fontWeight: "600", color: "#858585", marginBottom: "8px", textTransform: "uppercase" },
  packageInput: { display: "flex", gap: "8px", marginBottom: "8px" },
  pkgInput: { flex: 1, backgroundColor: "#1e1e1e", border: "1px solid #3c3c3c", borderRadius: "4px", padding: "6px 10px", color: "#d4d4d4", fontSize: "13px", outline: "none" },
  addPkgBtn: { backgroundColor: "#007acc", color: "#ffffff", border: "none", borderRadius: "4px", padding: "6px 14px", fontSize: "13px", cursor: "pointer" },
  packageList: { display: "flex", flexWrap: "wrap", gap: "6px" },
  packageTag: { display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#2d2d2d", border: "1px solid #3c3c3c", borderRadius: "4px", padding: "2px 8px", fontSize: "12px", color: "#d4d4d4" },
  removePkg: { background: "none", border: "none", color: "#858585", cursor: "pointer", fontSize: "11px", padding: "0" },
  ideContainer: { flex: 1, overflow: "hidden", display: "flex" },
  ideLayout: { display: "flex", height: "100%", width: "100%" },
  sidebar: { width: "220px", backgroundColor: "#252526", borderRight: "1px solid #3c3c3c", flexShrink: 0, overflowY: "auto", display: "flex", flexDirection: "column" },
  sidebarHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderBottom: "1px solid #3c3c3c" },
  sidebarTitle: { fontSize: "11px", fontWeight: "700", color: "#858585", letterSpacing: "1px" },
  addFileBtn: { background: "none", border: "none", color: "#858585", cursor: "pointer", fontSize: "18px", lineHeight: 1, padding: "0 4px" },
  newFileInput: { padding: "6px 8px", borderBottom: "1px solid #3c3c3c" },
  fileInput: { width: "100%", backgroundColor: "#3c3c3c", border: "1px solid #007acc", borderRadius: "3px", padding: "4px 8px", color: "#d4d4d4", fontSize: "13px", outline: "none" },
  folderItem: { display: "flex", alignItems: "center", padding: "5px 12px", fontSize: "12px", gap: "6px", color: "#858585", fontWeight: "700", letterSpacing: "0.5px", textTransform: "uppercase", userSelect: "none" },
  fileItem: { display: "flex", alignItems: "center", padding: "6px 12px", cursor: "pointer", fontSize: "13px", gap: "6px", borderRadius: "3px", margin: "1px 4px" },
  fileIcon: { fontSize: "14px", flexShrink: 0 },
  fileName: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  deleteFileBtn: { background: "none", border: "none", color: "#858585", cursor: "pointer", fontSize: "11px", opacity: 0, padding: "2px" },
  editorArea: { flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" },
  muted: { fontSize: "12px", color: "#858585" },
};

export default SandboxPage;