import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { projectAPI } from "../services/api";
import ProjectCard from "../components/ProjectCard";
import CreateProject from "./CreateProject";

function Projects({ onOpenCreateModal }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const statusFilter = searchParams.get("status") || "all";

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await projectAPI.getAll();
      setProjects(res.data.projects || []);
      setError("");
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError("Failed to load projects. Make sure the backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleStatusFilterChange = (status) => {
    if (status === "all") {
      searchParams.delete("status");
    } else {
      searchParams.set("status", status);
    }
    setSearchParams(searchParams);
  };

  const handleStatusChange = async (projectId, newStatus) => {
    try {
      await projectAPI.update(projectId, { status: newStatus });
      setProjects((prev) =>
        prev.map((p) => (p._id === projectId ? { ...p, status: newStatus } : p))
      );
    } catch (err) {
      console.error("Status update error:", err);
      alert("Failed to update status.");
    }
  };

  const handleDelete = async (projectId) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;

    try {
      await projectAPI.delete(projectId);
      setProjects((prev) => prev.filter((p) => p._id !== projectId));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete project.");
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesStatus =
      statusFilter === "all" || p.status === statusFilter;
    const matchesSearch =
      searchTerm.trim() === "" ||
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="section-title">Projects</h1>
          <p className="section-subtitle">
            Manage, organize, and monitor all active initiatives.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => (onOpenCreateModal ? onOpenCreateModal() : setIsModalOpen(true))}
        >
          <span>+</span> New Project
        </button>
      </div>

      <div className="filter-bar">
        <div className="search-input-wrapper">
          <input
            type="text"
            className="form-input"
            placeholder="🔍 Search projects by title or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-tabs">
          {["all", "planning", "in_progress", "completed", "cancelled"].map(
            (status) => (
              <button
                key={status}
                className={`filter-tab ${statusFilter === status ? "active" : ""}`}
                onClick={() => handleStatusFilterChange(status)}
              >
                {status.replace("_", " ").toUpperCase()}
              </button>
            )
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "64px 20px" }}>
          <span className="spinner" style={{ width: "36px", height: "36px" }}></span>
          <p style={{ marginTop: "16px", color: "var(--text-secondary)" }}>
            Loading projects...
          </p>
        </div>
      ) : error ? (
        <div className="alert alert-error" style={{ justifyContent: "center" }}>
          <span>{error}</span>
          <button
            className="btn btn-sm btn-secondary"
            onClick={fetchProjects}
            style={{ marginLeft: "12px" }}
          >
            Retry
          </button>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📂</div>
          <h3 className="empty-state-title">No projects found</h3>
          <p className="empty-state-text">
            {searchTerm || statusFilter !== "all"
              ? "No projects match your current filters. Try resetting your search or filter criteria."
              : "Get started by creating your first project to track progress with your team."}
          </p>
          <button
            className="btn btn-primary"
            onClick={() =>
              onOpenCreateModal ? onOpenCreateModal() : setIsModalOpen(true)
            }
          >
            + Create First Project
          </button>
        </div>
      ) : (
        <div className="projects-grid">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project._id}
              project={project}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {isModalOpen && (
        <CreateProject
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={(newProject) => {
            setProjects((prev) => [newProject, ...prev]);
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

export default Projects;
