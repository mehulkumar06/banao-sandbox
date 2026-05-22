import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAllProjects, createProject, deleteProject } from "../services/api";

function HomePage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [error, setError] = useState("");

  // ─── Load all projects on mount ──────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const res = await getAllProjects();
        if (!cancelled) setProjects(res.data.projects);
      } catch {
        if (!cancelled) setError("Failed to load projects. Is the backend running?");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  

  // ─── Create new project ──────────────────────────────────────────
  const handleCreate = async () => {
    if (!newProjectName.trim()) return;
    try {
      setCreating(true);
      const res = await createProject({
        name: newProjectName.trim(),
        description: newProjectDesc.trim(),
      });
      const project = res.data.project;
      navigate(`/project/${project._id}`);
    } catch {
      setError("Failed to create project.");
      setCreating(false);
    }
  };

  // ─── Delete project ──────────────────────────────────────────────
  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this project? This cannot be undone.")) return;
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p._id !== id));
    } catch {
      setError("Failed to delete project.");
    }
  };

  // ─── Format date ─────────────────────────────────────────────────
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.logo}>⚡ Banao Sandbox</h1>
          <p style={styles.tagline}>Browser-based coding environment</p>
        </div>
        <button style={styles.newBtn} onClick={() => setShowModal(true)}>
          + New Project
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={styles.error}>
          {error}
          <button onClick={() => setError("")} style={styles.closeErr}>
            ✕
          </button>
        </div>
      )}

      {/* Project list */}
      <div style={styles.content}>
        {loading ? (
          <div style={styles.center}>
            <p style={styles.muted}>Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div style={styles.empty}>
            <p style={styles.emptyIcon}>🗂️</p>
            <p style={styles.emptyText}>No projects yet</p>
            <p style={styles.muted}>Create your first project to get started</p>
            <button style={styles.newBtn} onClick={() => setShowModal(true)}>
              + Create Project
            </button>
          </div>
        ) : (
          <div style={styles.grid}>
            {projects.map((project) => (
              <div
                key={project._id}
                style={styles.card}
                onClick={() => navigate(`/project/${project._id}`)}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = "#007acc")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = "#3c3c3c")
                }
              >
                <div style={styles.cardHeader}>
                  <span style={styles.cardIcon}>📁</span>
                  <button
                    style={styles.deleteBtn}
                    onClick={(e) => handleDelete(e, project._id)}
                    title="Delete project"
                  >
                    🗑️
                  </button>
                </div>
                <h3 style={styles.cardTitle}>{project.name}</h3>
                {project.description && (
                  <p style={styles.cardDesc}>{project.description}</p>
                )}
                <div style={styles.cardMeta}>
                  {project.packages?.length > 0 && (
                    <span style={styles.badge}>
                      📦 {project.packages.length} package
                      {project.packages.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  <span style={styles.muted}>
                    {formatDate(project.updatedAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showModal && (
        <div style={styles.overlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>New Project</h2>

            <label style={styles.label}>Project Name *</label>
            <input
              style={styles.input}
              type="text"
              placeholder="My Awesome Project"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />

            <label style={styles.label}>Description (optional)</label>
            <input
              style={styles.input}
              type="text"
              placeholder="What are you building?"
              value={newProjectDesc}
              onChange={(e) => setNewProjectDesc(e.target.value)}
            />

            <div style={styles.modalActions}>
              <button
                style={styles.cancelBtn}
                onClick={() => {
                  setShowModal(false);
                  setNewProjectName("");
                  setNewProjectDesc("");
                }}
              >
                Cancel
              </button>
              <button
                style={{
                  ...styles.newBtn,
                  opacity: !newProjectName.trim() || creating ? 0.5 : 1,
                }}
                onClick={handleCreate}
                disabled={!newProjectName.trim() || creating}
              >
                {creating ? "Creating..." : "Create Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────
const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#1e1e1e",
    color: "#d4d4d4",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "24px 40px",
    borderBottom: "1px solid #3c3c3c",
    backgroundColor: "#252526",
  },
  logo: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: "4px",
  },
  tagline: {
    fontSize: "13px",
    color: "#858585",
  },
  newBtn: {
    backgroundColor: "#007acc",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  content: {
    padding: "40px",
  },
  center: {
    display: "flex",
    justifyContent: "center",
    paddingTop: "80px",
  },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingTop: "80px",
    gap: "12px",
  },
  emptyIcon: {
    fontSize: "48px",
  },
  emptyText: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#cccccc",
  },
  muted: {
    fontSize: "13px",
    color: "#858585",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "16px",
  },
  card: {
    backgroundColor: "#252526",
    border: "1px solid #3c3c3c",
    borderRadius: "8px",
    padding: "20px",
    cursor: "pointer",
    transition: "border-color 0.15s ease",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "12px",
  },
  cardIcon: {
    fontSize: "24px",
  },
  deleteBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
    opacity: 0.5,
    padding: "2px 6px",
    borderRadius: "4px",
  },
  cardTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: "6px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  cardDesc: {
    fontSize: "13px",
    color: "#858585",
    marginBottom: "12px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  cardMeta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "12px",
    paddingTop: "12px",
    borderTop: "1px solid #3c3c3c",
  },
  badge: {
    fontSize: "12px",
    backgroundColor: "#2d2d2d",
    color: "#858585",
    padding: "2px 8px",
    borderRadius: "4px",
  },
  error: {
    backgroundColor: "#5a1d1d",
    color: "#f48771",
    padding: "12px 40px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "14px",
  },
  closeErr: {
    background: "none",
    border: "none",
    color: "#f48771",
    cursor: "pointer",
    fontSize: "16px",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "#252526",
    border: "1px solid #3c3c3c",
    borderRadius: "10px",
    padding: "32px",
    width: "420px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  modalTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: "8px",
  },
  label: {
    fontSize: "13px",
    color: "#858585",
    marginBottom: "4px",
  },
  input: {
    backgroundColor: "#1e1e1e",
    border: "1px solid #3c3c3c",
    borderRadius: "6px",
    padding: "10px 14px",
    color: "#d4d4d4",
    fontSize: "14px",
    outline: "none",
    width: "100%",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "8px",
  },
  cancelBtn: {
    backgroundColor: "transparent",
    color: "#858585",
    border: "1px solid #3c3c3c",
    borderRadius: "6px",
    padding: "10px 20px",
    fontSize: "14px",
    cursor: "pointer",
  },
};

export default HomePage;