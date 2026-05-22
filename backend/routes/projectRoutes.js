import { Router } from "express";
import Project from "../models/Project.js";

const router = Router();

// ─── GET /api/projects ────────────────────────────────────────────────
// List all projects (for home page)
router.get("/", async (req, res) => {
  try {
    const projects = await Project.find()
      .select("_id name description packages createdAt updatedAt")
      .sort({ updatedAt: -1 });

    res.json({ success: true, projects });
  // } catch (err) {
  //   res.status(500).json({ success: false, error: err.message });
  // }
  } catch (err) {
    console.error("CREATE PROJECT ERROR:", err);
    res.status(500).json({ success: false, error: err.message, stack: err.stack });
  }
});

// ─── POST /api/projects ───────────────────────────────────────────────
// Create a new project
router.post("/", async (req, res) => {
  try {
    const { name, description } = req.body;

    const project = new Project({
      name: name || "Untitled Project",
      description: description || "",
      files: [
        {
          name: "index.js",
          content: `// Welcome to ${name || "Untitled Project"}!\nconsole.log("Hello, World!");`,
          language: "javascript",
        },
        {
          name: "index.html",
          content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${name || "Untitled Project"}</title>
  </head>
  <body>
    <div id="root"></div>
    <script src="index.js"></script>
  </body>
</html>`,
          language: "html",
        },
        {
          name: "styles.css",
          content: `body {\n  font-family: sans-serif;\n  margin: 0;\n  padding: 20px;\n}`,
          language: "css",
        },
      ],
      packages: [],
      activeFile: "index.js",
    });

    await project.save();
    res.status(201).json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/projects/:id ────────────────────────────────────────────
// Load a single project by ID
router.get("/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, error: "Project not found" });
    }

    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PUT /api/projects/:id ────────────────────────────────────────────
// Full project save (name, files, packages, activeFile)
router.put("/:id", async (req, res) => {
  try {
    const { name, files, packages, activeFile, description } = req.body;

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      {
        ...(name && { name }),
        ...(files && { files }),
        ...(packages && { packages }),
        ...(activeFile && { activeFile }),
        ...(description !== undefined && { description }),
      },
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({ success: false, error: "Project not found" });
    }

    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PATCH /api/projects/:id/files ───────────────────────────────────
// Auto-save just the files array (called every 2 seconds from frontend)
router.patch("/:id/files", async (req, res) => {
  try {
    const { files, activeFile } = req.body;

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      {
        ...(files && { files }),
        ...(activeFile && { activeFile }),
      },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ success: false, error: "Project not found" });
    }

    res.json({ success: true, updatedAt: project.updatedAt });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── DELETE /api/projects/:id ─────────────────────────────────────────
// Delete a project
router.delete("/:id", async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, error: "Project not found" });
    }

    res.json({ success: true, message: "Project deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;