import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { projectAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import ProjectCard from "../components/ProjectCard";

function Dashboard({ onOpenCreateModal }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await projectAPI.getAll();
      setProjects(res.data.projects || []);
      setError("");
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("Unable to connect to the backend server. Please verify the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const counts = {
    total: projects.length,
    planning: projects.filter((p) => p.status === "planning").length,
    in_progress: projects.filter((p) => p.status === "in_progress").length,
    completed: projects.filter((p) => p.status === "completed").length,
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

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="section-title">
            Welcome back{user ? `, ${user.name}` : ""} 👋
          </h1>
          <p className="section-subtitle">
            Here is an overview of your team's project pipeline and activity.
          </p>
        </div>

        {user?.role === "admin" && (
          <button className="btn btn-primary" onClick={onOpenCreateModal}>
            <span>+</span> New Project
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
          <button
            className="btn btn-sm btn-secondary"
            onClick={fetchProjects}
            style={{ marginLeft: "12px" }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="stats-grid">
        <div className="glass-card stat-card">
          <div
            className="stat-icon-wrapper"
            style={{ background: "rgba(99, 102, 241, 0.15)", color: "#818cf8" }}
          >
            📁
          </div>
          <div>
            <div className="stat-value">{counts.total}</div>
            <div className="stat-label">Total Projects</div>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div
            className="stat-icon-wrapper"
            style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa" }}
          >
            🚀
          </div>
          <div>
            <div className="stat-value">{counts.in_progress}</div>
            <div className="stat-label">In Progress</div>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div
            className="stat-icon-wrapper"
            style={{ background: "rgba(234, 179, 8, 0.15)", color: "#facc15" }}
          >
            📋
          </div>
          <div>
            <div className="stat-value">{counts.planning}</div>
            <div className="stat-label">Planning Phase</div>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div
            className="stat-icon-wrapper"
            style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}
          >
            ✅
          </div>
          <div>
            <div className="stat-value">{counts.completed}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>
      </div>

      {/* Recent Projects */}
      <div style={{ marginTop: "32px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px",
          }}
        >
          <h2>Recent Projects</h2>
          <Link
            to="/projects"
            style={{
              color: "#818cf8",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            View all ({projects.length}) →
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <span className="spinner"></span>
            <p style={{ marginTop: "12px", color: "var(--text-secondary)" }}>
              Loading dashboard data...
            </p>
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✨</div>
            <h3 className="empty-state-title">No projects yet</h3>
            <p className="empty-state-text">
              {user?.role === "admin"
                ? "Create your very first project to start tracking your workflow, team tasks, and deadlines."
                : "No projects have been assigned to you yet. An admin will assign you to active projects."}
            </p>
            {user?.role === "admin" && (
              <button className="btn btn-primary" onClick={onOpenCreateModal}>
                + Create First Project
              </button>
            )}
          </div>
        ) : (
          <div className="projects-grid">
            {projects.slice(0, 6).map((project) => (
              <ProjectCard
                key={project._id}
                project={project}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;