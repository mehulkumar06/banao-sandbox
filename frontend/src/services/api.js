import axios from "axios";

const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Project API calls ────────────────────────────────────────────────

// List all projects
export const getAllProjects = () => api.get("/projects");

// Create new project
export const createProject = (data) => api.post("/projects", data);

// Load single project
export const getProject = (id) => api.get(`/projects/${id}`);

// Full save
export const saveProject = (id, data) => api.put(`/projects/${id}`, data);

// Auto-save files only
export const autoSaveFiles = (id, files, activeFile) =>
  api.patch(`/projects/${id}/files`, { files, activeFile });

// Delete project
export const deleteProject = (id) => api.delete(`/projects/${id}`);

export default api;