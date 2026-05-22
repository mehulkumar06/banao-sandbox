import mongoose from "mongoose";

// ─── File Schema ─────────────────────────────────────────────────────
const FileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    default: "",
  },
  language: {
    type: String,
    default: "javascript",
  },
});

// ─── Project Schema ───────────────────────────────────────────────────
const ProjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      default: "Untitled Project",
    },
    files: {
      type: [FileSchema],
      default: [
        {
          name: "index.js",
          content: `// Welcome to Banao Sandbox!\nconsole.log("Hello, World!");`,
          language: "javascript",
        },
      ],
    },
    packages: {
      type: [String],
      default: [],
    },
    activeFile: {
      type: String,
      default: "index.js",
    },
    description: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true, // auto adds createdAt and updatedAt
  }
);



export default mongoose.model("Project", ProjectSchema);